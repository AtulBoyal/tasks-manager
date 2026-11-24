import { useCallback, useState } from 'react';
import QuickAddModal from './QuickAddModal';
import { useTaskContext } from '../context/TaskContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

// Ctrl/Cmd+K opens Quick Add from any page while the vault is unlocked.
export default function QuickAddLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const { handleQuickAdd } = useTaskContext();

  useKeyboardShortcuts({ setIsQuickAddOpen: setIsOpen });

  const close = useCallback(() => setIsOpen(false), []);

  return (
    <QuickAddModal
      isOpen={isOpen}
      onClose={close}
      onQuickAdd={handleQuickAdd}
    />
  );
}
