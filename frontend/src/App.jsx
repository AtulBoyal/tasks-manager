// App.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { apiStorage } from './githubStorage';

function App() {
  const [taskName, setTaskName] = useState('');
  const [factor, setFactor] = useState('Easy');
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
  
  // Initialize from Local Storage if available
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(() => {
    return localStorage.getItem('task_manager_unsaved') === 'true';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterFactor, setFilterFactor] = useState('All');

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

  // --- UPGRADED FETCH WITH OFFLINE CACHING ---
  const fetchTasks = useCallback(async () => {
    try {
      // 1. If we have unsaved local changes from a closed tab, PROTECT THEM.
      const unsavedFlag = localStorage.getItem('task_manager_unsaved') === 'true';
      if (unsavedFlag) {
        const cached = localStorage.getItem('task_manager_cache');
        if (cached) {
          setTasks(JSON.parse(cached));
          setHasUnsavedChanges(true);
          return; // Skip GitHub fetch so we don't overwrite your local work!
        }
      }

      // 2. Normal Fetch from GitHub
      const { tasks: fetchedTasks } = await apiStorage.getTasks(enteredPassword);
      setTasks(fetchedTasks || []);
      setHasUnsavedChanges(false);
      
      // 3. Save to Offline Cache
      localStorage.setItem('task_manager_cache', JSON.stringify(fetchedTasks || []));
      localStorage.setItem('task_manager_unsaved', 'false');
      localStorage.setItem('offline_auth', enteredPassword); // Store password hash/string for offline unlock

    } catch (error) {
      // If the backend actively rejected the password, throw unauthorized
      if (error.message === "Unauthorized") throw error;

      // If it's a network/offline error, check if the password matches our offline cache
      if (enteredPassword === localStorage.getItem('offline_auth')) {
        const cached = localStorage.getItem('task_manager_cache');
        if (cached) {
          setTasks(JSON.parse(cached));
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

  // --- UPGRADED LOCAL MUTATION (NOW SAVES TO DISK) ---
  const updateLocalTasks = (newTasks) => {
    setTasks(newTasks);
    setHasUnsavedChanges(true);
    // Instantly save to the browser's hard drive
    localStorage.setItem('task_manager_cache', JSON.stringify(newTasks));
    localStorage.setItem('task_manager_unsaved', 'true');
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
    setTaskName(''); setFactor('Easy'); setLastDate(''); 
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

  // --- UPGRADED SYNC TO CLOUD ---
  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    try {
      await apiStorage.saveTasks(tasks, enteredPassword);
      setHasUnsavedChanges(false);
      localStorage.setItem('task_manager_unsaved', 'false'); // Mark cache as clean!
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

  const getFactorClass = (factor) => {
    if (factor === 'Easy') return 'bg-[#55bc69c7]';
    if (factor === 'Medium') return 'bg-[#feb825e8]';
    if (factor === 'Hard') return 'bg-[#e25d3be3]';
    return '';
  };

  const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
  const todayDate = new Date().toISOString().split('T')[0];

  const matchesSearchAndFilter = (task) => {
    const query = searchQuery.toLowerCase();
    const matchesFactor = filterFactor === 'All' || task.factor === filterFactor;
    const matchesName = task.name.toLowerCase().includes(query);
    const matchesLinks = task.links ? task.links.some(l => (l.title || '').toLowerCase().includes(query)) : false;
    const matchesTags = task.tags ? task.tags.some(t => t.toLowerCase().includes(query)) : false;
    
    return matchesFactor && (matchesName || matchesLinks || matchesTags);
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
  const tdStyles = "py-[10px] px-[8px] border-b-[1.2px] border-b-[#ffe0b0] dark:border-b-slate-700 text-center group-last:border-b-0 text-black dark:text-slate-200";

  return (
    <div className="min-h-screen font-sans m-0 p-0 bg-[linear-gradient(135deg,#f7fafc_24%,#ffe5c2_100%)] dark:bg-none dark:bg-slate-900 transition-colors duration-300 pb-[40px]">
      {!passwordOk ? (
        <div className="flex flex-col items-center justify-center h-[80vh]">
          <div className="bg-[#fff8e1] dark:bg-slate-800 py-[2rem] px-[3rem] rounded-[12px] shadow-[0_8px_16px_rgba(0,0,0,0.2)] w-[320px] text-center transition-colors">
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
          <div className="min-h-screen flex flex-col items-center w-screen">
            
            <div className="w-[92vw] max-w-[900px] flex justify-between items-center mt-[20px] mb-[10px] px-[10px]">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${hasUnsavedChanges ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
                <span className="font-semibold text-[#c57415] dark:text-orange-400">
                  {hasUnsavedChanges ? 'Unsaved Local Changes' : 'All Data Synced'}
                </span>
              </div>
              
              <div className="flex gap-4 items-center">
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 text-[1.2rem] rounded-full bg-[#ffe6ba] dark:bg-slate-700 hover:bg-[#ffd59e] dark:hover:bg-slate-600 transition-colors shadow-sm"
                  title="Toggle Dark Mode"
                >
                  {isDarkMode ? '☀️' : '🌙'}
                </button>

                <button 
                  onClick={handleSyncToCloud}
                  disabled={!hasUnsavedChanges || isSyncing}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-white shadow-md transition-all 
                    ${!hasUnsavedChanges ? 'bg-gray-400 dark:bg-slate-600 cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'}`}
                >
                  {isSyncing && <span className="animate-spin inline-block w-[14px] h-[14px] border-[2px] border-[rgba(255,255,255,0.3)] border-t-white rounded-full"></span>}
                  {isSyncing ? 'Syncing...' : '☁️ Sync to Cloud'}
                </button>
              </div>
            </div>

            <div className="w-[92vw] max-w-[512px] rounded-[21px] mb-[29px] shadow-[0_7px_36px_#ff944740] dark:shadow-none px-[28px] pt-[34px] pb-[24px] backdrop-blur-[2.5px] bg-[linear-gradient(107deg,#ffd59e_58%,#ffe7cc_100%)] dark:bg-none dark:bg-slate-800 dark:border dark:border-slate-700 transition-colors duration-300">
              <h2 className="text-center font-extrabold text-[2rem] mb-[22px] text-[#cc6000] dark:text-orange-500 tracking-[1px]">
                {editingTaskId ? '✏️ Update Task' : 'Add a New Task'}
              </h2>
              <form onSubmit={handleSubmit} className="flex flex-wrap gap-y-[14px] gap-x-[22px] items-center justify-center flex-row">
                <div className="flex items-center gap-[9px]">
                  <label className="min-w-[62px] font-semibold text-[#bf6700] dark:text-orange-400">Task: </label>
                  <input type="text" className={inputStyles} value={taskName} onChange={e => setTaskName(e.target.value)} required />
                </div>
                <div className="flex items-center gap-[9px]">
                  <label className="min-w-[62px] font-semibold text-[#bf6700] dark:text-orange-400">Factor:</label><br/>
                  <select className={inputStyles} value={factor} onChange={e => setFactor(e.target.value)}>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div className="flex items-center gap-[9px]">
                  <label className="min-w-[62px] font-semibold text-[#bf6700] dark:text-orange-400">Last Date: </label>
                  <input type="date" className={inputStyles} value={lastDate} min={todayDate} onChange={e => setLastDate(e.target.value)} required />
                </div>

                <div className="flex flex-col gap-[8px] w-full">
                  <div className="flex items-center gap-[9px] justify-center">
                    <label className="font-semibold text-[#bf6700] dark:text-orange-400">Tags: </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="e.g. assignments" 
                        className={`${inputStyles} min-w-[120px]`} 
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
                        className="text-[0.85em] bg-[#ffe6ba] dark:bg-slate-700 text-[#b06d0e] dark:text-orange-400 px-[12px] rounded-[6px] font-bold transition-colors hover:bg-[#ffd59e] dark:hover:bg-slate-600"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  {taskTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center px-4">
                      {taskTags.map(tag => (
                        <span key={tag} className="bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-1 rounded-full dark:bg-orange-900 dark:text-orange-300 flex items-center gap-1 shadow-sm">
                          #{tag}
                          <button 
                            type="button" 
                            onClick={() => setTaskTags(taskTags.filter(t => t !== tag))} 
                            className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200 ml-1 text-sm leading-none"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="w-full flex flex-col gap-[10px] mt-[5px]">
                  <div className="flex justify-between items-center px-1">
                    <label className="font-semibold text-[#bf6700] dark:text-orange-400">Resources / Links (Optional):</label>
                    <button 
                      type="button" 
                      onClick={() => setTaskLinks([...taskLinks, { title: '', url: '' }])}
                      className="text-[0.85em] bg-[#ffe6ba] dark:bg-slate-700 text-[#b06d0e] dark:text-orange-400 px-[10px] py-[3px] rounded-[6px] font-bold transition-colors hover:bg-[#ffd59e] dark:hover:bg-slate-600"
                    >
                      + Add Link
                    </button>
                  </div>
                  
                  {taskLinks.map((link, index) => (
                    <div key={index} className="flex gap-[8px] items-center w-full">
                      <input 
                        type="text" 
                        placeholder="Title (e.g. Codeforces)" 
                        className={`${inputStyles} flex-1 min-w-[100px]`} 
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
                        className={`${inputStyles} flex-[2] min-w-[150px]`} 
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
                        className="text-[#e34d4d] font-bold hover:text-[#be2323] px-2 text-lg"
                        title="Remove link"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="w-full flex justify-center mt-[13px]">
                  <button type="submit" className={`bg-[linear-gradient(90deg,#ff9100_50%,#ffb451_100%)] text-white border-none rounded-[9px] px-[30px] py-[9px] text-[1.1em] font-bold shadow-[0_1px_6px_#ffd08555] cursor-pointer transition-colors hover:bg-[#f27300] flex gap-[8px] items-center justify-center`}>
                    {editingTaskId ? 'Update Task' : 'Add Task'}
                  </button>
                  {editingTaskId && (
                    <button type="button" className="bg-[#f3f3f3] dark:bg-slate-700 border-none rounded-[8px] px-[16px] py-[8px] ml-[12px] text-[1em] font-medium text-[#333] dark:text-white cursor-pointer transition-colors hover:bg-[#e0e0e0] dark:hover:bg-slate-600" onClick={() => { setTaskName(''); setFactor('Easy'); setLastDate(''); setTaskLinks([]); setTaskTags([]); setEditingTaskId(null); }}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="w-[99vw] max-w-[900px] mx-auto rounded-[18px] shadow-[0_2px_14px_#ffe5a940] dark:shadow-none bg-[#fffbe7] dark:bg-slate-800 dark:border dark:border-slate-700 pt-[28px] px-[18px] pb-[22px] transition-colors duration-300">
              
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 mt-2">
                <div className="relative w-full sm:w-2/3">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                  <input 
                    type="text" 
                    placeholder="Search tasks, links, or #tags..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={`${inputStyles} w-full pl-10`}
                  />
                </div>
                <div className="w-full sm:w-1/3">
                  <select 
                    value={filterFactor} 
                    onChange={e => setFilterFactor(e.target.value)}
                    className={`${inputStyles} w-full`}
                  >
                    <option value="All">All Factors</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <h2 className="text-center font-bold text-[1.5rem] text-[#c57415] dark:text-orange-400 mb-[13px]">My Tasks</h2>
              <table className="w-full border-separate border-spacing-0 mt-[8px] rounded-[12px] shadow-[0_1px_10px_#ffd99a10] dark:shadow-none bg-[#fffdfa] dark:bg-slate-900 transition-colors duration-300 overflow-hidden">
                <thead>
                  <tr>
                    <th className={thStyles}>S.No.</th>
                    <th className={thStyles}>Task</th>
                    <th className={thStyles}>Factor</th>
                    <th className={thStyles}>Last Date</th>
                    <th className={thStyles}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActiveTasks.length === 0 &&(
                    <tr><td colSpan="5" className="py-[10px] px-[8px] text-center dark:text-slate-400">No matching tasks found.</td></tr>     
                  )}
                  {filteredActiveTasks.map((task, idx) => (
                    <tr key={task.id} className="group">
                      <td className={tdStyles}>{idx+1}.</td>
                      <td className={tdStyles}>
                        <div className="flex flex-col items-center justify-center gap-1">
                          <div className="flex items-center justify-center gap-2">
                            <span className={task.last_date === todayDate ? 'text-black dark:text-white font-bold' : 'text-black dark:text-slate-200'}>
                              {task.name}
                            </span>
                            
                            {task.links && task.links.length > 0 && (
                              <div className="relative group/tooltip inline-block align-middle cursor-help">
                                <span className="text-[0.8em] bg-[#e8f0fe] dark:bg-slate-700 text-[#065fd4] dark:text-blue-400 px-[6px] py-[2px] rounded-full font-bold border border-[#a4c2f4] dark:border-slate-600">
                                  🔗 {task.links.length}
                                </span>
                                
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-[8px] hidden group-hover/tooltip:flex flex-col gap-[6px] bg-[#333] dark:bg-black text-white text-[13px] rounded-[8px] p-[10px] z-10 w-max max-w-[250px] shadow-lg">
                                  {task.links.map((link, i) => (
                                    <a 
                                      key={i} 
                                      href={link.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-[#93c5fd] hover:text-[#bfdbfe] hover:underline text-left truncate block"
                                    >
                                      • {link.title || 'Link'}
                                    </a>
                                  ))}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#333] dark:border-t-black"></div>
                                </div>
                              </div>
                            )}
                          </div>
                          {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 justify-center">
                              {task.tags.map(tag => (
                                <span key={tag} className="bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className={tdStyles}><span className={`inline-block min-w-[71px] text-[.96em] font-bold text-white rounded-[16px] py-[3px] px-[17px] mr-[7px] tracking-[1px] align-middle ${getFactorClass(task.factor)}`}>{task.factor}</span></td>
                      <td className={tdStyles}>({formatDate(task.last_date)})</td>
                      <td className={tdStyles}>
                        <div className="flex gap-[10px] justify-center">
                          <button className="bg-transparent border-none text-[#065fd4] dark:text-blue-400 text-[1.15em] cursor-pointer py-[3px] px-[6px] transition-colors rounded-[6px] hover:text-[#004bb8] hover:bg-[#e8f0fe] dark:hover:bg-slate-700" onClick={() => handleEdit(task)} title="Edit">✏️</button>
                          <button className="bg-transparent border-none text-[#e34d4d] text-[1.2em] cursor-pointer py-[3px] px-[6px] transition-colors rounded-[6px] hover:text-[#be2323] hover:bg-[#fff0f0] dark:hover:bg-slate-700" onClick={() => handleDelete(task.id)} title="Delete">🗑️</button>
                          <button className="bg-transparent border-none text-[#2e7d32] dark:text-green-500 text-[1.25em] cursor-pointer py-[3px] px-[5px] transition-colors rounded-[6px] hover:text-[#0d540d] hover:bg-[#e8f5e9] dark:hover:bg-slate-700" onClick={() => handleComplete(task)} title="Mark as Complete">✔️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredCompletedTasks.length > 0 && (
              <div className="w-[99vw] max-w-[900px] mx-auto mt-[34px] rounded-[18px] shadow-[0_2px_14px_#ffe5a940] dark:shadow-none bg-[#fffbe7] dark:bg-slate-800 dark:border dark:border-slate-700 pt-[28px] px-[18px] pb-[22px] mb-[40px] transition-colors duration-300">
                <h2 className="text-center font-bold text-[1.5rem] text-[#c57415] dark:text-orange-400 mb-[13px]">Completed Tasks</h2>
                <table className="w-full border-separate border-spacing-0 mt-[8px] rounded-[12px] shadow-[0_1px_10px_#ffd99a10] dark:shadow-none bg-[#fffdfa] dark:bg-slate-900 transition-colors duration-300 overflow-hidden">
                  <thead>
                    <tr>
                      <th className={thStyles}>S.No.</th>
                      <th className={thStyles}>Task</th>
                      <th className={thStyles}>Factor</th>
                      <th className={thStyles}>Last Date</th>
                      <th className={thStyles}>Completion Date</th>
                      <th className={thStyles}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompletedTasks.map((task, idx) => (
                        <tr key={task.id} className="group">
                          <td className={tdStyles}>{idx + 1}.</td>
                          <td className={`${tdStyles} text-[#888] dark:text-slate-500`}>
                            <div className="flex flex-col items-center justify-center gap-1">
                              <span>✅ {task.name}</span>
                              {task.tags && task.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1 justify-center opacity-70">
                                  {task.tags.map(tag => (
                                    <span key={tag} className="bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className={tdStyles}><span className={`inline-block min-w-[71px] text-[.96em] font-bold text-white rounded-[16px] py-[3px] px-[17px] mr-[7px] tracking-[1px] align-middle ${getFactorClass(task.factor)}`}>{task.factor}</span></td>
                          <td className={tdStyles}>{formatDate(task.last_date)}</td>
                          <td className={tdStyles}>({task.completion_date ? formatDate(task.completion_date) : ''})</td>
                          <td className={tdStyles}>
                            <button className="bg-transparent border-none text-[1.15em] cursor-pointer py-[2px] px-[5px] text-[#f89c0e] hover:text-[#d37800] dark:hover:bg-slate-700 rounded transition-colors" onClick={() => handleUndoComplete(task)} title="Mark as Incomplete">↩️</button>
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
    </div>
  );
}

export default App;