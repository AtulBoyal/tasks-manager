import { useState } from 'react';
import toast from 'react-hot-toast';

// export const useVaultLock = (fetchTasks, session) => {
export const useVaultLock = () => {
  const [isLocallyUnlocked, setIsLocallyUnlocked] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUnlock = async (pwd) => {
    setIsLoading(true);

    try {
      const savedPin = localStorage.getItem('app_pin');

      if (!savedPin) {
        localStorage.setItem('app_pin', pwd);
        setIsLocallyUnlocked(true);
        toast.success("Vault unlocked!");
      } else if (pwd === savedPin) {
        setIsLocallyUnlocked(true);
        toast.success("Vault unlocked!");
      } else {
        toast.error("Incorrect Vault PIN!");
      }

    } catch (error) {
      console.error(error);
      toast.error("Network error: Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLocallyUnlocked,
    enteredPassword,
    setEnteredPassword,
    isLoading,
    handleUnlock
  };
};