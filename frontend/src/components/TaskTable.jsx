import React from 'react';

function TaskTable({
  tasks,
  isCompleted,
  todayDate,
  targetDate, // ✨ NEW PROP
  formatDate,
  getFactorClass,
  handleInlineUpdate,
  handleEdit,
  handleDelete,
  handleComplete,
  handleUndoComplete
}) {
  const thStyles = "py-[10px] px-[9px] bg-[#ffe6ba] dark:bg-slate-800 text-[#b06d0e] dark:text-orange-400 text-[15.5px] font-[750] border-b-[2px] border-b-[#ffd59e] dark:border-b-slate-700 last:pr-0";
  const tdStyles = "block md:table-cell py-1.5 md:py-[10px] px-0 md:px-[8px] border-b border-orange-50/50 dark:border-slate-700/50 md:border-b-[1.2px] last:border-0 md:group-last:border-b-0 text-black dark:text-slate-200 text-left md:text-center";

  return (
    <table className="w-full block md:table mt-[8px] md:border-separate md:border-spacing-0 md:rounded-[12px] md:shadow-[0_1px_10px_#ffd99a10] md:dark:shadow-none md:bg-[#fffdfa] md:dark:bg-slate-900 transition-colors duration-300">
      <thead className="hidden md:table-header-group">
        <tr>
          <th className={thStyles}>S.No.</th>
          <th className={thStyles}>Task</th>
          <th className={thStyles}>Priority</th>
          <th className={thStyles}>Last Date</th>
          {isCompleted && <th className={thStyles}>Completion Date</th>}
          <th className={thStyles}>Action</th>
        </tr>
      </thead>
      <tbody className="block md:table-row-group">
        {tasks.length === 0 &&(
          <tr className="block md:table-row">
            <td colSpan={isCompleted ? "6" : "5"} className="block md:table-cell py-[20px] px-[8px] text-center dark:text-slate-400">
              No matching {isCompleted ? 'completed' : 'active'} tasks found.
            </td>
          </tr>     
        )}
        {tasks.map((task, idx) => {
          
          // ✨ NEW: Highlight Logic!
          const isTarget = !isCompleted && task.last_date === targetDate;
          const highlightClasses = isTarget
            ? "ring-2 ring-orange-400 dark:ring-orange-500 bg-orange-50/80 dark:bg-slate-700/80 shadow-md md:shadow-none transform md:scale-[1.01]"
            : "border border-orange-100 dark:border-slate-700 md:border-none bg-white dark:bg-slate-800 md:bg-transparent shadow-sm md:shadow-none hover:bg-slate-50 dark:hover:bg-slate-700";

          return (
          <tr key={task.id} className={`block md:table-row rounded-[10px] md:rounded-none mb-2.5 md:mb-0 p-3 md:p-0 transition-all duration-200 group ${highlightClasses} ${isCompleted ? 'opacity-80 md:opacity-100' : ''}`}>
            
            <td className={`${tdStyles} hidden md:table-cell`}>{idx+1}.</td>
            
            {/* TASK NAME & TAGS */}
            <td className={`${tdStyles} flex flex-col items-start md:items-center ${isCompleted ? 'text-[#888] dark:text-slate-500' : ''}`}>
              <div className="flex flex-wrap items-center gap-2 mb-1 md:mb-0">
                <span className={isTarget ? 'text-black dark:text-white font-extrabold text-base' : `text-black dark:text-slate-200 text-base ${isCompleted ? '' : 'font-semibold md:font-normal'}`}>
                  {isCompleted ? <>✅ <span className="line-through md:no-underline">{task.name}</span></> : task.name}
                </span>
                
                {task.links && task.links.length > 0 && (
                  <div className="relative group/tooltip inline-block align-middle cursor-help">
                    <span className="text-[0.7em] bg-[#e8f0fe] dark:bg-slate-700 text-[#065fd4] dark:text-blue-400 px-[5px] py-[1px] rounded-full font-bold border border-[#a4c2f4] dark:border-slate-600">
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
                <div className={`flex flex-wrap gap-1 mt-0.5 justify-start md:justify-center ${isCompleted ? 'opacity-70' : ''}`}>
                  {task.tags.map(tag => (
                    <span key={tag} className="bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide">#{tag}</span>
                  ))}
                </div>
              )}
            </td>

            {/* PRIORITY */}
            <td className={`${tdStyles} !border-none md:!border-b-[1.2px] inline-block w-1/2 md:w-auto align-top`}>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-1 md:justify-center">
                <span className="md:hidden font-bold text-[#b06d0e] dark:text-orange-400 text-[10px] uppercase tracking-wider">Priority</span>
                {isCompleted ? (
                  <span className={`inline-block text-[.85em] md:text-[.96em] font-bold text-white rounded-[12px] md:rounded-[16px] py-[2px] md:py-[3px] px-[10px] md:px-[17px] tracking-[0.5px] align-middle opacity-80 md:opacity-100 ${getFactorClass(task.factor)}`}>{task.factor}</span>
                ) : (
                  <div className="relative inline-block" title="Click to change priority">
                    <select
                      value={task.factor}
                      onChange={(e) => handleInlineUpdate(task.id, 'factor', e.target.value)}
                      className={`appearance-none cursor-pointer outline-none inline-block text-[.85em] md:text-[.96em] font-bold text-white rounded-[12px] md:rounded-[16px] py-[2px] md:py-[3px] px-[10px] md:px-[17px] tracking-[0.5px] text-center transition-opacity hover:opacity-85 shadow-sm border border-transparent hover:border-white/50 ${getFactorClass(task.factor)}`}
                    >
                      <option value="Urgent" className="bg-red-500 text-white">Urgent</option>
                      <option value="Normal" className="bg-amber-500 text-white">Normal</option>
                      <option value="Later" className="bg-emerald-500 text-white">Later</option>
                    </select>
                  </div>
                )}
              </div>
            </td>

            {/* DEADLINE */}
            <td className={`${tdStyles} !border-none md:!border-b-[1.2px] inline-block w-1/2 md:w-auto align-top`}>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-1 md:justify-center">
                <span className="md:hidden font-bold text-[#b06d0e] dark:text-orange-400 text-[10px] uppercase tracking-wider">Deadline</span>
                {isCompleted ? (
                  <span className="text-sm md:text-base">{formatDate(task.last_date)}</span>
                ) : (
                  <div className="relative inline-flex items-center justify-center cursor-pointer group/date" title="Click to change date">
                    <span className="text-sm md:text-base border-b border-dashed border-gray-400 dark:border-gray-500 group-hover/date:border-[#c57415] dark:group-hover/date:border-orange-400 group-hover/date:text-[#c57415] dark:group-hover/date:text-orange-400 transition-colors">
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
                )}
              </div>
            </td>

            {/* COMPLETION DATE */}
            {isCompleted && (
              <td className={`${tdStyles} !border-none md:!border-b-[1.2px] block w-full md:w-auto align-top mt-1 md:mt-0`}>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-1 md:justify-center">
                  <span className="md:hidden font-bold text-[#b06d0e] dark:text-orange-400 text-[10px] uppercase tracking-wider">Completed On</span>
                  <span className="text-sm md:text-base text-slate-500">{task.completion_date ? formatDate(task.completion_date) : ''}</span>
                </div>
              </td>
            )}

            {/* ACTIONS */}
            <td className={`${tdStyles} block w-full md:w-auto md:table-cell pt-2 md:pt-[10px] mt-1 md:mt-0 border-t border-orange-50 dark:border-slate-700 md:border-none`}>
              {isCompleted ? (
                <button className="w-full md:w-auto bg-orange-50 dark:bg-slate-700/50 md:bg-transparent border-none text-[1.15em] cursor-pointer py-[4px] px-[12px] md:px-[5px] text-[#f89c0e] hover:text-[#d37800] dark:hover:bg-slate-600 rounded-lg transition-colors flex items-center justify-center gap-2" onClick={() => handleUndoComplete(task)} title="Mark as Incomplete">
                  ↩️ <span className="md:hidden text-sm font-bold">Undo Complete</span>
                </button>
              ) : (
                <div className="flex gap-[8px] md:gap-[10px] justify-between md:justify-center bg-orange-50/30 dark:bg-slate-700/30 md:bg-transparent px-2 py-1 rounded-lg">
                  <button className="flex-1 md:flex-none bg-white md:bg-transparent border border-orange-100 md:border-none shadow-sm md:shadow-none text-[#065fd4] dark:text-blue-400 text-[1.2em] md:text-[1.15em] cursor-pointer py-[4px] md:py-[3px] px-[6px] transition-colors rounded-[6px] hover:text-[#004bb8] hover:bg-[#e8f0fe] dark:hover:bg-slate-600 dark:bg-slate-700 dark:border-slate-600" onClick={() => handleEdit(task)} title="Full Edit">✏️</button>
                  <button className="flex-1 md:flex-none bg-white md:bg-transparent border border-red-100 md:border-none shadow-sm md:shadow-none text-[#e34d4d] text-[1.2em] cursor-pointer py-[4px] md:py-[3px] px-[6px] transition-colors rounded-[6px] hover:text-[#be2323] hover:bg-[#fff0f0] dark:hover:bg-slate-600 dark:bg-slate-700 dark:border-slate-600" onClick={() => handleDelete(task.id)} title="Delete">🗑️</button>
                  <button className="flex-[2] md:flex-none bg-[#e8f5e9] md:bg-transparent border border-green-200 md:border-none shadow-sm md:shadow-none text-[#2e7d32] dark:text-green-500 text-[1.2em] md:text-[1.25em] cursor-pointer py-[4px] md:py-[3px] px-[5px] transition-colors rounded-[6px] hover:text-[#0d540d] hover:bg-[#c8e6c9] dark:hover:bg-slate-600 dark:bg-green-900/40 dark:border-green-800" onClick={() => handleComplete(task)} title="Mark as Complete">
                    ✔️ <span className="md:hidden text-sm font-bold ml-1">Done</span>
                  </button>
                </div>
              )}
            </td>
          </tr>
        );})}
      </tbody>
    </table>
  );
}

export default TaskTable;