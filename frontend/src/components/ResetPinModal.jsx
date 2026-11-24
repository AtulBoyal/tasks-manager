import { useState } from 'react';

// Forgot PIN: resetting requires signing in with Google again, so someone
// holding an unlocked-Google device can't just pick a new PIN.
export default function ResetPinModal({
  isOpen,
  onClose,
  onConfirmReset
}) {
  const [isResetting, setIsResetting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsResetting(true);
    try {
      await onConfirmReset();
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={isResetting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-pin-title"
        className="w-[92%] max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-2xl border border-orange-100 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="reset-pin-title" className="text-2xl font-bold text-orange-500 mb-4">
          Reset Vault PIN
        </h2>

        <p className="text-slate-600 dark:text-slate-300 leading-7 text-[15px]">
          To reset your PIN you'll be <span className="font-semibold">signed out</span> and
          need to sign in with Google again. You'll then create a new PIN.
        </p>

        <p className="mt-3 text-slate-600 dark:text-slate-300 leading-7 text-[15px]">
          Your tasks are safely stored in your account and will
          <span className="font-bold text-green-600"> NOT </span>
          be deleted. Fingerprint unlock on this device will be turned off.
        </p>

        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            disabled={isResetting}
            className="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            disabled={isResetting}
            className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold transition disabled:opacity-50"
          >
            {isResetting ? 'Signing out…' : 'Sign out & Reset PIN'}
          </button>
        </div>
      </div>
    </div>
  );
}
