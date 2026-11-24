import MainLayout from '../layouts/MainLayout';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useVault } from '../context/VaultContext';
import { AUTO_LOCK_MINUTES } from '../hooks/useVaultLock';
import { PIN_MAX_LENGTH } from '../utils/pinVault';
import DataTransferCard from '../components/DataTransferCard';

export default function Settings({
  session,
  profile,
  updateProfile,
  loading
}) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);

  const vault = useVault();
  const biometrics = vault?.biometrics;

  const cardStyle =
    "rounded-2xl bg-white dark:bg-slate-800 border border-orange-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 p-6";

  const inputStyle = `
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
    px-4
    py-3
    focus:outline-none
    focus:ring-2
    focus:ring-orange-500
    transition
  `;

  const fullName =
    session?.user?.user_metadata?.full_name || "User";

  const email = session?.user?.email;

  const handleChangePin = async (e) => {
    e.preventDefault();
    if (!vault) return;

    setIsChangingPin(true);
    try {
      const changed = await vault.changePin(currentPin, newPin, confirmPin);
      if (changed) {
        setNewPin('');
        setConfirmPin('');
      }
      setCurrentPin('');
    } finally {
      setIsChangingPin(false);
    }
  };

  return (
    <MainLayout>

      <div className="w-full max-w-3xl mx-auto px-5 py-8 space-y-8">

        {/* PAGE TITLE */}

        <div>

          <h1 className="text-4xl font-extrabold text-orange-500">
            ⚙️ Settings
          </h1>

          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Manage your account, vault security and integrations.
          </p>

        </div>

        {/* PROFILE */}

        <div className={cardStyle}>

          <h2 className="flex items-center gap-2 text-xl font-bold text-orange-500 mb-2">
            👤 Profile
          </h2>

          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Your Google account connected with Task Manager.
          </p>

          <div className="grid md:grid-cols-2 gap-8">

            <div>

              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                Full Name
              </p>

              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {fullName}
              </p>

            </div>

            <div>

              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                Email Address
              </p>

              <p className="text-lg text-slate-700 dark:text-slate-300 break-all">
                {email}
              </p>

            </div>

          </div>

        </div>

        {/* VAULT SECURITY */}

        <div className={cardStyle}>

          <h2 className="flex items-center gap-2 text-xl font-bold text-orange-500 mb-2">
            🔒 Vault Security
          </h2>

          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Your Vault PIN locks the app on this device only. The vault locks
            automatically after {AUTO_LOCK_MINUTES} minutes of inactivity.
          </p>

          <form onSubmit={handleChangePin} className="space-y-4">

            <input
              type="password"
              autoComplete="current-password"
              placeholder="Current PIN"
              aria-label="Current PIN"
              value={currentPin}
              maxLength={PIN_MAX_LENGTH}
              onChange={(e) => setCurrentPin(e.target.value)}
              className={inputStyle}
            />

            <input
              type="password"
              autoComplete="new-password"
              placeholder="New PIN"
              aria-label="New PIN"
              value={newPin}
              maxLength={PIN_MAX_LENGTH}
              onChange={(e) => setNewPin(e.target.value)}
              className={inputStyle}
            />

            <input
              type="password"
              autoComplete="new-password"
              placeholder="Confirm New PIN"
              aria-label="Confirm New PIN"
              value={confirmPin}
              maxLength={PIN_MAX_LENGTH}
              onChange={(e) => setConfirmPin(e.target.value)}
              className={inputStyle}
            />

            <button
              type="submit"
              disabled={isChangingPin}
              className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 transition py-3 font-semibold text-white shadow-md hover:shadow-lg"
            >
              {isChangingPin ? 'Updating…' : '🔐 Update Vault PIN'}
            </button>

          </form>

          {/* BIOMETRIC UNLOCK */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                👆 Fingerprint Unlock
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {!biometrics?.isSupported
                  ? 'Not supported on this device or browser.'
                  : biometrics.hasBiometricSetup
                    ? 'Enabled on this device.'
                    : 'Unlock the vault with your fingerprint or face on this device.'}
              </p>
            </div>

            {biometrics?.isSupported && (
              biometrics.hasBiometricSetup ? (
                <button
                  type="button"
                  onClick={biometrics.removeBiometrics}
                  className="px-5 py-2 rounded-xl border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition font-semibold"
                >
                  Turn off
                </button>
              ) : (
                <button
                  type="button"
                  onClick={biometrics.setupBiometrics}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition font-semibold"
                >
                  Set up
                </button>
              )
            )}
          </div>

        </div>

        {/* INTEGRATIONS */}
        <div className={cardStyle}>

          <h2 className="flex items-center gap-2 text-xl font-bold text-orange-500 mb-2">
            🔗 Integrations
          </h2>

          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Connect Task Manager with external services to automate your workflow.
          </p>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

              <div className="flex-1">

                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                  Codeforces Contest Sync
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Automatically check for upcoming Codeforces contests whenever you
                  open Task Manager and add only new contests to your task list.
                </p>

              </div>

              <div className="flex flex-col items-end gap-3">

                <span
                  className={`text-sm font-semibold ${
                    profile?.codeforces_sync
                      ? "text-green-600"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {profile?.codeforces_sync
                    ? "✓ Enabled"
                    : "Disabled"}
                </span>

                <label className="relative inline-flex items-center cursor-pointer">

                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={profile?.codeforces_sync ?? false}
                    disabled={loading}
                    onChange={async ({ target }) => {
                      const enabled = target.checked;

                      try {
                        await updateProfile({
                          codeforces_sync: enabled
                        });

                        toast.success(
                          enabled
                            ? "Codeforces Sync Enabled"
                            : "Codeforces Sync Disabled"
                        );
                      } catch (error) {
                        console.error("Failed to update Codeforces sync:", error);
                        toast.error("Failed to update setting");
                      }

                    }}
                  />

                  <div
                    className="
                    relative
                    w-14
                    h-8
                    rounded-full
                    bg-slate-300
                    dark:bg-slate-600
                    peer-focus:ring-4
                    peer-focus:ring-orange-300
                    dark:peer-focus:ring-orange-900
                    peer-checked:bg-orange-500
                    transition-colors
                    after:absolute
                    after:left-1
                    after:top-1
                    after:h-6
                    after:w-6
                    after:rounded-full
                    after:bg-white
                    after:transition-transform
                    peer-checked:after:translate-x-6
                    "
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* YOUR DATA */}
        <DataTransferCard className={cardStyle} />
      </div>
    </MainLayout>
  );
}
