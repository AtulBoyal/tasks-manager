import React from 'react';

function FilterBar({
  searchQuery, setSearchQuery,
  filterStatus, setFilterStatus,
  filterFactor, setFilterFactor,
  filterDate, setFilterDate
}) {
  const inputStyles = "px-[13px] py-[8px] rounded-[9px] border-[1.2px] border-[#ffd180] dark:border-slate-600 bg-[#fff9f2] dark:bg-slate-700 min-w-[135px] text-[1em] text-black dark:text-white outline-none transition-colors shadow-[inset_0_1px_4px_#fff6ed80] focus:border-[#ffb935] focus:dark:border-orange-400 focus:bg-[#fffbf1] focus:dark:bg-slate-600";

  return (
    <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-6 mt-2">
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
      
      <div className="flex flex-wrap md:flex-nowrap w-full md:w-auto gap-3">
        <div className="w-[calc(50%-6px)] md:w-auto">
          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
            className={`${inputStyles} w-full min-w-[130px] cursor-pointer`}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Completed">Completed Only</option>
          </select>
        </div>

        <div className="w-[calc(50%-6px)] md:w-auto">
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
        
        <div className="w-full md:w-auto relative group flex items-center">
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
  );
}

export default FilterBar;