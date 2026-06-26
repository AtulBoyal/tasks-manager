import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from 'react-hot-toast';
import FocusMode from './pages/FocusMode';

import { generateAutoTags } from './utils/tagEngine';
import { formatDate, getFactorClass } from './utils/formatters';

import { useAuth } from './hooks/useAuth';
import { useTasks } from './hooks/useTasks';
import { useTaskFilters } from './hooks/useTaskFilters';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useVaultLock } from './hooks/useVaultLock';
import { useRealtimeTasks } from './hooks/useRealtimeTasks';
import { useRecurringTasks } from './hooks/useRecurringTasks';
import { useBiometrics } from './hooks/useBiometrics';
import { useTaskActions } from './hooks/useTaskActions';
import { useTaskForm } from './hooks/useTaskForm';
import { useProfile } from './hooks/useProfile';
// import { taskService } from './services/taskService';
import ResetPinModal from './components/ResetPinModal';

import ProtectedRoute from './routes/ProtectedRoute';
import { TaskProvider } from './context/TaskContext';
import toast from 'react-hot-toast';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const AnalyticsPage = lazy(() => import('./pages/Analytics'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Archive = lazy(() => import('./pages/Archive'));

function App() {  
  const { session } = useAuth();
  const {
      profile,
      updateProfile,
      loading
  } = useProfile(session);

  const {isLocallyUnlocked, enteredPassword, setEnteredPassword, isLoading, handleUnlock} = 
  useVaultLock(session);

  const {tasks, setTasks, fetchTasks, addTask, editTask, removeTask, contestExists} = useTasks(session?.user?.id, isLocallyUnlocked);

  const {taskName, setTaskName, factor, setFactor, lastDate,  setLastDate, startDate, setStartDate, taskLinks, setTaskLinks, taskTags, setTaskTags, currentTagInput, setCurrentTagInput, subtasks, setSubtasks, currentSubtaskInput, setCurrentSubtaskInput, recurrence, setRecurrence, editingTaskId, setEditingTaskId, resetForm} = useTaskForm();

  const {handleDelete, handleComplete, handleUndoComplete, handleInlineUpdate, handleToggleSubtask, handleQuickAdd, handleArchive, handleRestore} = 
  useTaskActions({tasks, setTasks, addTask, editTask, removeTask, session});

  const {hasBiometricSetup, setupBiometrics, loginWithBiometrics} = 
  useBiometrics({handleUnlock, setEnteredPassword});

  const [showResetPinModal, setShowResetPinModal] = useState(false);


  useEffect(() => {if (isLocallyUnlocked && session?.user?.id) {fetchTasks();}}, [isLocallyUnlocked, session, fetchTasks]);
  

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    handleUnlock(enteredPassword);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [filterFactor, setFilterFactor] = useState('All');
  const [filterDate, setFilterDate] = useState(null); 
  const [filterStatus, setFilterStatus] = useState('Active'); 
  const [showCompleted, setShowCompleted] = useState(false);  

  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const {filteredActiveTasks, filteredCompletedTasks} = 
  useTaskFilters({tasks, filterStatus, filterFactor, filterDate, searchQuery});
  useRealtimeTasks({isLocallyUnlocked, setTasks});
  useRecurringTasks({tasks, setTasks, editTask});

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }
  }, []);

  useKeyboardShortcuts({isLocallyUnlocked, setIsQuickAddOpen});

  const todayDate = new Date().toISOString().split('T')[0];

  const handleForgotPin = () => {
    setShowResetPinModal(true);
  };

  const handleResetPin = (newPin) => {
    if (!session?.user?.id) return;

    const pinKey = `app_pin_${session.user.id}`;

    localStorage.setItem(pinKey, newPin);

    setEnteredPassword('');
    setShowResetPinModal(false);

    toast.success("Vault PIN updated successfully.");
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (!isLocallyUnlocked || tasks.length === 0) return;

    const fetchContests = async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const lastFetch = localStorage.getItem('last_cf_fetch');

      if (lastFetch !== todayStr) {
        try {
          const response = await fetch('https://codeforces.com/api/contest.list?gym=false');
          const data = await response.json();

          if (data.status === 'OK') {
            const upcoming = data.result.filter(c => c.phase === 'BEFORE');

            for (const [index, contest] of upcoming.entries()) {
              const contestName = `🏆 CF: ${contest.name}`;
              const alreadyExists = await contestExists(contest.id);

              if (alreadyExists)
                  continue;

              if (!alreadyExists) {
                const contestDateObj = new Date(contest.startTimeSeconds * 1000);
                const contestDateStr = contestDateObj.toISOString().split('T')[0];
                const timeString = contestDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                const newTask = {
                  id: Date.now() + index,
                  user_id: session.user.id,
                  cf_contest_id: contest.id,
                  name: contestName,
                  factor: 'Urgent',
                  last_date: contestDateStr,
                  completed: false,
                  archived: false,
                  recurrence: 'none',
                  links: [
                    {
                      title: 'Registration / Contest Page',
                      url: `https://codeforces.com/contests/${contest.id}`
                    }
                  ],
                  tags: ['codeforces', 'contest'],
                  subtasks: [
                    {
                      id: Date.now() + 100 + index,
                      title: `Register before ${timeString}`,
                      completed: false
                    },
                    {
                      id: Date.now() + 200 + index,
                      title: `Compete at ${timeString}`,
                      completed: false
                    }
                  ]
                };
                
                await addTask(newTask);
              }
            }
            
            localStorage.setItem('last_cf_fetch', todayStr);
          }
        } catch (error) {
          console.error("Failed to fetch Codeforces contests", error);
          toast.error("Failed to fetch Codeforces contests");
        }
      }
    };

    fetchContests();
  }, [isLocallyUnlocked, tasks.length, addTask, contestExists, session?.user?.id]);

  const handleAddTag = (e) => {
    e.preventDefault();
    const cleanTag = currentTagInput.trim().toLowerCase();
    if (cleanTag && !taskTags.includes(cleanTag)) setTaskTags([...taskTags, cleanTag]);
    setCurrentTagInput('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const cleanTaskName = taskName.trim();
    if (!cleanTaskName) {
      alert("Please enter a task name.");
      return; 
    }

    const smartTags = generateAutoTags(cleanTaskName, taskTags);

    if (editingTaskId) {
      try {
        await editTask(editingTaskId, {
          name: cleanTaskName,
          factor,
          last_date: lastDate || null,
          start_date: startDate || null,
          links: taskLinks,
          tags: smartTags,
          subtasks,
          recurrence
        });
        toast.success('Task updated');

      } catch (error) {
        console.error("Failed to update task:", error);
      }

      resetForm();

      return;
    } else {
      const newTask = {
        id: Date.now(),
        user_id: session.user.id,
        name: cleanTaskName,
        factor: factor || 'Normal',
        last_date: lastDate || null,
        start_date: startDate || null,
        completed: false,
        completion_date: null,
        recurrence: recurrence || 'none',
        links: Array.isArray(taskLinks) ? taskLinks : [],
        tags: Array.isArray(smartTags) ? smartTags : [],
        subtasks: Array.isArray(subtasks) ? subtasks : []
      };

      await addTask(newTask);
      toast.success('Task created successfully');

      resetForm();

      return;
    }
  };

  const handleEdit = (task) => {
    setEditingTaskId(task.id);
    setTaskName(task.name || '');
    setFactor(task.factor || 'Normal'); 
    setLastDate(task.last_date || ''); 
    setStartDate(task.start_date || '');
    setTaskLinks(task.links || []);
    setTaskTags(task.tags || []);
    setSubtasks(task.subtasks || []); 
    setRecurrence(task.recurrence || 'none');
  };

  return (
    <>
      <Toaster position="top-right" />
      {/* toast.success('Task completed!');
      toast.error(error.message); */}
    <div className="min-h-screen font-sans m-0 p-0 bg-[linear-gradient(135deg,#f7fafc_24%,#ffe5c2_100%)] dark:bg-none dark:bg-slate-900 transition-colors duration-300 pb-[40px]">
      <ProtectedRoute
        isLocallyUnlocked={isLocallyUnlocked}
        session={session}
        enteredPassword={enteredPassword}
        setEnteredPassword={setEnteredPassword}
        handlePasswordSubmit={handlePasswordSubmit}
        isLoading={isLoading}
        hasBiometricSetup={hasBiometricSetup}
        loginWithBiometrics={loginWithBiometrics}
        setupBiometrics={setupBiometrics}
        handleForgotPin={handleForgotPin}
      >
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center text-2xl font-bold text-orange-500">
              Loading...
            </div>
          }
        >
          <Routes>
            <Route
              path="/"
              element={
                <TaskProvider
                  value={{
                    tasks,
                    setTasks,
                    filteredActiveTasks,
                    filteredCompletedTasks,
                    handleDelete,
                    handleComplete,
                    handleUndoComplete,
                    handleArchive,
                    handleInlineUpdate,
                    handleToggleSubtask,
                    handleEdit,
                    formatDate,
                    getFactorClass,
                    todayDate
                  }}
                >
                  <Dashboard
                    isDarkMode={isDarkMode}
                    setIsDarkMode={setIsDarkMode}
                    tasks={tasks}
                    taskFormProps={{
                      taskName,
                      setTaskName,
                      factor,
                      setFactor,
                      lastDate,
                      setLastDate,
                      todayDate,
                      currentTagInput,
                      setCurrentTagInput,
                      handleAddTag,
                      taskTags,
                      setTaskTags,
                      taskLinks,
                      setTaskLinks,
                      editingTaskId,
                      setEditingTaskId,
                      handleSubmit,
                      subtasks,
                      setSubtasks,
                      currentSubtaskInput,
                      setCurrentSubtaskInput,
                      recurrence,
                      setRecurrence,
                      startDate,
                      setStartDate
                    }}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    filterStatus={filterStatus}
                    setFilterStatus={setFilterStatus}
                    filterFactor={filterFactor}
                    setFilterFactor={setFilterFactor}
                    filterDate={filterDate}
                    setFilterDate={setFilterDate}
                    filteredActiveTasks={filteredActiveTasks}
                    filteredCompletedTasks={filteredCompletedTasks}
                    todayDate={todayDate}
                    formatDate={formatDate}
                    getFactorClass={getFactorClass}
                    handleInlineUpdate={handleInlineUpdate}
                    handleEdit={handleEdit}
                    handleDelete={handleDelete}
                    handleComplete={handleComplete}
                    handleUndoComplete={handleUndoComplete}
                    handleToggleSubtask={handleToggleSubtask}
                    handleArchive={handleArchive}
                    showCompleted={showCompleted}
                    setShowCompleted={setShowCompleted}
                    isQuickAddOpen={isQuickAddOpen}
                    setIsQuickAddOpen={setIsQuickAddOpen}
                    handleQuickAdd={(title) =>
                      handleQuickAdd({
                        newTitle: title,
                        recurrence,
                        taskLinks,
                        subtasks,
                        generateAutoTags
                      })
                    }
                  />
                </TaskProvider>
              }
            />

            <Route
              path="/settings"
              element={
                <Settings
                  session={session}
                  profile={profile}
                  updateProfile={updateProfile}
                  loading={loading}
                />
              }
            />

            <Route
              path="/analytics"
              element={
                <AnalyticsPage
                  tasks={tasks}
                  isDarkMode={isDarkMode}
                  setIsDarkMode={setIsDarkMode}
                />
              }
            />

            <Route
              path="/focus"
              element={
                <FocusMode
                  tasks={tasks}
                  isDarkMode={isDarkMode}
                  setIsDarkMode={setIsDarkMode}
                  handleComplete={handleComplete}
                />
              }
            />

            <Route
              path="/archive"
              element={
                <Archive
                  tasks={tasks}
                  isDarkMode={isDarkMode}
                  setIsDarkMode={setIsDarkMode}
                  formatDate={formatDate}
                  getFactorClass={getFactorClass}
                  handleDelete={handleDelete}
                  handleUndoComplete={handleUndoComplete}
                  handleToggleSubtask={handleToggleSubtask}
                  handleRestore={handleRestore}
                />
              }
            />

            <Route
              path="*"
              element={<NotFound />}
            />
          </Routes>
        </Suspense>
      </ProtectedRoute>
      <ResetPinModal
        isOpen={showResetPinModal}
        onClose={() => setShowResetPinModal(false)}
        onConfirmReset={handleResetPin}
      />
      <Analytics />
    </div>
    </>
  );
}

export default App;