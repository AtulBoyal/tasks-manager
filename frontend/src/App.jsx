// App.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { Analytics } from "@vercel/analytics/react";
import { apiStorage } from './supabaseStorage';
import LoginScreen from './components/LoginScreen';
import Header from './components/Header';
import TaskForm from './components/TaskForm';
import TaskTable from './components/TaskTable';
import FilterBar from './components/FilterBar';
import ConsistencyHeatmap from './components/ConsistencyHeatmap';
import QuickAddModal from './components/QuickAddModal';
import { supabase } from './supabaseClient';

// ============================================================================
// WEBAUTHN UTILITY FUNCTIONS (THE BUFFER CONVERSIONS)
// ============================================================================
const bufferToBase64URLString = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (let charCode of bytes) {
    str += String.fromCharCode(charCode);
  }
  const base64String = btoa(str);
  return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const base64URLStringToBuffer = (base64URLString) => {
  const base64 = base64URLString.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64.padEnd(base64.length + padLength, '=');
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
};

const generateRandomBuffer = (length = 32) => {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return array.buffer;
};
// ============================================================================

function App() {
  const [taskName, setTaskName] = useState('');
  const [factor, setFactor] = useState('Normal'); 
  const [lastDate, setLastDate] = useState('');
  const [tasks, setTasks] = useState([]);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskLinks, setTaskLinks] = useState([]);
  const [taskTags, setTaskTags] = useState([]);
  const [currentTagInput, setCurrentTagInput] = useState('');
  const [subtasks, setSubtasks] = useState([]);
  const [currentSubtaskInput, setCurrentSubtaskInput] = useState('');

  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordOk, setPasswordOk] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(() => localStorage.getItem('task_manager_unsaved') === 'true');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFactor, setFilterFactor] = useState('All');
  const [filterDate, setFilterDate] = useState(''); 
  const [filterStatus, setFilterStatus] = useState('Active'); 
  const [showCompleted, setShowCompleted] = useState(false);  

  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [hasBiometricSetup, setHasBiometricSetup] = useState(false);

  // --- QUICK ADD STATE & LISTENERS ---
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); // Prevents browser search bar from focusing
        if (passwordOk) {
          setIsQuickAddOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [passwordOk]);

  // The function that saves the quick task
  const handleQuickAdd = (newTitle) => {
    const newTask = {
      id: Date.now(),
      name: newTitle,
      factor: 'Normal', // Defaults
      last_date: todayDate, // Defaults to today
      completed: false,
      links: [],
      tags: [],
      subtasks: []
    };
    updateLocalTasks([...tasks, newTask]);
  };

  useEffect(() => {
    const credId = localStorage.getItem('biometric_credential_id');
    const savedPass = localStorage.getItem('biometric_password');
    if (credId && savedPass && window.PublicKeyCredential) {
      setHasBiometricSetup(true);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const setupBiometrics = async (passwordToSave) => {
    if (!window.PublicKeyCredential) {
      alert("Your device/browser does not support biometrics.");
      return;
    }
    try {
      const challenge = generateRandomBuffer();
      const userId = generateRandomBuffer(16);

      const publicKeyCredentialCreationOptions = {
        challenge,
        rp: { name: "Tasks Manager", id: window.location.hostname },
        user: { id: userId, name: "admin", displayName: "Admin" },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 60000,
      };

      const credential = await navigator.credentials.create({ publicKey: publicKeyCredentialCreationOptions });
      
      localStorage.setItem('biometric_credential_id', bufferToBase64URLString(credential.rawId));
      localStorage.setItem('biometric_password', passwordToSave);
      setHasBiometricSetup(true);
      alert("Fingerprint successfully registered!");
    } catch (err) {
      console.error("Biometric setup failed:", err);
      alert("Failed to set up fingerprint. You might have cancelled the prompt.");
    }
  };

  const loginWithBiometrics = async () => {
    try {
      const credentialIdString = localStorage.getItem('biometric_credential_id');
      const savedPassword = localStorage.getItem('biometric_password');
      
      if (!credentialIdString || !savedPassword) throw new Error("No biometrics set up");

      const publicKeyCredentialRequestOptions = {
        challenge: generateRandomBuffer(),
        allowCredentials: [{
          id: base64URLStringToBuffer(credentialIdString),
          type: 'public-key',
        }],
        userVerification: "required",
        timeout: 60000,
      };

      await navigator.credentials.get({ publicKey: publicKeyCredentialRequestOptions });
      
      setEnteredPassword(savedPassword);
      handleUnlock(savedPassword); 
      
    } catch (err) {
      console.error("Biometric login failed:", err);
    }
  };

  const migrateLegacyTasks = (taskList) => {
    let hasLegacy = false;
    const updated = taskList.map(task => {
      if (['Easy', 'Medium', 'Hard'].includes(task.factor)) {
        hasLegacy = true;
        let newFactor = 'Later';
        if (task.factor === 'Hard') newFactor = 'Urgent';
        if (task.factor === 'Medium') newFactor = 'Normal';
        return { ...task, factor: newFactor };
      }
      return task;
    });
    return { updated, hasLegacy };
  };

  const fetchTasks = useCallback(async (pwd) => {
    try {
      const unsavedFlag = localStorage.getItem('task_manager_unsaved') === 'true';
      if (unsavedFlag) {
        const cached = localStorage.getItem('task_manager_cache');
        if (cached) {
          const { updated } = migrateLegacyTasks(JSON.parse(cached));
          setTasks(updated);
          setHasUnsavedChanges(true); 
          return; 
        }
      }

      const { tasks: fetchedTasks } = await apiStorage.getTasks(pwd);
      const { updated, hasLegacy } = migrateLegacyTasks(fetchedTasks || []);
      
      setTasks(updated);
      setHasUnsavedChanges(hasLegacy);
      
      localStorage.setItem('task_manager_cache', JSON.stringify(updated));
      localStorage.setItem('task_manager_unsaved', hasLegacy ? 'true' : 'false');
      localStorage.setItem('offline_auth', pwd);

    } catch (error) {
      if (error.message === "Unauthorized") throw error;
      if (pwd === localStorage.getItem('offline_auth')) {
        const cached = localStorage.getItem('task_manager_cache');
        if (cached) {
          const { updated } = migrateLegacyTasks(JSON.parse(cached));
          setTasks(updated);
          setHasUnsavedChanges(localStorage.getItem('task_manager_unsaved') === 'true');
        }
      } else {
        throw new Error("Network Error & Offline Auth Failed");
      }
    }
  }, []);

  // ============================================================================
  // REAL-TIME WEBSOCKET SUBSCRIPTION
  // Listens for changes from other devices and updates the UI instantly
  // ============================================================================
  useEffect(() => {
    if (!passwordOk) return; // Only listen if the user is fully logged in

    const taskListener = supabase
      .channel('public:tasks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          // A change happened in the database! Let's surgically update the React state.
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setTasks((prevTasks) => {
              const taskExists = prevTasks.some(t => t.id === payload.new.id);
              if (taskExists) {
                // Replace the old version with the new one from the phone
                return prevTasks.map(t => t.id === payload.new.id ? payload.new : t);
              } else {
                // Add the brand new task from the phone
                return [...prevTasks, payload.new];
              }
            });
          } else if (payload.eventType === 'DELETE') {
            // Remove the task that was deleted on the phone
            setTasks((prevTasks) => prevTasks.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Cleanup the WebSocket when the app closes
    return () => {
      supabase.removeChannel(taskListener);
    };
  }, [passwordOk]);

  const handleToggleSubtask = (taskId, subtaskId) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId && t.subtasks) {
        const updatedSubtasks = t.subtasks.map(st => 
          st.id === subtaskId ? { ...st, completed: !st.completed } : st
        );
        return { ...t, subtasks: updatedSubtasks };
      }
      return t;
    });
    updateLocalTasks(updatedTasks);
  };

  const handleUnlock = async (pwd) => {
    setIsLoading(true);
    try {
      await fetchTasks(pwd);
      setPasswordOk(true);
    } catch (error) {
      if (error.message === "Unauthorized") {
        alert("Wrong password! Try again.");
      } else {
        alert("Network error: Please check your connection.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    handleUnlock(enteredPassword);
  };

  useEffect(() => {
    if (passwordOk) fetchTasks(enteredPassword);
  }, [passwordOk, fetchTasks, enteredPassword]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const updateLocalTasks = async (newTasks) => {
    // 1. Optimistic UI Update (Instantly updates the screen so it feels fast)
    setTasks(newTasks);
    localStorage.setItem('task_manager_cache', JSON.stringify(newTasks));
    
    // 2. Background Auto-Sync (Fires off to PostgreSQL immediately)
    setIsSyncing(true);
    try {
      await apiStorage.saveTasks(newTasks, enteredPassword);
      setHasUnsavedChanges(false);
      localStorage.setItem('task_manager_unsaved', 'false');
    } catch (error) {
      console.error("Auto-sync failed. Saved locally. Will retry later.", error);
      setHasUnsavedChanges(true);
      localStorage.setItem('task_manager_unsaved', 'true');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInlineUpdate = (taskId, field, value) => {
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, [field]: value } : t);
    updateLocalTasks(updatedTasks);
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    const cleanTag = currentTagInput.trim().toLowerCase();
    if (cleanTag && !taskTags.includes(cleanTag)) setTaskTags([...taskTags, cleanTag]);
    setCurrentTagInput('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let updatedTasks;
    if (editingTaskId) {
      updatedTasks = tasks.map(t => 
        t.id === editingTaskId ? { ...t, name: taskName, factor, last_date: lastDate, links: taskLinks, tags: taskTags, subtasks: subtasks } : t
      );
    } else {
      updatedTasks = [...tasks, { id: Date.now(), name: taskName, factor, last_date: lastDate, completed: false, links: taskLinks, tags: taskTags, subtasks: subtasks }];
    }
    updateLocalTasks(updatedTasks);
    // Reset everything
    setTaskName(''); setFactor('Normal'); setLastDate(''); setTaskLinks([]); setTaskTags([]); setSubtasks([]); setEditingTaskId(null);
  };

  const handleDelete = (id) => updateLocalTasks(tasks.filter(t => t.id !== id));
  const handleComplete = (task) => updateLocalTasks(tasks.map(t => t.id === task.id ? { ...t, completed: true, completion_date: new Date().toISOString() } : t));
  const handleUndoComplete = (task) => updateLocalTasks(tasks.map(t => t.id === task.id ? { ...t, completed: false, completion_date: null } : t));

  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    try {
      await apiStorage.saveTasks(tasks, enteredPassword);
      setHasUnsavedChanges(false);
      localStorage.setItem('task_manager_unsaved', 'false'); 
    } catch (error) {
      alert('GitHub Sync Failed. Changes stored locally.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEdit = (task) => {
    setTaskName(task.name); setFactor(task.factor); setLastDate(task.last_date);
    setTaskLinks(task.links || []); setTaskTags(task.tags || []); 
    setSubtasks(task.subtasks || []);
    setEditingTaskId(task.id);
  };

  const formatDate = (isoDate) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
  };

  const getFactorClass = (factor) => {
    if (factor === 'Later') return 'bg-emerald-500 dark:bg-emerald-600 text-white';
    if (factor === 'Normal') return 'bg-amber-500 dark:bg-amber-600 text-white';
    if (factor === 'Urgent') return 'bg-red-500 dark:bg-red-600 text-white';
    return '';
  };

  const difficultyOrder = { 'Urgent': 1, 'Normal': 2, 'Later': 3 };
  const todayDate = new Date().toISOString().split('T')[0];

  const matchesSearchAndFilter = (task) => {
    const query = searchQuery.toLowerCase();
    const matchesFactor = filterFactor === 'All' || task.factor === filterFactor;
    const matchesDate = filterDate === '' || task.last_date <= filterDate;
    
    const matchesName = task.name.toLowerCase().includes(query);
    const matchesLinks = task.links ? task.links.some(l => (l.title || '').toLowerCase().includes(query)) : false;
    const matchesTags = task.tags ? task.tags.some(t => t.toLowerCase().includes(query)) : false;
    
    return matchesFactor && matchesDate && (matchesName || matchesLinks || matchesTags);
  };

  const filteredActiveTasks = [...tasks].filter(task => !task.completed).filter(matchesSearchAndFilter).sort((a,b) => {
      const dA = new Date(a.last_date), dB = new Date(b.last_date);
      if(dA < dB) return -1; if(dA > dB) return 1;
      return difficultyOrder[a.factor] - difficultyOrder[b.factor];
    });

  const filteredCompletedTasks = [...tasks].filter(task => task.completed).filter(matchesSearchAndFilter).sort((a, b) => {
      const dA = new Date(a.last_date), dB = new Date(b.last_date);
      if(dA < dB) return 1; if(dA > dB) return -1;
      return difficultyOrder[a.factor] - difficultyOrder[b.factor];
    });

  return (
    <div className="min-h-screen font-sans m-0 p-0 bg-[linear-gradient(135deg,#f7fafc_24%,#ffe5c2_100%)] dark:bg-none dark:bg-slate-900 transition-colors duration-300 pb-[40px]">
      
      {!passwordOk ? (
        <LoginScreen 
          enteredPassword={enteredPassword}
          setEnteredPassword={setEnteredPassword}
          handlePasswordSubmit={handlePasswordSubmit}
          isLoading={isLoading}
          hasBiometricSetup={hasBiometricSetup}
          loginWithBiometrics={loginWithBiometrics}
          setupBiometrics={setupBiometrics}
        />
      ) : (
        <div>
          <div className="min-h-screen flex flex-col items-center w-screen overflow-x-hidden">
            
            <Header 
              hasUnsavedChanges={hasUnsavedChanges}
              isDarkMode={isDarkMode}
              setIsDarkMode={setIsDarkMode}
              handleSyncToCloud={handleSyncToCloud}
              isSyncing={isSyncing}
            />

            <ConsistencyHeatmap tasks={tasks} />

            <TaskForm 
              taskName={taskName} 
              setTaskName={setTaskName}
              factor={factor} 
              setFactor={setFactor}
              lastDate={lastDate} 
              setLastDate={setLastDate} 
              todayDate={todayDate}
              currentTagInput={currentTagInput} 
              setCurrentTagInput={setCurrentTagInput} 
              handleAddTag={handleAddTag}
              taskTags={taskTags} 
              setTaskTags={setTaskTags}
              taskLinks={taskLinks} 
              setTaskLinks={setTaskLinks}
              editingTaskId={editingTaskId} 
              setEditingTaskId={setEditingTaskId}
              handleSubmit={handleSubmit}
              subtasks={subtasks}
              setSubtasks={setSubtasks}
              currentSubtaskInput={currentSubtaskInput}
              setCurrentSubtaskInput={setCurrentSubtaskInput}
            />

            {/* --- FILTER BAR & ACTIVE TASKS --- */}
            {/* The top card ALWAYS holds the filter bar, acting as your main control center */}
            <div className="w-[96vw] max-w-[900px] mx-auto rounded-[18px] shadow-[0_2px_14px_#ffe5a940] dark:shadow-none bg-[#fffbe7] dark:bg-slate-800 dark:border dark:border-slate-700 pt-[28px] px-[12px] sm:px-[18px] pb-[22px] transition-colors duration-300">
              <FilterBar 
                searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                filterStatus={filterStatus} setFilterStatus={setFilterStatus}
                filterFactor={filterFactor} setFilterFactor={setFilterFactor}
                filterDate={filterDate} setFilterDate={setFilterDate}
              />
              
              {/* Only render the Active table if we are in 'Active' or 'All' view */}
              {(filterStatus === 'Active' || filterStatus === 'All') && (
                <>
                  <h2 className="text-center font-bold text-[1.5rem] text-[#c57415] dark:text-orange-400 mb-[13px]">My Tasks</h2>
                  <TaskTable 
                    tasks={filteredActiveTasks}
                    isCompleted={false}
                    todayDate={todayDate}
                    targetDate={filterDate || todayDate}
                    formatDate={formatDate}
                    getFactorClass={getFactorClass}
                    handleInlineUpdate={handleInlineUpdate}
                    handleEdit={handleEdit}
                    handleDelete={handleDelete}
                    handleComplete={handleComplete}
                    handleToggleSubtask={handleToggleSubtask}
                  />
                </>
              )}
            </div>
            
            {/* --- COMPLETED TASKS SECTION --- */}
            {/* ALWAYS renders at the bottom as long as there is at least one completed task in your account */}
            {tasks.some(task => task.completed) && (
              <div className="w-[96vw] max-w-[900px] mx-auto mt-[34px] rounded-[18px] shadow-[0_2px_14px_#ffe5a940] dark:shadow-none bg-[#fffbe7] dark:bg-slate-800 dark:border dark:border-slate-700 pt-[28px] px-[12px] sm:px-[18px] pb-[22px] mb-[40px] transition-colors duration-300">
                
                {/* Dynamic Header:
                  If view is 'Active', it's a clickable dropdown toggle.
                  If view is 'All' or 'Completed', it locks open and hides the arrow.
                */}
                <div 
                  className={`flex justify-center items-center gap-2 mb-[13px] ${filterStatus === 'Active' ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                  onClick={() => {
                    if (filterStatus === 'Active') {
                      setShowCompleted(!showCompleted);
                    }
                  }}
                  title={filterStatus === 'Active' ? "Click to toggle visibility" : ""}
                >
                  <h2 className="text-center font-bold text-[1.5rem] text-[#c57415] dark:text-orange-400">
                    Completed Tasks
                  </h2>
                  {filterStatus === 'Active' && (
                    <span className="text-[#c57415] dark:text-orange-400 text-xl font-bold pb-1">
                      {showCompleted ? '▲' : '▼'}
                    </span>
                  )}
                </div>

                {/* Forces table to render fully if view is 'All' or 'Completed', or if the dropdown is clicked */}
                {((filterStatus === 'All' || filterStatus === 'Completed') || (filterStatus === 'Active' && showCompleted)) && (
                  <TaskTable 
                    tasks={filteredCompletedTasks}
                    isCompleted={true}
                    formatDate={formatDate}
                    getFactorClass={getFactorClass}
                    handleUndoComplete={handleUndoComplete}
                    handleToggleSubtask={handleToggleSubtask}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✨ NEW: FLOATING ACTION BUTTON (Mobile Friendly) */}
      {passwordOk && (
        <button
          onClick={() => setIsQuickAddOpen(true)}
          title="Quick Add Task (Ctrl+K)"
          className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-14 h-14 bg-[linear-gradient(135deg,#f57c00_0%,#d84315_100%)] text-white rounded-full shadow-[0_4px_16px_rgba(245,124,0,0.5)] flex items-center justify-center text-3xl z-40 transition-transform hover:scale-110 active:scale-95"
        >
          +
        </button>
      )}

      {/* ✨ NEW: THE MODAL */}
      <QuickAddModal 
        isOpen={isQuickAddOpen} 
        onClose={() => setIsQuickAddOpen(false)} 
        onQuickAdd={handleQuickAdd}
        isDarkMode={isDarkMode}
      />

      <Analytics />
    </div>
  );
}

export default App;