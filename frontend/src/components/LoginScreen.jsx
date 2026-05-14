import React from 'react';
import { supabase } from '../supabaseClient';
import { authService } from '../services/authService';

function LoginScreen({ 
  session, 
  enteredPassword, 
  setEnteredPassword, 
  handlePasswordSubmit, 
  isLoading,
  hasBiometricSetup, 
  loginWithBiometrics, 
  setupBiometrics 
}) {

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) console.error("Google login failed:", error);
  };

  const signOut = async () => {
    await authService.signOut();
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
              Sign in to securely sync your vault to the cloud.
            </p>
            <button 
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-600 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              Sign in with Google
            </button>
          </div>
        ) : (
          
        /* STEP 2: GOOGLE LOGGED IN -> ASK FOR LOCAL VAULT LOCK */
          <div className="animate-fade-in">
            <div className="mb-6">
              <span className="inline-block w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-2xl mb-3 mx-auto shadow-inner">
                🔒
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-xs font-semibold">
                Cloud sync active as <br/><span className="text-orange-600 dark:text-orange-400">{session.user.email}</span>
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
              <input 
                type="password" 
                value={enteredPassword}
                onChange={(e) => setEnteredPassword(e.target.value)}
                placeholder="Enter App PIN"
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-center font-mono tracking-widest text-lg text-slate-800 dark:text-white disabled:opacity-50"
              />
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? <span className="animate-spin">⏳</span> : 'Unlock Vault'}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-700">
              {hasBiometricSetup ? (
                <button onClick={loginWithBiometrics} className="text-orange-500 font-bold text-sm hover:underline flex items-center justify-center gap-2 mx-auto w-full py-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <span>👆</span> Unlock with Fingerprint
                </button>
              ) : (
                <button onClick={() => setupBiometrics(enteredPassword)} className="text-slate-500 text-xs hover:underline bg-slate-50 dark:bg-slate-800 py-2 px-4 rounded-lg border border-slate-200 dark:border-slate-600">
                  Set up Biometric Unlock
                </button>
              )}
            </div>

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