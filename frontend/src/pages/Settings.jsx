import MainLayout from '../layouts/MainLayout';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function Settings({
  session,
  isDarkMode,
  setIsDarkMode,
  profile,
  updateProfile,
  loading
}) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

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

  const handleChangePin = () => {
    if (!session?.user?.id) return;

    const pinKey = `app_pin_${session.user.id}`;
    const savedPin = localStorage.getItem(pinKey);

    if (!currentPin || !newPin || !confirmPin) {
      toast.error("All fields are required");
      return;
    }

    if (savedPin !== currentPin) {
      toast.error("Current PIN is incorrect");
      return;
    }

    if (newPin.length < 4) {
      toast.error("PIN must contain at least 4 characters");
      return;
    }

    if (newPin !== confirmPin) {
      toast.error("PINs do not match");
      return;
    }

    localStorage.setItem(pinKey, newPin);

    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');

    toast.success("Vault PIN updated successfully");
  };

  return (
    <MainLayout
      isDarkMode={isDarkMode}
      setIsDarkMode={setIsDarkMode}
    >

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
            Change your local Vault PIN. This PIN protects only this device.
          </p>

          <div className="space-y-4">

            <input
              type="password"
              placeholder="Current PIN"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              className={inputStyle}
            />

            <input
              type="password"
              placeholder="New PIN"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className={inputStyle}
            />

            <input
              type="password"
              placeholder="Confirm New PIN"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              className={inputStyle}
            />

            <button
              onClick={handleChangePin}
              className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 transition py-3 font-semibold text-white shadow-md hover:shadow-lg"
            >
              🔐 Update Vault PIN
            </button>

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

                      await updateProfile({
                        codeforces_sync: enabled
                      });

                      toast.success(
                        enabled
                          ? "Codeforces Sync Enabled"
                          : "Codeforces Sync Disabled"
                      );

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
      </div>
    </MainLayout>
  );
}
