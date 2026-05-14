import { useEffect } from 'react';

export const useKeyboardShortcuts = ({
  isLocallyUnlocked,
  setIsQuickAddOpen
}) => {
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === 'k'
      ) {
        e.preventDefault();

        if (isLocallyUnlocked) {
          setIsQuickAddOpen(true);
        }
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
  }, [isLocallyUnlocked, setIsQuickAddOpen]);
};