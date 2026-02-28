// App.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { apiStorage } from './githubStorage';
import { Analytics } from "@vercel/analytics/react"

function App() {
  const [taskName, setTaskName] = useState('');
  const [factor, setFactor] = useState('Normal'); // Default to Normal now
  const [lastDate, setLastDate] = useState('');
  const [tasks, setTasks] = useState([]);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskLinks, setTaskLinks] = useState([]);
  const [taskTags, setTaskTags] = useState([]);
  const [currentTagInput, setCurrentTagInput] = useState('');

  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordOk, setPasswordOk] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(() => {
    return localStorage.getItem('task_manager_unsaved') === 'true';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterFactor, setFilterFactor] = useState('All');
  const [filterDate, setFilterDate] = useState(''); // NEW: Date Filter State

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // --- ON-THE-FLY DATA MIGRATOR ---
  // Translates legacy 'Easy/Medium/Hard' tasks into 'Later/Normal/Urgent' safely
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

  const fetchTasks = useCallback(async () => {
    try {
      const unsavedFlag = localStorage.getItem('task_manager_unsaved') === 'true';
      if (unsavedFlag) {
        const cached = localStorage.getItem('task_manager_cache');
        if (cached) {
          const { updated } = migrateLegacyTasks(JSON.parse(cached));
          setTasks(updated);
          setHasUnsavedChanges(true); // Keep unsaved status true
          return; 
        }
      }

      const { tasks: fetchedTasks } = await apiStorage.getTasks(enteredPassword);
      const { updated, hasLegacy } = migrateLegacyTasks(fetchedTasks || []);
      
      setTasks(updated);
      
      // If legacy data was found and fixed, trigger the unsaved warning so the user syncs it!
      setHasUnsavedChanges(hasLegacy);
      
      localStorage.setItem('task_manager_cache', JSON.stringify(updated));
      localStorage.setItem('task_manager_unsaved', hasLegacy ? 'true' : 'false');
      localStorage.setItem('offline_auth', enteredPassword);

    } catch (error) {
      if (error.message === "Unauthorized") throw error;
      if (enteredPassword === localStorage.getItem('offline_auth')) {
        const cached = localStorage.getItem('task_manager_cache');
        if (cached) {
          const { updated } = migrateLegacyTasks(JSON.parse(cached));
          setTasks(updated);
          setHasUnsavedChanges(localStorage.getItem('task_manager_unsaved') === 'true');
          console.warn("Offline Mode: Loaded from local cache.");
        }
      } else {
        throw new Error("Network Error & Offline Auth Failed");
      }
    }
  }, [enteredPassword]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await fetchTasks();
      setPasswordOk(true);
    } catch (error) {
      if (error.message === "Unauthorized") {
        alert("Wrong password! Try again.");
      } else if (error.message === "Network Error & Offline Auth Failed") {
        alert("You are offline, and the password doesn't match the offline cache.");
      } else {
        alert("Network error: Please check your connection.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (passwordOk) {
      fetchTasks();
    }
  }, [passwordOk, fetchTasks]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const updateLocalTasks = (newTasks) => {
    setTasks(newTasks);
    setHasUnsavedChanges(true);
    localStorage.setItem('task_manager_cache', JSON.stringify(newTasks));
    localStorage.setItem('task_manager_unsaved', 'true');
  };

  const handleInlineUpdate = (taskId, field, value) => {
    const updatedTasks = tasks.map(t =>
      t.id === taskId ? { ...t, [field]: value } : t
    );
    updateLocalTasks(updatedTasks);
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    const cleanTag = currentTagInput.trim().toLowerCase();
    if (cleanTag && !taskTags.includes(cleanTag)) {
      setTaskTags([...taskTags, cleanTag]);
    }
    setCurrentTagInput('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let updatedTasks;
    if (editingTaskId) {
      updatedTasks = tasks.map(t => 
        t.id === editingTaskId ? { ...t, name: taskName, factor, last_date: lastDate, links: taskLinks, tags: taskTags } : t
      );
    } else {
      const newTask = {
        id: Date.now(),
        name: taskName,
        factor: factor,
        last_date: lastDate,
        completed: false,
        links: taskLinks,
        tags: taskTags
      };
      updatedTasks = [...tasks, newTask];
    }
    updateLocalTasks(updatedTasks);
    setTaskName(''); setFactor('Normal'); setLastDate(''); 
    setTaskLinks([]); setTaskTags([]); setEditingTaskId(null);
  };

  const handleDelete = (id) => {
    const updatedTasks = tasks.filter(t => t.id !== id);
    updateLocalTasks(updatedTasks);
  };

  const handleComplete = (task) => {
    const updatedTasks = tasks.map(t => 
      t.id === task.id 
        ? { ...t, completed: true, completion_date: new Date().toISOString() } 
        : t
    );
    updateLocalTasks(updatedTasks);
  };

  const handleUndoComplete = (task) => {
    const updatedTasks = tasks.map(t => 
      t.id === task.id 
        ? { ...t, completed: false, completion_date: null } 
        : t
    );
    updateLocalTasks(updatedTasks);
  };

  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    try {
      await apiStorage.saveTasks(tasks, enteredPassword);
      setHasUnsavedChanges(false);
      localStorage.setItem('task_manager_unsaved', 'false'); 
    } catch (error) {
      console.error('Error syncing tasks:', error);
      alert('GitHub Sync Failed. You might be offline. Your changes are safely stored locally!');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEdit = (task) => {
    setTaskName(task.name);
    setFactor(task.factor);
    setLastDate(task.last_date);
    setTaskLinks(task.links || []);
    setTaskTags(task.tags || []);
    setEditingTaskId(task.id);
  };

  const formatDate = (isoDate) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Upgraded Colors to match the Urgency Model
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
    // Date filter: Only check if filterDate is actually set
    const matchesDate = filterDate === '' || task.last_date === filterDate;
    
    const matchesName = task.name.toLowerCase().includes(query);
    const matchesLinks = task.links ? task.links.some(l => (l.title || '').toLowerCase().includes(query)) : false;
    const matchesTags = task.tags ? task.tags.some(t => t.toLowerCase().includes(query)) : false;
    
    return matchesFactor && matchesDate && (matchesName || matchesLinks || matchesTags);
  };

  const filteredActiveTasks = [...tasks]
    .filter(task => !task.completed)
    .filter(matchesSearchAndFilter)
    .sort((a,b) =>{
      const dateA = new Date(a.last_date);
      const dateB = new Date(b.last_date);
      if(dateA < dateB) return -1;
      if(dateA > dateB) return 1;
      return difficultyOrder[a.factor] - difficultyOrder[b.factor];
    });

  const filteredCompletedTasks = [...tasks]
    .filter(task => task.completed)
    .filter(matchesSearchAndFilter)
    .sort((a, b) => {
      const dateA = new Date(a.last_date);
      const dateB = new Date(b.last_date);
      if (dateA < dateB) return 1;
      if (dateA > dateB) return -1;
      return difficultyOrder[a.factor] - difficultyOrder[b.factor];
    });

  const inputStyles = "px-[13px] py-[8px] rounded-[9px] border-[1.2px] border-[#ffd180] dark:border-slate-600 bg-[#fff9f2] dark:bg-slate-700 min-w-[135px] text-[1em] text-black dark:text-white outline-none transition-colors shadow-[inset_0_1px_4px_#fff6ed80] focus:border-[#ffb935] focus:dark:border-orange-400 focus:bg-[#fffbf1] focus:dark:bg-slate-600";
  const thStyles = "py-[10px] px-[9px] bg-[#ffe6ba] dark:bg-slate-800 text-[#b06d0e] dark:text-orange-400 text-[15.5px] font-[750] border-b-[2px] border-b-[#ffd59e] dark:border-b-slate-700 last:pr-0";
  const tdStyles = "block md:table-cell py-3 md:py-[10px] px-2 md:px-[8px] border-b border-[#ffe0b0] dark:border-slate-700 md:border-b-[1.2px] last:border-0 md:group-last:border-b-0 text-black dark:text-slate-200 text-left md:text-center";

  return (
    <div className="min-h-screen font-sans m-0 p-0 bg-[linear-gradient(135deg,#f7fafc_24%,#ffe5c2_100%)] dark:bg-none dark:bg-slate-900 transition-colors duration-300 pb-[40px]">
      {!passwordOk ? (
        <div className="flex flex-col items-center justify-center h-[80vh]">
          <div className="bg-[#fff8e1] dark:bg-slate-800 py-[2rem] px-[1.5rem] sm:px-[3rem] rounded-[12px] shadow-[0_8px_16px_rgba(0,0,0,0.2)] w-[90vw] max-w-[320px] text-center transition-colors">
            <h2 className="mb-[1.2rem] text-[#f57c00] font-semibold text-xl">Enter Password to View Tasks</h2>
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                className="w-full p-[0.7rem] text-[1rem] border-[2px] border-[#f57c00] rounded-[8px] mb-[1rem] outline-none transition-colors focus:border-[#ef6c00] dark:bg-slate-700 dark:text-white dark:border-slate-600"
                value={enteredPassword}
                onChange={e => setEnteredPassword(e.target.value)}
                placeholder="Password"
                autoFocus
              />
              <button type="submit" disabled={isLoading} className="bg-[#f57c00] text-white border-none p-[0.75rem] w-full rounded-[8px] font-bold cursor-pointer transition-colors hover:bg-[#ef6c00] disabled:opacity-70">
                {isLoading ? 'Unlocking...' : 'Unlock'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div>
          <div className="min-h-screen flex flex-col items-center w-screen overflow-x-hidden">
            
            <div className="w-[92vw] max-w-[900px] flex flex-col sm:flex-row justify-between items-center mt-[20px] mb-[10px] px-[10px] gap-4">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${hasUnsavedChanges ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
                <span className="font-semibold text-[#c57415] dark:text-orange-400 text-center sm:text-left">
                  {hasUnsavedChanges ? 'Unsaved Local Changes' : 'All Data Synced'}
                </span>
              </div>
              
              <div className="flex gap-4 items-center">
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-[1.2rem] rounded-full bg-[#ffe6ba] dark:bg-slate-700 hover:bg-[#ffd59e] dark:hover:bg-slate-600 transition-colors shadow-sm" title="Toggle Dark Mode">
                  {isDarkMode ? '☀️' : '🌙'}
                </button>

                <button onClick={handleSyncToCloud} disabled={!hasUnsavedChanges || isSyncing} className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-white shadow-md transition-all ${!hasUnsavedChanges ? 'bg-gray-400 dark:bg-slate-600 cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'}`}>
                  {isSyncing && <span className="animate-spin inline-block w-[14px] h-[14px] border-[2px] border-[rgba(255,255,255,0.3)] border-t-white rounded-full"></span>}
                  {isSyncing ? 'Syncing...' : '☁️ Sync to Cloud'}
                </button>
              </div>
            </div>

            <div className="w-[92vw] max-w-[512px] rounded-[21px] mb-[29px] shadow-[0_7px_36px_#ff944740] dark:shadow-none px-[20px] sm:px-[28px] pt-[34px] pb-[24px] backdrop-blur-[2.5px] bg-[linear-gradient(107deg,#ffd59e_58%,#ffe7cc_100%)] dark:bg-none dark:bg-slate-800 dark:border dark:border-slate-700 transition-colors duration-300">
              <h2 className="text-center font-extrabold text-[2rem] mb-[22px] text-[#cc6000] dark:text-orange-500 tracking-[1px]">
                {editingTaskId ? '✏️ Update Task' : 'Add a New Task'}
              </h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-y-[14px] items-center justify-center">
                
                <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center justify-between sm:justify-start gap-[9px]">
                  <label className="min-w-[62px] font-semibold text-[#bf6700] dark:text-orange-400 self-start sm:self-auto">Task: </label>
                  <input type="text" className={`${inputStyles} w-full sm:w-auto`} value={taskName} onChange={e => setTaskName(e.target.value)} required />
                </div>
                
                <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center justify-between sm:justify-start gap-[9px]">
                  <label className="min-w-[62px] font-semibold text-[#bf6700] dark:text-orange-400 self-start sm:self-auto">Priority:</label>
                  <select className={`${inputStyles} w-full sm:w-auto`} value={factor} onChange={e => setFactor(e.target.value)}>
                    <option value="Urgent">🔴 Urgent</option>
                    <option value="Normal">🟡 Normal</option>
                    <option value="Later">🟢 Later</option>
                  </select>
                </div>
                
                <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center justify-between sm:justify-start gap-[9px]">
                  <label className="min-w-[62px] font-semibold text-[#bf6700] dark:text-orange-400 self-start sm:self-auto">Last Date: </label>
                  <input type="date" className={`${inputStyles} w-full sm:w-auto`} value={lastDate} min={todayDate} onChange={e => setLastDate(e.target.value)} required />
                </div>

                <div className="flex flex-col gap-[8px] w-full mt-2">
                  <div className="flex flex-col sm:flex-row items-center gap-[9px] justify-between sm:justify-center">
                    <label className="font-semibold text-[#bf6700] dark:text-orange-400 self-start sm:self-auto">Tags: </label>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <input 
                        type="text" 
                        placeholder="e.g. assignments" 
                        className={`${inputStyles} w-full sm:min-w-[120px] flex-1`} 
                        value={currentTagInput}
                        onChange={e => setCurrentTagInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag(e);
                          }
                        }}
                      />
                      <button 
                        type="button" 
                        onClick={handleAddTag}
                        className="text-[0.85em] bg-[#ffe6ba] dark:bg-slate-700 text-[#b06d0e] dark:text-orange-400 px-[12px] py-2 sm:py-0 rounded-[6px] font-bold transition-colors hover:bg-[#ffd59e] dark:hover:bg-slate-600"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  {taskTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center px-2 sm:px-4">
                      {taskTags.map(tag => (
                        <span key={tag} className="bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-1 rounded-full dark:bg-orange-900 dark:text-orange-300 flex items-center gap-1 shadow-sm">
                          #{tag}
                          <button type="button" onClick={() => setTaskTags(taskTags.filter(t => t !== tag))} className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200 ml-1 text-sm leading-none">✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="w-full flex flex-col gap-[10px] mt-[5px]">
                  <div className="flex justify-between items-center px-1 mb-2">
                    <label className="font-semibold text-[#bf6700] dark:text-orange-400 text-sm sm:text-base">Resources / Links:</label>
                    <button 
                      type="button" 
                      onClick={() => setTaskLinks([...taskLinks, { title: '', url: '' }])}
                      className="text-[0.85em] bg-[#ffe6ba] dark:bg-slate-700 text-[#b06d0e] dark:text-orange-400 px-[10px] py-[4px] rounded-[6px] font-bold transition-colors hover:bg-[#ffd59e] dark:hover:bg-slate-600"
                    >
                      + Add Link
                    </button>
                  </div>
                  
                  {taskLinks.map((link, index) => (
                    <div key={index} className="flex flex-wrap sm:flex-nowrap gap-[8px] items-center w-full bg-white/30 dark:bg-slate-900/30 p-2 rounded-lg">
                      <input 
                        type="text" 
                        placeholder="Title (e.g. Codeforces)" 
                        className={`${inputStyles} w-full sm:flex-1`} 
                        value={link.title} 
                        onChange={e => {
                          const newLinks = [...taskLinks];
                          newLinks[index].title = e.target.value;
                          setTaskLinks(newLinks);
                        }} 
                      />
                      <input 
                        type="url" 
                        placeholder="URL (https://...)" 
                        className={`${inputStyles} w-full sm:flex-[2]`} 
                        value={link.url} 
                        onChange={e => {
                          const newLinks = [...taskLinks];
                          newLinks[index].url = e.target.value;
                          setTaskLinks(newLinks);
                        }} 
                      />
                      <button 
                        type="button" 
                        onClick={() => setTaskLinks(taskLinks.filter((_, i) => i !== index))}
                        className="text-[#e34d4d] font-bold hover:text-[#be2323] px-2 py-1 text-lg w-full sm:w-auto text-center sm:text-left bg-red-100 sm:bg-transparent rounded dark:bg-red-900/30 dark:sm:bg-transparent"
                        title="Remove link"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="w-full flex flex-col sm:flex-row justify-center mt-[13px] gap-3">
                  <button type="submit" className={`bg-[linear-gradient(90deg,#ff9100_50%,#ffb451_100%)] text-white border-none rounded-[9px] px-[30px] py-[12px] sm:py-[9px] text-[1.1em] font-bold shadow-[0_1px_6px_#ffd08555] cursor-pointer transition-colors hover:bg-[#f27300] flex gap-[8px] items-center justify-center w-full sm:w-auto`}>
                    {editingTaskId ? 'Update Task' : 'Add Task'}
                  </button>
                  {editingTaskId && (
                    <button type="button" className="bg-[#f3f3f3] dark:bg-slate-700 border-none rounded-[8px] px-[16px] py-[12px] sm:py-[8px] text-[1em] font-medium text-[#333] dark:text-white cursor-pointer transition-colors hover:bg-[#e0e0e0] dark:hover:bg-slate-600 w-full sm:w-auto" onClick={() => { setTaskName(''); setFactor('Normal'); setLastDate(''); setTaskLinks([]); setTaskTags([]); setEditingTaskId(null); }}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="w-[96vw] max-w-[900px] mx-auto rounded-[18px] shadow-[0_2px_14px_#ffe5a940] dark:shadow-none bg-[#fffbe7] dark:bg-slate-800 dark:border dark:border-slate-700 pt-[28px] px-[12px] sm:px-[18px] pb-[22px] transition-colors duration-300">
              
              {/* --- ADVANCED FILTER BAR --- */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-6 mt-2">
                
                {/* Search Bar */}
                <div className="relative w-full md:flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                  <input 
                    type="text" 
                    placeholder="Search tasks, links, or #tags..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={`${inputStyles} w-full pl-10`}
                  />
                </div>
                
                <div className="flex w-full md:w-auto gap-3">
                  {/* Priority Filter */}
                  <div className="w-1/2 md:w-auto">
                    <select 
                      value={filterFactor} 
                      onChange={e => setFilterFactor(e.target.value)}
                      className={`${inputStyles} w-full min-w-[130px] cursor-pointer`}
                    >
                      <option value="All">All Priorities</option>
                      <option value="Urgent">🔴 Urgent</option>
                      <option value="Normal">🟡 Normal</option>
                      <option value="Later">🟢 Later</option>
                    </select>
                  </div>
                  
                  {/* Date Filter */}
                  <div className="w-1/2 md:w-auto relative group flex items-center">
                    <input 
                      type="date" 
                      value={filterDate} 
                      onChange={e => setFilterDate(e.target.value)}
                      className={`${inputStyles} w-full min-w-[140px] cursor-pointer`}
                      title="Filter tasks by exact date"
                    />
                    {filterDate && (
                      <button 
                        onClick={() => setFilterDate('')} 
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 bg-[#fff9f2] dark:bg-slate-700 px-1 rounded transition-colors"
                        title="Clear Date Filter"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                
              </div>

              <h2 className="text-center font-bold text-[1.5rem] text-[#c57415] dark:text-orange-400 mb-[13px]">My Tasks</h2>
              
              <table className="w-full block md:table mt-[8px] md:border-separate md:border-spacing-0 md:rounded-[12px] md:shadow-[0_1px_10px_#ffd99a10] md:dark:shadow-none md:bg-[#fffdfa] md:dark:bg-slate-900 transition-colors duration-300">
                <thead className="hidden md:table-header-group">
                  <tr>
                    <th className={thStyles}>S.No.</th>
                    <th className={thStyles}>Task</th>
                    <th className={thStyles}>Priority</th>
                    <th className={thStyles}>Last Date</th>
                    <th className={thStyles}>Action</th>
                  </tr>
                </thead>
                <tbody className="block md:table-row-group">
                  {filteredActiveTasks.length === 0 &&(
                    <tr className="block md:table-row"><td colSpan="5" className="block md:table-cell py-[20px] px-[8px] text-center dark:text-slate-400">No matching tasks found.</td></tr>     
                  )}
                  {filteredActiveTasks.map((task, idx) => (
                    <tr key={task.id} className="block md:table-row bg-white dark:bg-slate-800 md:bg-transparent rounded-xl md:rounded-none mb-4 md:mb-0 p-4 md:p-0 shadow-sm md:shadow-none border border-orange-100 dark:border-slate-700 md:border-none group hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      <td className={`${tdStyles} hidden md:table-cell`}>{idx+1}.</td>
                      
                      <td className={`${tdStyles} flex flex-col items-start md:items-center`}>
                        <div className="flex flex-wrap items-center gap-2 mb-2 md:mb-0">
                          <span className={task.last_date === todayDate ? 'text-black dark:text-white font-bold text-lg md:text-base' : 'text-black dark:text-slate-200 text-lg md:text-base font-semibold md:font-normal'}>
                            {task.name}
                          </span>
                          
                          {task.links && task.links.length > 0 && (
                            <div className="relative group/tooltip inline-block align-middle cursor-help">
                              <span className="text-[0.8em] bg-[#e8f0fe] dark:bg-slate-700 text-[#065fd4] dark:text-blue-400 px-[6px] py-[2px] rounded-full font-bold border border-[#a4c2f4] dark:border-slate-600">
                                🔗 {task.links.length}
                              </span>
                              <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 bottom-full mb-[8px] hidden group-hover/tooltip:flex flex-col gap-[6px] bg-[#333] dark:bg-black text-white text-[13px] rounded-[8px] p-[10px] z-10 w-max max-w-[250px] shadow-lg">
                                {task.links.map((link, i) => (
                                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="text-[#93c5fd] hover:text-[#bfdbfe] hover:underline text-left truncate block">• {link.title || 'Link'}</a>
                                ))}
                                <div className="absolute top-full left-[15px] md:left-1/2 md:-translate-x-1/2 border-[6px] border-transparent border-t-[#333] dark:border-t-black"></div>
                              </div>
                            </div>
                          )}
                        </div>
                        {task.tags && task.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 justify-start md:justify-center">
                            {task.tags.map(tag => (
                              <span key={tag} className="bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide">#{tag}</span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className={`${tdStyles} flex justify-between items-center md:table-cell`}>
                        <span className="md:hidden font-bold text-[#b06d0e] dark:text-orange-400 text-sm">Priority:</span>
                        <div className="relative inline-block" title="Click to change priority">
                          <select
                            value={task.factor}
                            onChange={(e) => handleInlineUpdate(task.id, 'factor', e.target.value)}
                            className={`appearance-none cursor-pointer outline-none inline-block min-w-[71px] text-[.96em] font-bold text-white rounded-[16px] py-[3px] px-[17px] tracking-[1px] text-center transition-opacity hover:opacity-85 shadow-sm border border-transparent hover:border-white/50 ${getFactorClass(task.factor)}`}
                          >
                            <option value="Urgent" className="bg-red-500 text-white">Urgent</option>
                            <option value="Normal" className="bg-amber-500 text-white">Normal</option>
                            <option value="Later" className="bg-emerald-500 text-white">Later</option>
                          </select>
                        </div>
                      </td>

                      <td className={`${tdStyles} flex justify-between items-center md:table-cell`}>
                        <span className="md:hidden font-bold text-[#b06d0e] dark:text-orange-400 text-sm">Deadline:</span>
                        <div className="relative inline-flex items-center justify-center cursor-pointer group/date" title="Click to change date">
                          <span className="border-b border-dashed border-gray-400 dark:border-gray-500 group-hover/date:border-[#c57415] dark:group-hover/date:border-orange-400 group-hover/date:text-[#c57415] dark:group-hover/date:text-orange-400 transition-colors">
                            {formatDate(task.last_date)}
                          </span>
                          <input
                            type="date"
                            value={task.last_date}
                            onChange={(e) => {
                              if (e.target.value) handleInlineUpdate(task.id, 'last_date', e.target.value);
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                      </td>

                      <td className={`${tdStyles} flex justify-end md:justify-center pt-4 md:pt-[10px] mt-2 md:mt-0 border-t border-orange-50 dark:border-slate-700 md:border-none`}>
                        <div className="flex gap-[15px] md:gap-[10px] justify-center bg-orange-50/50 dark:bg-slate-700/30 md:bg-transparent px-3 py-1 rounded-lg">
                          <button className="bg-transparent border-none text-[#065fd4] dark:text-blue-400 text-[1.3em] md:text-[1.15em] cursor-pointer py-[3px] px-[6px] transition-colors rounded-[6px] hover:text-[#004bb8] hover:bg-[#e8f0fe] dark:hover:bg-slate-600" onClick={() => handleEdit(task)} title="Full Edit">✏️</button>
                          <button className="bg-transparent border-none text-[#e34d4d] text-[1.4em] md:text-[1.2em] cursor-pointer py-[3px] px-[6px] transition-colors rounded-[6px] hover:text-[#be2323] hover:bg-[#fff0f0] dark:hover:bg-slate-600" onClick={() => handleDelete(task.id)} title="Delete">🗑️</button>
                          <button className="bg-transparent border-none text-[#2e7d32] dark:text-green-500 text-[1.45em] md:text-[1.25em] cursor-pointer py-[3px] px-[5px] transition-colors rounded-[6px] hover:text-[#0d540d] hover:bg-[#e8f5e9] dark:hover:bg-slate-600" onClick={() => handleComplete(task)} title="Mark as Complete">✔️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredCompletedTasks.length > 0 && (
              <div className="w-[96vw] max-w-[900px] mx-auto mt-[34px] rounded-[18px] shadow-[0_2px_14px_#ffe5a940] dark:shadow-none bg-[#fffbe7] dark:bg-slate-800 dark:border dark:border-slate-700 pt-[28px] px-[12px] sm:px-[18px] pb-[22px] mb-[40px] transition-colors duration-300">
                <h2 className="text-center font-bold text-[1.5rem] text-[#c57415] dark:text-orange-400 mb-[13px]">Completed Tasks</h2>
                <table className="w-full block md:table mt-[8px] md:border-separate md:border-spacing-0 md:rounded-[12px] md:shadow-[0_1px_10px_#ffd99a10] md:dark:shadow-none md:bg-[#fffdfa] md:dark:bg-slate-900 transition-colors duration-300">
                  <thead className="hidden md:table-header-group">
                    <tr>
                      <th className={thStyles}>S.No.</th>
                      <th className={thStyles}>Task</th>
                      <th className={thStyles}>Priority</th>
                      <th className={thStyles}>Last Date</th>
                      <th className={thStyles}>Completion Date</th>
                      <th className={thStyles}>Action</th>
                    </tr>
                  </thead>
                  <tbody className="block md:table-row-group">
                    {filteredCompletedTasks.map((task, idx) => (
                        <tr key={task.id} className="block md:table-row bg-white dark:bg-slate-800 md:bg-transparent rounded-xl md:rounded-none mb-4 md:mb-0 p-4 md:p-0 shadow-sm md:shadow-none border border-orange-100 dark:border-slate-700 md:border-none group hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors opacity-80 md:opacity-100">
                          <td className={`${tdStyles} hidden md:table-cell`}>{idx + 1}.</td>
                          <td className={`${tdStyles} flex flex-col items-start md:items-center text-[#888] dark:text-slate-500`}>
                            <div className="flex items-center gap-2 mb-2 md:mb-0 text-lg md:text-base">
                              <span>✅ <span className="line-through md:no-underline">{task.name}</span></span>
                            </div>
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1 justify-start md:justify-center opacity-70">
                                {task.tags.map(tag => (
                                  <span key={tag} className="bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide">#{tag}</span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className={`${tdStyles} flex justify-between items-center md:table-cell`}>
                            <span className="md:hidden font-bold text-[#b06d0e] dark:text-orange-400 text-sm">Priority:</span>
                            <span className={`inline-block min-w-[71px] text-[.96em] font-bold text-white rounded-[16px] py-[3px] px-[17px] mr-[7px] tracking-[1px] align-middle opacity-80 md:opacity-100 ${getFactorClass(task.factor)}`}>{task.factor}</span>
                          </td>
                          <td className={`${tdStyles} flex justify-between items-center md:table-cell`}>
                            <span className="md:hidden font-bold text-[#b06d0e] dark:text-orange-400 text-sm">Deadline:</span>
                            <span>{formatDate(task.last_date)}</span>
                          </td>
                          <td className={`${tdStyles} flex justify-between items-center md:table-cell`}>
                            <span className="md:hidden font-bold text-[#b06d0e] dark:text-orange-400 text-sm">Completed:</span>
                            <span>{task.completion_date ? formatDate(task.completion_date) : ''}</span>
                          </td>
                          <td className={`${tdStyles} flex justify-end md:justify-center pt-4 md:pt-[10px] mt-2 md:mt-0 border-t border-orange-50 dark:border-slate-700 md:border-none`}>
                            <button className="bg-orange-50 dark:bg-slate-700/50 md:bg-transparent border-none text-[1.4em] md:text-[1.15em] cursor-pointer py-[4px] px-[12px] md:px-[5px] text-[#f89c0e] hover:text-[#d37800] dark:hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-2" onClick={() => handleUndoComplete(task)} title="Mark as Incomplete">
                              ↩️ <span className="md:hidden text-sm font-bold">Undo</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      <Analytics />
    </div>
  );
}

export default App;