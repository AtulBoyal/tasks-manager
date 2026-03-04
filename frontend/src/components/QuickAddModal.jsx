import React, { useState, useEffect, useRef } from 'react';

function QuickAddModal({ isOpen, onClose, onQuickAdd, isDarkMode }) {
  const [taskName, setTaskName] = useState('');
  const inputRef = useRef(null);

  // Auto-focus the input when the modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 50);
    }
  }, [isOpen]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (taskName.trim()) {
      onQuickAdd(taskName.trim());
      setTaskName('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
      <div 
        className="bg-[#fffdfa] dark:bg-slate-800 w-full max-w-[500px] rounded-[16px] shadow-[0_10px_40px_rgba(0,0,0,0.2)] dark:shadow-black/50 overflow-hidden border border-orange-100 dark:border-slate-700 animate-in fade-in zoom-in duration-200"
      >
        <div className="px-6 py-4 border-b border-orange-50 dark:border-slate-700 flex justify-between items-center bg-[#fff8e1]/50 dark:bg-slate-800/50">
          <h3 className="font-bold text-[#cc6000] dark:text-orange-400">⚡ Quick Add Task</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors text-xl font-bold leading-none">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <input
            ref={inputRef}
            type="text"
            placeholder="What needs to be done? (Hit Enter to save)"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            className="w-full px-4 py-3 rounded-[10px] border-[1.5px] border-[#ffd180] dark:border-slate-600 bg-[#fff9f2] dark:bg-slate-700 text-[1.1em] text-black dark:text-white outline-none focus:border-[#f57c00] focus:dark:border-orange-500 shadow-inner transition-colors"
          />
          <div className="mt-4 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
            <span>Defaults to 🟡 Normal & Today</span>
            <span className="hidden sm:inline">Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600">Esc</kbd> to cancel</span>
          </div>
        </form>
      </div>
    </div>
  );
}

export default QuickAddModal;