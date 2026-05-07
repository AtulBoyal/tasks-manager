import React from 'react';

function Header({ isDarkMode, setIsDarkMode }) {
  return (
    <header className="w-full flex justify-between items-center p-4 sm:p-6 mb-2 max-w-[900px] mx-auto">
      <div className="flex flex-1 items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 drop-shadow-sm">
          Tasks Manager
        </h1>
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