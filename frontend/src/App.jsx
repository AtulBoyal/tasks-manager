import { lazy, Suspense, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { Toaster } from 'react-hot-toast';

import { useAuth } from './hooks/useAuth';
import { useProfile } from './hooks/useProfile';
import { useVaultLock } from './hooks/useVaultLock';
import { useBiometrics } from './hooks/useBiometrics';

import ProtectedRoute from './routes/ProtectedRoute';
import ResetPinModal from './components/ResetPinModal';
import QuickAddLauncher from './components/QuickAddLauncher';
import { ThemeProvider } from './context/ThemeContext';
import { VaultProvider } from './context/VaultContext';
import { TaskProvider } from './context/TaskContext';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const AnalyticsPage = lazy(() => import('./pages/Analytics'));
const FocusMode = lazy(() => import('./pages/FocusMode'));
const Archive = lazy(() => import('./pages/Archive'));
const NotFound = lazy(() => import('./pages/NotFound'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center text-2xl font-bold text-orange-500">
    Loading...
  </div>
);

function App() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const { profile, updateProfile, loading: profileLoading } = useProfile(session);

  const vault = useVaultLock(session);

  const biometrics = useBiometrics({
    userId,
    email: session?.user?.email,
    onVerified: vault.unlockWithBiometrics
  });

  const [showResetPinModal, setShowResetPinModal] = useState(false);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    vault.handleUnlock(vault.enteredPassword);
  };

  // Clears this device's PIN and signs out; a new PIN is created after
  // signing back in with Google.
  const handleResetPin = async () => {
    await vault.forgotPin();
    setShowResetPinModal(false);
  };

  const loginProps = {
    hasPin: vault.hasPin,
    enteredPassword: vault.enteredPassword,
    setEnteredPassword: vault.setEnteredPassword,
    handlePasswordSubmit,
    onCreatePin: vault.createPin,
    isLoading: vault.isLoading,
    lockedUntil: vault.lockedUntil,
    hasBiometricSetup: biometrics.hasBiometricSetup,
    loginWithBiometrics: biometrics.loginWithBiometrics,
    onForgotPin: () => setShowResetPinModal(true)
  };

  const vaultContextValue = {
    lock: vault.lock,
    changePin: vault.changePin,
    biometrics
  };

  return (
    <ThemeProvider>
      <Toaster position="top-right" />

      <div className="min-h-screen font-sans m-0 p-0 bg-[linear-gradient(135deg,#f7fafc_24%,#ffe5c2_100%)] dark:bg-none dark:bg-slate-900 transition-colors duration-300 pb-[40px]">
        <ProtectedRoute
          isLocallyUnlocked={vault.isLocallyUnlocked}
          session={session}
          loginProps={loginProps}
        >
          <VaultProvider value={vaultContextValue}>
            {/* Mounted only while unlocked: locking drops tasks from memory */}
            <TaskProvider
              key={userId}
              userId={userId}
              codeforcesSync={!!profile?.codeforces_sync}
            >
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route
                    path="/settings"
                    element={
                      <Settings
                        session={session}
                        profile={profile}
                        updateProfile={updateProfile}
                        loading={profileLoading}
                      />
                    }
                  />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/focus" element={<FocusMode />} />
                  <Route path="/archive" element={<Archive />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>

              <QuickAddLauncher />
            </TaskProvider>
          </VaultProvider>
        </ProtectedRoute>

        <ResetPinModal
          isOpen={showResetPinModal}
          onClose={() => setShowResetPinModal(false)}
          onConfirmReset={handleResetPin}
        />

        <Analytics />
      </div>
    </ThemeProvider>
  );
}

export default App;
