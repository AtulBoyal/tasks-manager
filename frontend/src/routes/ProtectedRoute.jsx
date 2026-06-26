import LoginScreen from '../components/LoginScreen';

export default function ProtectedRoute({
  isLocallyUnlocked,
  session,
  enteredPassword,
  setEnteredPassword,
  handlePasswordSubmit,
  isLoading,
  hasBiometricSetup,
  loginWithBiometrics,
  setupBiometrics,
  children,
  handleForgotPin
}) {
  if (!isLocallyUnlocked) {
    return (
      <LoginScreen
        session={session}
        enteredPassword={enteredPassword}
        setEnteredPassword={setEnteredPassword}
        handlePasswordSubmit={handlePasswordSubmit}
        isLoading={isLoading}
        hasBiometricSetup={hasBiometricSetup}
        loginWithBiometrics={loginWithBiometrics}
        setupBiometrics={setupBiometrics}
        onForgotPin={handleForgotPin}
      />
    );
  }

  return children;
}