import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import * as pinVault from '../utils/pinVault';
import { authService } from '../services/authService';

export const AUTO_LOCK_MINUTES = 10;
const AUTO_LOCK_MS = AUTO_LOCK_MINUTES * 60 * 1000;
const AUTO_LOCK_CHECK_MS = 15 * 1000;

const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'];

export const formatWait = (until, now = Date.now()) => {
  const seconds = Math.max(1, Math.ceil((until - now) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
};

export const useVaultLock = (session) => {
  const userId = session?.user?.id;

  const [isLocallyUnlocked, setIsLocallyUnlocked] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);

  // Always start locked for a new / changed user
  useEffect(() => {
    setIsLocallyUnlocked(false);
    setEnteredPassword('');
    setHasPin(pinVault.hasPin(userId));
    setLockedUntil(userId ? pinVault.getAttempts(userId).lockedUntil : 0);
  }, [userId]);

  const signOut = useCallback(async () => {
    try {
      await authService.signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
      toast.error('Sign out failed. Please try again.');
    }
  }, []);

  // Records a wrong PIN. Returns after showing the appropriate message.
  const handleFailure = useCallback(async () => {
    const result = pinVault.recordFailure(userId);

    if (result.shouldSignOut) {
      pinVault.resetAttempts(userId);
      setLockedUntil(0);
      toast.error('Too many failed attempts. Please sign in with Google again.');
      await signOut();
      return;
    }

    setLockedUntil(result.lockedUntil);

    const remaining = pinVault.FREE_ATTEMPTS - result.failures;
    toast.error(
      remaining > 0
        ? `Incorrect PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} left before a temporary lock.`
        : `Incorrect PIN. Try again in ${formatWait(result.lockedUntil)}.`
    );
  }, [userId, signOut]);

  const isLockedOut = useCallback(() => {
    const until = pinVault.getAttempts(userId).lockedUntil;
    if (until > Date.now()) {
      setLockedUntil(until);
      toast.error(`Too many attempts. Try again in ${formatWait(until)}.`);
      return true;
    }
    return false;
  }, [userId]);

  const unlock = useCallback(() => {
    pinVault.resetAttempts(userId);
    setLockedUntil(0);
    setEnteredPassword('');
    setIsLocallyUnlocked(true);
  }, [userId]);

  const handleUnlock = useCallback(async (pin) => {
    if (!userId) return;

    if (!pin) {
      toast.error('PIN cannot be empty');
      return;
    }

    if (isLockedOut()) return;

    setIsLoading(true);
    try {
      if (await pinVault.verifyPin(userId, pin)) {
        unlock();
        toast.success('Vault unlocked!');
      } else {
        setEnteredPassword('');
        await handleFailure();
      }
    } catch (error) {
      console.error('PIN check failed:', error);
      toast.error(error.message || 'Could not verify PIN');
    } finally {
      setIsLoading(false);
    }
  }, [userId, isLockedOut, unlock, handleFailure]);

  const createPin = useCallback(async (pin, confirmPin) => {
    if (!userId) return false;

    // Never overwrite an existing PIN from the create screen
    if (pinVault.hasPin(userId)) {
      setHasPin(true);
      toast.error('A PIN already exists on this device.');
      return false;
    }

    const formatError = pinVault.validatePinFormat(pin);
    if (formatError) {
      toast.error(formatError);
      return false;
    }

    if (pin !== confirmPin) {
      toast.error('PINs do not match');
      return false;
    }

    setIsLoading(true);
    try {
      await pinVault.setPin(userId, pin);
      setHasPin(true);
      unlock();
      toast.success('Vault PIN created');
      return true;
    } catch (error) {
      console.error('PIN creation failed:', error);
      toast.error(error.message || 'Could not create PIN');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId, unlock]);

  const changePin = useCallback(async (currentPin, newPin, confirmPin) => {
    if (!userId) return false;

    if (!currentPin || !newPin || !confirmPin) {
      toast.error('All fields are required');
      return false;
    }

    const formatError = pinVault.validatePinFormat(newPin);
    if (formatError) {
      toast.error(formatError);
      return false;
    }

    if (newPin !== confirmPin) {
      toast.error('New PINs do not match');
      return false;
    }

    if (isLockedOut()) return false;

    try {
      if (!(await pinVault.verifyPin(userId, currentPin))) {
        await handleFailure();
        return false;
      }

      pinVault.resetAttempts(userId);
      await pinVault.setPin(userId, newPin);
      toast.success('Vault PIN updated successfully');
      return true;
    } catch (error) {
      console.error('PIN change failed:', error);
      toast.error(error.message || 'Could not update PIN');
      return false;
    }
  }, [userId, isLockedOut, handleFailure]);

  const lock = useCallback(() => {
    setIsLocallyUnlocked(false);
    setEnteredPassword('');
  }, []);

  // Forgot PIN: wipe this device's vault data and require Google sign-in again.
  // A new PIN is created after signing back in.
  const forgotPin = useCallback(async () => {
    if (!userId) return;

    pinVault.clearVault(userId);
    setHasPin(false);
    lock();
    await signOut();
  }, [userId, lock, signOut]);

  // ---------- Auto-lock after inactivity ----------
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    if (!isLocallyUnlocked) return;

    lastActivity.current = Date.now();

    const markActive = () => {
      lastActivity.current = Date.now();
    };

    const checkIdle = () => {
      if (Date.now() - lastActivity.current >= AUTO_LOCK_MS) {
        lock();
        toast(`Vault locked after ${AUTO_LOCK_MINUTES} minutes of inactivity`, { icon: '🔒' });
      }
    };

    // Coming back to a tab that was hidden for a long time locks immediately
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkIdle();
    };

    ACTIVITY_EVENTS.forEach(event =>
      document.addEventListener(event, markActive, { passive: true, capture: true })
    );
    document.addEventListener('visibilitychange', onVisibilityChange);
    const interval = setInterval(checkIdle, AUTO_LOCK_CHECK_MS);

    return () => {
      ACTIVITY_EVENTS.forEach(event =>
        document.removeEventListener(event, markActive, { capture: true })
      );
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(interval);
    };
  }, [isLocallyUnlocked, lock]);

  return {
    isLocallyUnlocked,
    hasPin,
    enteredPassword,
    setEnteredPassword,
    isLoading,
    lockedUntil,
    handleUnlock,
    createPin,
    changePin,
    unlockWithBiometrics: unlock,
    lock,
    forgotPin
  };
};
