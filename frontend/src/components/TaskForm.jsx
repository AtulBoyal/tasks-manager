import React from 'react';
import { generateAutoTags } from '../utils/tagEngine';

function TaskForm({
  taskName, setTaskName,
  factor, setFactor,
  lastDate, setLastDate, todayDate,
  currentTagInput, setCurrentTagInput, handleAddTag,
  taskTags, setTaskTags,
  taskLinks, setTaskLinks,
  subtasks, setSubtasks, currentSubtaskInput, setCurrentSubtaskInput,
  editingTaskId, setEditingTaskId,
  handleSubmit,
  recurrence, setRecurrence
}) {
  
  const inputStyles = "px-[13px] py-[8px] rounded-[9px] border-[1.2px] border-[#ffd180] dark:border-slate-600 bg-[#fff9f2] dark:bg-slate-700 min-w-[135px] text-[1em] text-black dark:text-white outline-none transition-colors shadow-[inset_0_1px_4px_#fff6ed80] focus:border-[#ffb935] focus:dark:border-orange-400 focus:bg-[#fffbf1] focus:dark:bg-slate-600";

  return (
    <div className="w-[92vw] max-w-[512px] rounded-[21px] mb-[29px] shadow-[0_7px_36px_#ff944740] dark:shadow-none px-[20px] sm:px-[28px] pt-[34px] pb-[24px] backdrop-blur-[2.5px] bg-[linear-gradient(107deg,#ffd59e_58%,#ffe7cc_100%)] dark:bg-none dark:bg-slate-800 dark:border dark:border-slate-700 transition-colors duration-300">
      <h2 className="text-center font-extrabold text-[2rem] mb-[22px] text-[#cc6000] dark:text-orange-500 tracking-[1px]">
        {editingTaskId ? '✏️ Update Task' : 'Add a New Task'}
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-y-[14px] items-center justify-center">
        
        <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center justify-between sm:justify-start gap-[9px]">
          <label className="min-w-[62px] font-semibold text-[#bf6700] dark:text-orange-400 self-start sm:self-auto">Task: </label>
          <input 
            type="text" 
            className={`${inputStyles} w-full sm:w-auto`} 
            value={taskName} 
            onChange={e => setTaskName(e.target.value)} 
            // ✨ ADD THIS onBlur EVENT:
            onBlur={() => {
              const autoTags = generateAutoTags(taskName);
              // Merge auto-tags with any tags the user already typed manually
              setTaskTags(prev => Array.from(new Set([...prev, ...autoTags])));
            }}
            required 
          />
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

        {/* ✨ ADVANCED RECURRENCE DROPDOWN */}
        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-[12px] mt-1 mb-2 bg-white/40 dark:bg-slate-900/40 px-3 py-2 rounded-lg border border-orange-100 dark:border-slate-700">
          <label className="font-bold text-[#c57415] dark:text-orange-400 flex items-center gap-2 text-sm">
            <span>🔁</span> Recurrence:
            <select 
              value={recurrence} 
              onChange={(e) => setRecurrence(e.target.value)}
              className="ml-1 bg-transparent border-b border-orange-200 dark:border-slate-600 focus:border-orange-500 outline-none text-black dark:text-white font-semibold cursor-pointer"
            >
              <option value="none" className="bg-white dark:bg-slate-800">None (One-off)</option>
              <option value="daily" className="bg-white dark:bg-slate-800">Daily</option>
              <option value="weekly" className="bg-white dark:bg-slate-800">Weekly</option>
              <option value="monthly" className="bg-white dark:bg-slate-800">Monthly</option>
            </select>
          </label>
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

        {/* ✨ NEW SUBTASKS SECTION */}
        <div className="w-full flex flex-col gap-[10px] mt-[5px]">
          <div className="flex flex-col sm:flex-row items-center gap-[9px] justify-between sm:justify-center px-1 mb-1">
            <label className="font-semibold text-[#bf6700] dark:text-orange-400 self-start sm:self-auto text-sm sm:text-base">Sub-tasks (Steps):</label>
            <div className="flex gap-2 w-full sm:w-auto">
              <input 
                type="text" 
                placeholder="e.g. Write test cases..." 
                className={`${inputStyles} w-full sm:min-w-[200px] flex-1`} 
                value={currentSubtaskInput}
                onChange={e => setCurrentSubtaskInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (currentSubtaskInput.trim()) {
                      setSubtasks([...subtasks, { id: Date.now(), title: currentSubtaskInput.trim(), completed: false }]);
                      setCurrentSubtaskInput('');
                    }
                  }
                }}
              />
              <button 
                type="button" 
                onClick={() => {
                  if (currentSubtaskInput.trim()) {
                    setSubtasks([...subtasks, { id: Date.now(), title: currentSubtaskInput.trim(), completed: false }]);
                    setCurrentSubtaskInput('');
                  }
                }}
                className="text-[0.85em] bg-[#ffe6ba] dark:bg-slate-700 text-[#b06d0e] dark:text-orange-400 px-[12px] py-2 sm:py-0 rounded-[6px] font-bold transition-colors hover:bg-[#ffd59e] dark:hover:bg-slate-600"
              >
                Add Step
              </button>
            </div>
          </div>
          
          {subtasks.length > 0 && (
            <div className="flex flex-col gap-2 w-full bg-white/30 dark:bg-slate-900/30 p-3 rounded-lg">
              {subtasks.map((st) => (
                <div key={st.id} className="flex justify-between items-center bg-[#fffbf1] dark:bg-slate-800 p-2 rounded border border-orange-100 dark:border-slate-700">
                  <span className="text-sm dark:text-slate-200 text-left flex-1">• {st.title}</span>
                  <button type="button" onClick={() => setSubtasks(subtasks.filter(s => s.id !== st.id))} className="text-red-500 hover:text-red-700 font-bold px-2">✕</button>
                </div>
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
  );
}

export default TaskForm;