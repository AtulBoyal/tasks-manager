import LoginScreen from '../components/LoginScreen';

export default function ProtectedRoute({
  isLocallyUnlocked,
  session,
  loginProps,
  children
}) {
  // Both a Google session and a local unlock are required
  if (!session || !isLocallyUnlocked) {
    return <LoginScreen session={session} {...loginProps} />;
  }

  return children;
}
