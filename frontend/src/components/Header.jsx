import React from 'react';

function Header({ isDarkMode, setIsDarkMode, isSyncing, hasUnsavedChanges }) {
  return (
    <header className="w-full flex justify-between items-center p-4 sm:p-6 mb-2 max-w-[900px] mx-auto">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 drop-shadow-sm">
          Tasks Manager
        </h1>
        
        {/* ✨ NEW: Passive Real-Time Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/50 dark:bg-slate-800/50 border border-orange-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm">
          {isSyncing ? (
            <><span className="animate-spin inline-block">⏳</span> Saving...</>
          ) : hasUnsavedChanges ? (
            <><span className="text-amber-500 text-[10px]">⬤</span> Offline</>
          ) : (
            <><span className="text-green-500 text-[10px] animate-pulse">⬤</span> Live</>
          )}
        </div>
      </div>

      <button
        onClick={() => setIsDarkMode(!isDarkMode)}
        className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 shadow-md border border-orange-100 dark:border-slate-700 text-xl hover:scale-105 transition-transform"
        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDarkMode ? '🌙' : '☀️'}
      </button>
    </header>
  );
}

export default Header;