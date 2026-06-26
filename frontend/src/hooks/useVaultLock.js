import { useState } from 'react';
import toast from 'react-hot-toast';

// export const useVaultLock = (fetchTasks, session) => {
  export const useVaultLock = (session) => {
    const [isLocallyUnlocked, setIsLocallyUnlocked] = useState(false);
    const [enteredPassword, setEnteredPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUnlock = async (pwd) => {
    if (!pwd.trim()) {
      toast.error("PIN cannot be empty");
      return;
    }
    
    setIsLoading(true);
    
    try {  
      if(!session?.user?.id) return;

      
      const pinKey = `app_pin_${session.user.id}`;

      const legacyPin = localStorage.getItem('app_pin');

      if (legacyPin && !localStorage.getItem(pinKey)) {
        localStorage.setItem(pinKey, legacyPin);
        localStorage.removeItem('app_pin');
      }

      const savedPin = localStorage.getItem(pinKey);


      if (!savedPin) {
        localStorage.setItem(pinKey, pwd);
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