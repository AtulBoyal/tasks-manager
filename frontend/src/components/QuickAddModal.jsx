import { useState, useEffect, useRef } from 'react';
import { parseQuickAdd } from '../utils/quickAddParser';
import { generateAutoTags } from '../utils/tagEngine';
import { getLocalDateString, parseLocalDate } from '../utils/formatters';

const PRIORITY_LABELS = {
  Urgent: '🔴 Urgent',
  Normal: '🟡 Normal',
  Later: '🟢 Later'
};

const RECURRENCE_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly'
};

const formatDeadline = (lastDate) => {
  if (!lastDate) return 'No deadline';

  const today = new Date();
  if (lastDate === getLocalDateString(today)) return 'Today';

  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (lastDate === getLocalDateString(tomorrow)) return 'Tomorrow';

  return parseLocalDate(lastDate).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: lastDate.slice(0, 4) === String(today.getFullYear()) ? undefined : 'numeric'
  });
};

const chipClass =
  "px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-50 dark:bg-slate-700 text-[#b06d0e] dark:text-orange-300 border border-orange-100 dark:border-slate-600";

function QuickAddPreview({ text }) {
  const parsed = parseQuickAdd(text);
  const tags = generateAutoTags(parsed.name, parsed.tags);

  return (
    <div
      role="status"
      aria-label="Quick add preview"
      className="mt-3 rounded-[10px] border border-dashed border-orange-200 dark:border-slate-600 px-3 py-2"
    >
      <p className="text-sm text-slate-800 dark:text-slate-100 truncate">
        <span className="text-slate-500 dark:text-slate-400">Will add: </span>
        <span className="font-semibold">{parsed.name}</span>
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className={chipClass}>📅 {formatDeadline(parsed.lastDate)}</span>
        <span className={chipClass}>{PRIORITY_LABELS[parsed.factor || 'Normal']}</span>
        {parsed.recurrence !== 'none' && (
          <span className={chipClass}>🔁 {RECURRENCE_LABELS[parsed.recurrence]}</span>
        )}
        {tags.map((tag) => (
          <span key={tag} className={chipClass}>#{tag}</span>
        ))}
        {parsed.links.map((link) => (
          <span key={link.url} className={chipClass}>🔗 {link.title}</span>
        ))}
      </div>
    </div>
  );
}

function QuickAddModal({ isOpen, onClose, onQuickAdd }) {
  const [taskName, setTaskName] = useState('');
  const inputRef = useRef(null);

  // Auto-focus the input when the modal opens
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
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
        role="dialog"
        aria-modal="true"
        aria-label="Quick Add Task"
        className="bg-[#fffdfa] dark:bg-slate-800 w-full max-w-[500px] rounded-[16px] shadow-[0_10px_40px_rgba(0,0,0,0.2)] dark:shadow-black/50 overflow-hidden border border-orange-100 dark:border-slate-700 animate-in fade-in zoom-in duration-200"
      >
        <div className="px-6 py-4 border-b border-orange-50 dark:border-slate-700 flex justify-between items-center bg-[#fff8e1]/50 dark:bg-slate-800/50">
          <h3 className="font-bold text-[#cc6000] dark:text-orange-400">⚡ Quick Add Task</h3>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-red-500 transition-colors text-xl font-bold leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <input
            ref={inputRef}
            type="text"
            aria-label="Task"
            placeholder="e.g. submit lab friday !urgent #os"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            className="w-full px-4 py-3 rounded-[10px] border-[1.5px] border-[#ffd180] dark:border-slate-600 bg-[#fff9f2] dark:bg-slate-700 text-[1.1em] text-black dark:text-white outline-none focus:border-[#f57c00] focus:dark:border-orange-500 shadow-inner transition-colors"
          />

          {taskName.trim() && <QuickAddPreview text={taskName} />}

          <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Dates: <code>today</code>, <code>tomorrow</code>, <code>friday</code>, <code>in 3 days</code>, <code>5 dec</code>
            {' · '}Priority: <code>!urgent</code> <code>!later</code>
            {' · '}Tags: <code>#os</code>
            {' · '}Repeat: <code>every monday</code>
          </p>

          <div className="mt-2 flex justify-end text-xs text-slate-500 dark:text-slate-400">
            <span className="hidden sm:inline">Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600">Enter</kbd> to add, <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600">Esc</kbd> to cancel</span>
          </div>
        </form>
      </div>
    </div>
  );
}

export default QuickAddModal;
