import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { generateAutoTags } from './utils/tagEngine';

// ============================================================================
// WEBAUTHN UTILITY FUNCTIONS
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

function App() {
  const [taskName, setTaskName] = useState('');
  const [factor, setFactor] = useState('Normal'); 
  const [lastDate, setLastDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const inputRef = useRef(null);

  const [session, setSession] = useState(null);
  const [isLocallyUnlocked, setIsLocallyUnlocked] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 1. Google Session Listener
  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('access_token')) {
      window.history.replaceState(null, document.title, window.location.pathname);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. The Local PIN Unlock Logic
  const handleUnlock = async (pwd) => {
    setIsLoading(true);
    try {
      const savedPin = localStorage.getItem('app_pin');
      
      if (!savedPin) {
        // First time user: Save their PIN locally
        localStorage.setItem('app_pin', pwd);
        setIsLocallyUnlocked(true);
        await fetchTasks();
      } else if (pwd === savedPin) {
        // Returning user: PIN matches
        setIsLocallyUnlocked(true);
        await fetchTasks();
      } else {
        alert("Incorrect Vault PIN!");
      }
    } catch (error) {
      console.error(error);
      alert("Network error: Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    handleUnlock(enteredPassword);
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  // Tasks strictly start empty and load from the cloud
  const [tasks, setTasks] = useState([]);
  
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskLinks, setTaskLinks] = useState([]);
  const [taskTags, setTaskTags] = useState([]);
  const [currentTagInput, setCurrentTagInput] = useState('');
  const [subtasks, setSubtasks] = useState([]);
  const [currentSubtaskInput, setCurrentSubtaskInput] = useState('');

  // const [passwordOk, setPasswordOk] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFactor, setFilterFactor] = useState('All');
  const [filterDate, setFilterDate] = useState(''); 
  const [filterStatus, setFilterStatus] = useState('Active'); 
  const [showCompleted, setShowCompleted] = useState(false);  

  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [hasBiometricSetup, setHasBiometricSetup] = useState(false);
  const [recurrence, setRecurrence] = useState('none');

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); 
        if (isLocallyUnlocked) {
          setIsQuickAddOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isLocallyUnlocked]);

  const todayDate = new Date().toISOString().split('T')[0];

  const handleQuickAdd = (newTitle) => {
    const smartTags = generateAutoTags(newTitle, []);
    const newTask = {
      id: Date.now(),
      name: newTitle,
      factor: 'Normal',
      last_date: todayDate,
      start_date: null,
      completed: false,
      recurrence: 'none',
      links: [],
      tags: smartTags, 
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
    const updated = taskList.map(task => {
      let newFactor = task.factor;
      if (['Easy', 'Medium', 'Hard'].includes(task.factor)) {
        newFactor = 'Later';
        if (task.factor === 'Hard') newFactor = 'Urgent';
        if (task.factor === 'Medium') newFactor = 'Normal';
      }

      let safeTags = [];
      if (Array.isArray(task.tags)) {
        safeTags = task.tags.map(t => {
          if (typeof t === 'string') return t;
          if (typeof t === 'object' && t !== null && t.tag) return t.tag; 
          return null;
        }).filter(Boolean);
      }

      return { ...task, factor: newFactor, tags: safeTags };
    });
    return { updated };
  };

  const fetchTasks = useCallback(async (pwd) => {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Network Timeout")), 5000)
      );
      
      const { tasks: fetchedTasks } = await Promise.race([
        apiStorage.getTasks(),
        timeoutPromise
      ]);

      const { updated } = migrateLegacyTasks(fetchedTasks || []);
      setTasks(updated);

    } catch (error) {
      if (error.message === "Unauthorized") throw error;
      throw new Error("Network Error. Please check your connection.");
    }
  }, []);

  // ============================================================================
  // REAL-TIME WEBSOCKET SUBSCRIPTION
  // ============================================================================
  useEffect(() => {
    if (!isLocallyUnlocked) return;

    const taskListener = supabase
      .channel('public:tasks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setTasks((prevTasks) => {
              const taskExists = prevTasks.some(t => t.id === payload.new.id);
              if (taskExists) {
                return prevTasks.map(t => t.id === payload.new.id ? payload.new : t);
              } else {
                return [...prevTasks, payload.new];
              }
            });
          } else if (payload.eventType === 'DELETE') {
            setTasks((prevTasks) => prevTasks.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(taskListener);
    };
  }, [isLocallyUnlocked]);

  useEffect(() => {
    if (tasks.length === 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const lastReset = localStorage.getItem('last_habit_reset');

    if (lastReset !== todayStr) {
      let needsUpdate = false;
      
      const resetTasks = tasks.map(t => {
        if (t.completed && t.recurrence && t.recurrence !== 'none') {
          const compDate = t.completion_date ? t.completion_date.split('T')[0] : '';
          
          if (compDate !== todayStr && compDate !== '') {
            needsUpdate = true;
            
            let newDeadline = t.last_date ? new Date(t.last_date) : null;
            let newStartDate = t.start_date ? new Date(t.start_date) : null;
            
            if (t.recurrence === 'daily') {
              if (newDeadline) newDeadline = new Date(); 
              if (newStartDate) newStartDate = new Date();
            } else if (t.recurrence === 'weekly') {
              if (newDeadline) newDeadline.setDate(newDeadline.getDate() + 7); 
              if (newStartDate) newStartDate.setDate(newStartDate.getDate() + 7);
            } else if (t.recurrence === 'monthly') {
              if (newDeadline) newDeadline.setMonth(newDeadline.getMonth() + 1); 
              if (newStartDate) newStartDate.setMonth(newStartDate.getMonth() + 1);
            }

            return { 
              ...t, 
              completed: false, 
              completion_date: null,
              last_date: newDeadline ? newDeadline.toISOString().split('T')[0] : '',
              start_date: newStartDate ? newStartDate.toISOString().split('T')[0] : '',
              subtasks: t.subtasks ? t.subtasks.map(st => ({...st, completed: false})) : []
            };
          }
        }
        return t;
      });

      if (needsUpdate) {
        updateLocalTasks(resetTasks);
      }
      localStorage.setItem('last_habit_reset', todayStr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

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
            
            let newTasksAdded = false;
            let currentTasks = [...tasks];

            upcoming.forEach((contest, index) => {
              const contestName = `🏆 CF: ${contest.name}`;
              const alreadyExists = currentTasks.some(t => t.name === contestName);

              if (!alreadyExists) {
                const contestDateObj = new Date(contest.startTimeSeconds * 1000);
                const contestDateStr = contestDateObj.toISOString().split('T')[0];
                const timeString = contestDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                const newTask = {
                  id: Date.now() + index, 
                  name: contestName,
                  factor: 'Urgent', 
                  last_date: contestDateStr,
                  completed: false,
                  recurrence: 'none',
                  links: [{ title: 'Registration / Contest Page', url: 'https://codeforces.com/contests' }],
                  tags: ['codeforces', 'contest'],
                  subtasks: [
                    { id: Date.now() + 100 + index, title: `Register before ${timeString}`, completed: false },
                    { id: Date.now() + 200 + index, title: `Compete at ${timeString}`, completed: false }
                  ]
                };
                
                currentTasks.push(newTask);
                newTasksAdded = true;
              }
            });

            if (newTasksAdded) {
              updateLocalTasks(currentTasks);
            }
            
            localStorage.setItem('last_cf_fetch', todayStr);
          }
        } catch (error) {
          console.error("Failed to fetch Codeforces contests", error);
        }
      }
    };

    fetchContests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocallyUnlocked, tasks.length]);

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

  const updateLocalTasks = async (newTasks) => {
    // 1. Optimistic UI update
    setTasks(newTasks);

    // 2. Pure Cloud Sync
    try {
      await apiStorage.saveTasks(newTasks);
    } catch (error) {
      console.error("Cloud sync failed.", error);
      alert("Failed to save. Please check your internet connection.");
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
    
    const cleanTaskName = taskName.trim();
    if (!cleanTaskName) {
      alert("Please enter a task name.");
      return; 
    }

    let updatedTasks;
    const smartTags = generateAutoTags(cleanTaskName, taskTags);

    if (editingTaskId) {
      updatedTasks = tasks.map(t => 
        t.id === editingTaskId ? { 
          ...t, 
          name: cleanTaskName,
          factor, 
          last_date: lastDate || null, 
          start_date: startDate || null, 
          links: taskLinks, 
          tags: smartTags, 
          subtasks: subtasks, 
          recurrence: recurrence 
        } : t
      );
    } else {
      updatedTasks = [...tasks, { 
        id: Date.now(), 
        name: cleanTaskName,
        factor, 
        last_date: lastDate || null, 
        start_date: startDate || null, 
        completed: false, 
        links: taskLinks, 
        tags: smartTags, 
        subtasks: subtasks, 
        recurrence: recurrence 
      }];
    }
    
    updateLocalTasks(updatedTasks);
    
    setTaskName(''); setFactor('Normal'); setLastDate(''); setStartDate(''); setTaskLinks([]); setTaskTags([]); setSubtasks([]); setRecurrence('none'); setEditingTaskId(null);
  };

  const handleDelete = (id) => updateLocalTasks(tasks.filter(t => t.id !== id));
  const handleComplete = (task) => updateLocalTasks(tasks.map(t => t.id === task.id ? { ...t, completed: true, completion_date: new Date().toISOString() } : t));
  const handleUndoComplete = (task) => updateLocalTasks(tasks.map(t => t.id === task.id ? { ...t, completed: false, completion_date: null } : t));

  const handleEdit = (task) => {
    setTaskName(task.name); setFactor(task.factor); 
    setLastDate(task.last_date || ''); 
    setStartDate(task.start_date || '');
    setTaskLinks(task.links || []); setTaskTags(task.tags || []); setSubtasks(task.subtasks || []); 
    setRecurrence(task.recurrence || 'none');
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

  const currentDateStr = new Date().toISOString().split('T')[0];

  const filteredActiveTasks = tasks.filter(task => {
    if (task.completed) return false;
    if (task.start_date && task.start_date > currentDateStr) return false;
    if (filterStatus === 'Active' && filterDate && task.last_date !== filterDate) return false;
    if (filterStatus !== 'Active' && filterStatus !== 'All' && task.factor !== filterStatus) return false;
    if (searchQuery && !task.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const hasDeadA = !!a.last_date;
    const hasDeadB = !!b.last_date;
    if (hasDeadA !== hasDeadB) return hasDeadA ? -1 : 1;
    if (hasDeadA && hasDeadB) {
      const deadDiff = new Date(a.last_date) - new Date(b.last_date);
      if (deadDiff !== 0) return deadDiff;
    }

    const priorityMap = { 'Urgent': 1, 'Normal': 2, 'Later': 3 };
    const prioA = priorityMap[a.factor] || 4;
    const prioB = priorityMap[b.factor] || 4;
    if (prioA !== prioB) return prioA - prioB;

    return a.name.localeCompare(b.name);
  });

  const filteredCompletedTasks = tasks.filter(task => {
    if (!task.completed) return false;
    if (searchQuery && !task.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (!a.completion_date && b.completion_date) return 1;
    if (a.completion_date && !b.completion_date) return -1;
    if (!a.completion_date && !b.completion_date) return 0;
    return new Date(b.completion_date) - new Date(a.completion_date);
  });

  return (
    <div className="min-h-screen font-sans m-0 p-0 bg-[linear-gradient(135deg,#f7fafc_24%,#ffe5c2_100%)] dark:bg-none dark:bg-slate-900 transition-colors duration-300 pb-[40px]">
      
      {!isLocallyUnlocked ? (
        <LoginScreen 
          session = {session}
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
              isDarkMode={isDarkMode}
              setIsDarkMode={setIsDarkMode}
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
              recurrence={recurrence}
              setRecurrence={setRecurrence}
              startDate={startDate}
              setStartDate={setStartDate}
            />

            <div className="w-[96vw] max-w-[900px] mx-auto rounded-[18px] shadow-[0_2px_14px_#ffe5a940] dark:shadow-none bg-[#fffbe7] dark:bg-slate-800 dark:border dark:border-slate-700 pt-[28px] px-[12px] sm:px-[18px] pb-[22px] transition-colors duration-300">
              <FilterBar 
                searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                filterStatus={filterStatus} setFilterStatus={setFilterStatus}
                filterFactor={filterFactor} setFilterFactor={setFilterFactor}
                filterDate={filterDate} setFilterDate={setFilterDate}
              />
              
              {(filterStatus === 'Active' || filterStatus === 'All') && (
                <>
                  {filteredActiveTasks.some(t => t.recurrence && t.recurrence !== 'none') && (
                    <div className="mb-8">
                      <h2 className="text-center font-extrabold text-[1.5rem] text-[#cc6000] dark:text-orange-500 mb-2 flex items-center justify-center gap-2">
                        <span>🔁</span> Daily Habits
                      </h2>
                      <TaskTable 
                        tasks={filteredActiveTasks.filter(t => t.recurrence && t.recurrence !== 'none')}
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
                    </div>
                  )}

                  <h2 className="text-center font-bold text-[1.5rem] text-[#c57415] dark:text-orange-400 mb-[13px] mt-4">
                    Active Tasks
                  </h2>
                  <TaskTable 
                    tasks={filteredActiveTasks.filter(t => !t.recurrence || t.recurrence === 'none')}
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
            
            {tasks.some(task => task.completed) && (
              <div className="w-[96vw] max-w-[900px] mx-auto mt-[34px] rounded-[18px] shadow-[0_2px_14px_#ffe5a940] dark:shadow-none bg-[#fffbe7] dark:bg-slate-800 dark:border dark:border-slate-700 pt-[28px] px-[12px] sm:px-[18px] pb-[22px] mb-[40px] transition-colors duration-300">
                
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

      {isLocallyUnlocked && (
        <button
          onClick={() => setIsQuickAddOpen(true)}
          title="Quick Add Task (Ctrl+K)"
          className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-14 h-14 bg-[linear-gradient(135deg,#f57c00_0%,#d84315_100%)] text-white rounded-full shadow-[0_4px_16px_rgba(245,124,0,0.5)] flex items-center justify-center text-3xl z-40 transition-transform hover:scale-110 active:scale-95"
        >
          +
        </button>
      )}

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