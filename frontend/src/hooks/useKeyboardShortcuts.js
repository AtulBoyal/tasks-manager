import { useEffect } from 'react';

export const useKeyboardShortcuts = ({
  setIsQuickAddOpen
}) => {
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === 'k'
      ) {
        e.preventDefault();
        setIsQuickAddOpen(true);
      }
    };

    window.addEventListener(
      'keydown',
      handleGlobalKeyDown
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleGlobalKeyDown
      );
    };
  }, [setIsQuickAddOpen]);
};