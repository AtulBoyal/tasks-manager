import { useRef, useState } from 'react';
import toast from 'react-hot-toast';

// Toast body with an Undo button. Used through showUndoToast() in useTaskActions.
export default function UndoToast({ toastId, message, onUndo }) {
  // A ref (not state) so a second click in the same tick is also ignored
  const usedRef = useRef(false);
  const [isUndone, setIsUndone] = useState(false);

  const undo = () => {
    if (usedRef.current) return;
    usedRef.current = true;
    setIsUndone(true);
    toast.dismiss(toastId);
    onUndo();
  };

  return (
    <span className="flex items-center gap-4">
      <span>{message}</span>
      <button
        type="button"
        onClick={undo}
        disabled={isUndone}
        className="font-bold text-orange-600 hover:text-orange-700 hover:underline disabled:opacity-50"
      >
        Undo
      </button>
    </span>
  );
}
