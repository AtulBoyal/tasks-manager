import { useState, useEffect, useRef } from 'react';

export default function ResetPinModal({
    isOpen,
    onClose,
    onConfirmReset
}) {
    const inputRef = useRef(null);

    const [step, setStep] = useState(1);
    const [newPin, setNewPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [showPin, setShowPin] = useState(false);

    useEffect(() => {
      if (!isOpen) {
        setStep(1);
        setNewPin('');
        setConfirmPin('');
        setShowPin(false);
      }
    }, [isOpen]);

    useEffect(() => {
        if (step === 2) {
            inputRef.current?.focus();
        }
    }, [step]);

  if (!isOpen) return null;

  const pinsMatch =
    newPin.trim().length >= 4 &&
    newPin.trim().length <= 12 &&
    newPin === confirmPin;

  return (
    <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={onClose}
    >

      <div
        className="
        w-[92%]
        max-w-md
        rounded-2xl
        bg-white
        dark:bg-slate-800
        p-6
        shadow-2xl
        border
        border-orange-100
        dark:border-slate-700
        "
        onClick={(e) => e.stopPropagation()}
      >

        {step === 1 ? (
          <>
            <h2 className="text-2xl font-bold text-orange-500 mb-4">
              Reset Vault PIN
            </h2>

            <p className="text-slate-600 dark:text-slate-300 leading-7 text-[15px]">
              Your Vault PIN protects only this device.
            </p>

            <p className="mt-3 text-slate-600 dark:text-slate-300 leading-7 text-[15px]">
              Your tasks are safely stored in your account and will
              <span className="font-bold text-green-600">
                {" "}NOT{" "}
              </span>
              be deleted.
            </p>

            <p 
                className="
                    mt-6
                    text-slate-900
                    dark:text-slate-100
                    font-semibold
                    text-lg
                "
            >
              Do you want to create a new PIN?
            </p>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={onClose}
                className="
                px-5
                py-2
                rounded-xl
                border
                border-slate-300
                dark:border-slate-600
                text-slate-700
                dark:text-slate-200
                hover:bg-slate-100
                dark:hover:bg-slate-700
                transition
                "
              >
                Cancel
              </button>

              <button
                onClick={() => setStep(2)}
                className="
                px-5
                py-2
                rounded-xl
                bg-orange-500
                hover:bg-orange-600
                text-white
                font-semibold
                transition
                "
              >
                Continue to Reset
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-orange-500 mb-6">
              Create New PIN
            </h2>

            <div className="space-y-5">

              <div className="relative">
                <input
                  inputMode='numeric'
                  autoComplete='new-password'
                  ref={inputRef}
                  type={showPin ? "text" : "password"}
                  placeholder="New PIN"
                  value={newPin}
                  onChange={(e) =>
                    setNewPin(e.target.value)
                  }
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-300
                    dark:border-slate-600
                    bg-white
                    dark:bg-slate-900
                    text-slate-900
                    dark:text-white
                    placeholder:text-slate-400
                    dark:placeholder:text-slate-500
                    p-3
                    pr-12
                    focus:outline-none
                    focus:ring-2
                    focus:ring-orange-500
                    "
                />

                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="
                    absolute
                    right-3
                    top-1/2
                    -translate-y-1/2
                    text-slate-500
                    dark:text-slate-400
                    hover:text-orange-500
                    transition
                  "
                >
                  {showPin ? "🙈" : "👁️"}
                </button>
              </div>

              <input
                type={showPin ? "text" : "password"}
                inputMode='numeric'
                autoComplete='new-password'
                placeholder="Confirm PIN"
                value={confirmPin}
                onChange={(e) =>
                  setConfirmPin(e.target.value)
                }
                className="
                  w-full
                  rounded-xl
                  border
                  border-slate-300
                  dark:border-slate-600
                  bg-white
                  dark:bg-slate-900
                  text-slate-900
                  dark:text-white
                  placeholder:text-slate-400
                  dark:placeholder:text-slate-500
                  p-3
                  pr-12
                  focus:outline-none
                  focus:ring-2
                  focus:ring-orange-500
                "
              />

              {confirmPin &&
                newPin !== confirmPin && (
                  <p className="text-red-500 text-sm">
                    PINs do not match.
                  </p>
                )}
            </div>

            <div className="flex justify-end gap-3 mt-8">

              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl border text-orange-600"
              >
                Cancel
              </button>

              <button
                disabled={!pinsMatch}
                onClick={() =>
                  onConfirmReset(newPin)
                }
                className={`px-5 py-2 rounded-xl text-white ${
                  pinsMatch
                    ? "bg-orange-500"
                    : "bg-slate-400 cursor-not-allowed"
                }`}
              >
                Save New PIN
              </button>

            </div>
          </>
        )}

      </div>

    </div>
  );
}