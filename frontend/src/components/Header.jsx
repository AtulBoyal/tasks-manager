import React from 'react';

function Header({ 
  hasUnsavedChanges, 
  isDarkMode, 
  setIsDarkMode, 
  handleSyncToCloud, 
  isSyncing 
}) {
  return (
    <div className="w-[92vw] max-w-[900px] flex flex-col sm:flex-row justify-between items-center mt-[20px] mb-[10px] px-[10px] gap-4">
      <div className="flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${hasUnsavedChanges ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
        <span className="font-semibold text-[#c57415] dark:text-orange-400 text-center sm:text-left">
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
          className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-white shadow-md transition-all ${!hasUnsavedChanges ? 'bg-gray-400 dark:bg-slate-600 cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'}`}
        >
          {isSyncing && <span className="animate-spin inline-block w-[14px] h-[14px] border-[2px] border-[rgba(255,255,255,0.3)] border-t-white rounded-full"></span>}
          {isSyncing ? 'Syncing...' : '☁️ Sync to Cloud'}
        </button>
      </div>
    </div>
  );
}

export default Header;