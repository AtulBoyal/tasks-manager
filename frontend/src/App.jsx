// App.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { apiStorage } from './githubStorage';

function App() {
  const [taskName, setTaskName] = useState('');
  const [factor, setFactor] = useState('Easy');
  const [lastDate, setLastDate] = useState('');
  const [tasks, setTasks] = useState([]);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordOk, setPasswordOk] = useState(false);
  
  // New States for Local-First Architecture
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const { tasks } = await apiStorage.getTasks(enteredPassword);
      setTasks(tasks || []);
      setHasUnsavedChanges(false); // Reset unsaved status on fresh fetch
    } catch (error) {
      console.error(error);
    }
  }, [enteredPassword]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await fetchTasks();
      setPasswordOk(true);
    } catch (error) {
      alert("Wrong password! Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (passwordOk) {
      fetchTasks();
    }
  }, [passwordOk, fetchTasks]);

  // --- LOCAL MUTATION HELPERS ---
  // These update React state instantly instead of calling the API
  const updateLocalTasks = (newTasks) => {
    setTasks(newTasks);
    setHasUnsavedChanges(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let updatedTasks;
    if (editingTaskId) {
      updatedTasks = tasks.map(t => 
        t.id === editingTaskId ? { ...t, name: taskName, factor, last_date: lastDate } : t
      );
    } else {
      const newTask = {
        id: Date.now(),
        name: taskName,
        factor: factor,
        last_date: lastDate,
        completed: false
      };
      updatedTasks = [...tasks, newTask];
    }

    updateLocalTasks(updatedTasks);
    setTaskName(''); setFactor('Easy'); setLastDate(''); setEditingTaskId(null);
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

  // --- THE NEW SYNC FUNCTION ---
  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    try {
      await apiStorage.saveTasks(tasks, enteredPassword);
      setHasUnsavedChanges(false); // Mark as safely stored!
    } catch (error) {
      console.error('Error syncing tasks:', error);
      alert('Failed to sync. Please try again.');
    } finally {
      setIsSyncing(false);
    }
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

  const sortedTasks = [...tasks]
    .filter(task => !task.completed)
    .sort((a,b) =>{
      const dateA = new Date(a.last_date);
      const dateB = new Date(b.last_date);
      if(dateA < dateB) return -1;
      if(dateA > dateB) return 1;
      return difficultyOrder[a.factor] - difficultyOrder[b.factor];
    });

  const todayDate = new Date().toISOString().split('T')[0];

  const inputStyles = "px-[13px] py-[8px] rounded-[9px] border-[1.2px] border-[#ffd180] bg-[#fff9f2] min-w-[135px] text-[1em] outline-none transition-colors shadow-[inset_0_1px_4px_#fff6ed80] focus:border-[#ffb935] focus:bg-[#fffbf1]";
  const thStyles = "py-[10px] px-[9px] bg-[#ffe6ba] text-[#b06d0e] text-[15.5px] font-[750] border-b-[2px] border-b-[#ffd59e] last:pr-0";
  const tdStyles = "py-[10px] px-[8px] border-b-[1.2px] border-b-[#ffe0b0] text-center group-last:border-b-0";

  return (
    <div className="min-h-screen font-sans m-0 p-0 bg-[linear-gradient(135deg,#f7fafc_24%,#ffe5c2_100%)]">
      {!passwordOk ? (
        <div className="flex flex-col items-center justify-center h-[80vh]">
          <div className="bg-[#fff8e1] py-[2rem] px-[3rem] rounded-[12px] shadow-[0_8px_16px_rgba(0,0,0,0.2)] w-[320px] text-center">
            <h2 className="mb-[1.2rem] text-[#f57c00] font-semibold text-xl">Enter Password to View Tasks</h2>
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                className="w-full p-[0.7rem] text-[1rem] border-[2px] border-[#f57c00] rounded-[8px] mb-[1rem] outline-offset-2 outline-none transition-colors focus:border-[#ef6c00]"
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
            
            {/* --- SYNC HEADER COMPONENT --- */}
            <div className="w-[92vw] max-w-[900px] flex justify-between items-center mt-[20px] mb-[10px] px-[10px]">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${hasUnsavedChanges ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
                <span className="font-semibold text-[#c57415]">
                  {hasUnsavedChanges ? 'Unsaved Local Changes' : 'All Data Synced'}
                </span>
              </div>
              
              <button 
                onClick={handleSyncToCloud}
                disabled={!hasUnsavedChanges || isSyncing}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-white shadow-md transition-all 
                  ${!hasUnsavedChanges ? 'bg-gray-400 cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'}`}
              >
                {isSyncing && <span className="animate-spin inline-block w-[14px] h-[14px] border-[2px] border-[rgba(255,255,255,0.3)] border-t-white rounded-full"></span>}
                {isSyncing ? 'Syncing to Cloud...' : '☁️ Sync to Cloud'}
              </button>
            </div>
            {/* --------------------------- */}

            <div className="w-[92vw] max-w-[512px] rounded-[21px] mb-[29px] shadow-[0_7px_36px_#ff944740] px-[28px] pt-[34px] pb-[24px] backdrop-blur-[2.5px] bg-[linear-gradient(107deg,#ffd59e_58%,#ffe7cc_100%)]">
              <h2 className="text-center font-extrabold text-[2rem] mb-[22px] text-[#cc6000] tracking-[1px]">
                {editingTaskId ? '✏️ Update Task' : 'Add a New Task'}
              </h2>
              <form onSubmit={handleSubmit} className="flex flex-wrap gap-y-[14px] gap-x-[22px] items-center justify-center flex-row">
                <div className="flex items-center gap-[9px]">
                  <label className="min-w-[62px] font-semibold text-[#bf6700]">Task: </label>
                  <input type="text" className={inputStyles} value={taskName} onChange={e => setTaskName(e.target.value)} required />
                </div>
                <div className="flex items-center gap-[9px]">
                  <label className="min-w-[62px] font-semibold text-[#bf6700]">Factor:</label><br/>
                  <select className={inputStyles} value={factor} onChange={e => setFactor(e.target.value)}>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div className="flex items-center gap-[9px]">
                  <label className="min-w-[62px] font-semibold text-[#bf6700]">Last Date: </label>
                  <input type="date" className={inputStyles} value={lastDate} min={todayDate} onChange={e => setLastDate(e.target.value)} required />
                </div>
                <div className="w-full flex justify-center mt-[13px]">
                  <button type="submit" className={`bg-[linear-gradient(90deg,#ff9100_50%,#ffb451_100%)] text-white border-none rounded-[9px] px-[30px] py-[9px] text-[1.1em] font-bold shadow-[0_1px_6px_#ffd08555] cursor-pointer transition-colors hover:bg-[#f27300] flex gap-[8px] items-center justify-center`}>
                    {editingTaskId ? 'Update Task' : 'Add Task'}
                  </button>
                  {editingTaskId && (
                    <button type="button" className="bg-[#f3f3f3] border-none rounded-[8px] px-[16px] py-[8px] ml-[12px] text-[1em] font-medium text-[#333] cursor-pointer transition-colors hover:bg-[#e0e0e0]" onClick={() => { setTaskName(''); setFactor('Easy'); setLastDate(''); setEditingTaskId(null); }}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="w-[99vw] max-w-[900px] mx-auto rounded-[18px] shadow-[0_2px_14px_#ffe5a940] bg-[#fffbe7] pt-[28px] px-[18px] pb-[22px]">
              <h2 className="text-center font-bold text-[1.5rem] text-[#c57415] mb-[13px]">My Tasks</h2>
              <table className="w-full border-separate border-spacing-0 mt-[8px] rounded-[12px] shadow-[0_1px_10px_#ffd99a10] bg-[#fffdfa]">
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
                  {sortedTasks.length === 0 &&(
                    <tr><td colSpan="5" className="py-[10px] px-[8px] text-center">No tasks added.</td></tr>     
                  )}
                  {sortedTasks.map((task, idx) => (
                    <tr key={task.id} className="group">
                      <td className={tdStyles}>{idx+1}.</td>
                      <td className={tdStyles}><span className={task.last_date === todayDate ? 'text-black font-bold' : ''}>{task.name}</span></td>
                      <td className={tdStyles}><span className={`inline-block min-w-[71px] text-[.96em] font-bold text-white rounded-[16px] py-[3px] px-[17px] mr-[7px] tracking-[1px] align-middle ${getFactorClass(task.factor)}`}>{task.factor}</span></td>
                      <td className={tdStyles}>({formatDate(task.last_date)})</td>
                      <td className={tdStyles}>
                        <div className="flex gap-[10px] justify-center">
                          <button className="bg-transparent border-none text-[#065fd4] text-[1.15em] cursor-pointer py-[3px] px-[6px] transition-colors rounded-[6px] hover:text-[#004bb8] hover:bg-[#e8f0fe]" onClick={() => handleEdit(task)} title="Edit">✏️</button>
                          <button className="bg-transparent border-none text-[#e34d4d] text-[1.2em] cursor-pointer py-[3px] px-[6px] transition-colors rounded-[6px] hover:text-[#be2323] hover:bg-[#fff0f0]" onClick={() => handleDelete(task.id)} title="Delete">🗑️</button>
                          <button className="bg-transparent border-none text-[#2e7d32] text-[1.25em] cursor-pointer py-[3px] px-[5px] transition-colors rounded-[6px] hover:text-[#0d540d] hover:bg-[#e8f5e9]" onClick={() => handleComplete(task)} title="Mark as Complete">✔️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {tasks.some(task => task.completed) && (
              <div className="w-[99vw] max-w-[900px] mx-auto mt-[34px] rounded-[18px] shadow-[0_2px_14px_#ffe5a940] bg-[#fffbe7] pt-[28px] px-[18px] pb-[22px] mb-[40px]">
                <h2 className="text-center font-bold text-[1.5rem] text-[#c57415] mb-[13px]">Completed Tasks</h2>
                <table className="w-full border-separate border-spacing-0 mt-[8px] rounded-[12px] shadow-[0_1px_10px_#ffd99a10] bg-[#fffdfa]">
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
                    {[...tasks]
                      .filter(task => task.completed)
                      .sort((a, b) => {
                        const dateA = new Date(a.last_date);
                        const dateB = new Date(b.last_date);
                        if (dateA < dateB) return 1;
                        if (dateA > dateB) return -1;
                        return difficultyOrder[a.factor] - difficultyOrder[b.factor];
                      })
                      .map((task, idx) => (
                        <tr key={task.id} className="group">
                          <td className={tdStyles}>{idx + 1}.</td>
                          <td className={`${tdStyles} text-[#888]`}>✅ {task.name}</td>
                          <td className={tdStyles}><span className={`inline-block min-w-[71px] text-[.96em] font-bold text-white rounded-[16px] py-[3px] px-[17px] mr-[7px] tracking-[1px] align-middle ${getFactorClass(task.factor)}`}>{task.factor}</span></td>
                          <td className={tdStyles}>{formatDate(task.last_date)}</td>
                          <td className={tdStyles}>({task.completion_date ? formatDate(task.completion_date) : ''})</td>
                          <td className={tdStyles}>
                            <button className="bg-transparent border-none text-[1.15em] cursor-pointer py-[2px] px-[5px] text-[#f89c0e] hover:text-[#d37800]" onClick={() => handleUndoComplete(task)} title="Mark as Incomplete">↩️</button>
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