import React, { useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { PIN_MIN_LENGTH, PIN_MAX_LENGTH } from '../utils/pinVault';
import { formatWait } from '../hooks/useVaultLock';

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-center font-mono tracking-widest text-lg text-slate-800 dark:text-white disabled:opacity-50";

const primaryButtonClass =
  "w-full bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2";

// Re-renders every second while a lockout is active
const useNow = (active) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  return now;
};

function CreatePinForm({ onCreatePin, isLoading }) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const tooShort = pin.length > 0 && pin.length < PIN_MIN_LENGTH;
  const mismatch = confirmPin.length > 0 && pin !== confirmPin;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const created = await onCreatePin(pin, confirmPin);
    if (!created) setConfirmPin('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Create a Vault PIN for this device ({PIN_MIN_LENGTH}-{PIN_MAX_LENGTH} characters).
      </p>

      <input
        type="password"
        autoComplete="new-password"
        value={pin}
        maxLength={PIN_MAX_LENGTH}
        onChange={(e) => setPin(e.target.value)}
        placeholder="New PIN"
        aria-label="New PIN"
        disabled={isLoading}
        autoFocus
        className={inputClass}
      />
      <input
        type="password"
        autoComplete="new-password"
        value={confirmPin}
        maxLength={PIN_MAX_LENGTH}
        onChange={(e) => setConfirmPin(e.target.value)}
        placeholder="Confirm PIN"
        aria-label="Confirm PIN"
        disabled={isLoading}
        className={inputClass}
      />

      {tooShort && (
        <p className="text-xs text-red-500">PIN must be at least {PIN_MIN_LENGTH} characters.</p>
      )}
      {mismatch && <p className="text-xs text-red-500">PINs do not match.</p>}

      <button
        type="submit"
        disabled={isLoading || !pin || pin !== confirmPin || pin.length < PIN_MIN_LENGTH}
        className={primaryButtonClass}
      >
        {isLoading ? <span className="animate-spin">⏳</span> : 'Create PIN & Unlock'}
      </button>
    </form>
  );
}

function LoginScreen({
  session,
  hasPin,
  enteredPassword,
  setEnteredPassword,
  handlePasswordSubmit,
  onCreatePin,
  isLoading,
  lockedUntil,
  hasBiometricSetup,
  loginWithBiometrics,
  onForgotPin
}) {
  const now = useNow(lockedUntil > Date.now());
  const isLockedOut = lockedUntil > now;

  const signInWithGoogle = async () => {
    try {
      await authService.signInWithGoogle();
    } catch (error) {
      console.error("Google login failed:", error);
    }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md text-center border border-slate-100 dark:border-slate-700">

        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 mb-6">
          Tasks Manager
        </h1>

        {/* STEP 1: NOT LOGGED INTO GOOGLE */}
        {!session ? (
          <div>
            <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
              Sign in to securely sync your tasks to the cloud.
            </p>
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-600 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
            >
              <img src="/google-logo.svg" alt="" aria-hidden="true" className="w-5 h-5" />
              Sign in with Google
            </button>
          </div>
        ) : (

        /* STEP 2: GOOGLE LOGGED IN -> CREATE OR ENTER LOCAL VAULT PIN */
          <div className="animate-fade-in">
            <div className="mb-6">
              <span className="inline-block w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-2xl mb-3 mx-auto shadow-inner">
                🔒
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-xs font-semibold">
                Signed in as <br/><span className="text-orange-600 dark:text-orange-400">{session.user.email}</span>
              </p>
            </div>

            {!hasPin ? (
              <CreatePinForm onCreatePin={onCreatePin} isLoading={isLoading} />
            ) : (
              <>
                <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={enteredPassword}
                    onChange={(e) => setEnteredPassword(e.target.value)}
                    placeholder="Enter Vault PIN"
                    aria-label="Vault PIN"
                    disabled={isLoading || isLockedOut}
                    autoFocus
                    className={inputClass}
                  />

                  {isLockedOut && (
                    <p className="text-sm text-red-500" role="alert">
                      Too many incorrect attempts. Try again in {formatWait(lockedUntil, now)}.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || isLockedOut}
                    className={primaryButtonClass}
                  >
                    {isLoading ? <span className="animate-spin">⏳</span> : 'Unlock Vault'}
                  </button>
                </form>

                {hasBiometricSetup && (
                  <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-700">
                    <button onClick={loginWithBiometrics} className="text-orange-500 font-bold text-sm hover:underline flex items-center justify-center gap-2 mx-auto w-full py-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <span>👆</span> Unlock with Fingerprint
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={onForgotPin}
                  className="text-xs text-orange-500 hover:underline mt-3"
                >
                  Forgot PIN?
                </button>
              </>
            )}

            <button onClick={signOut} className="block mx-auto mt-6 text-xs text-red-500 hover:text-red-600 hover:underline">
              Sign out of Google
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoginScreen;
