import React from 'react';

function LoginScreen({ 
  enteredPassword, 
  setEnteredPassword, 
  handlePasswordSubmit, 
  isLoading, 
  hasBiometricSetup, 
  loginWithBiometrics, 
  setupBiometrics 
}) {
  return (
    <div className="flex flex-col items-center justify-center h-[80vh]">
      <div className="bg-[#fff8e1] dark:bg-slate-800 py-[2rem] px-[1.5rem] sm:px-[3rem] rounded-[12px] shadow-[0_8px_16px_rgba(0,0,0,0.2)] w-[90vw] max-w-[320px] text-center transition-colors">
        
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-orange-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-3xl shadow-inner">
            🔒
          </div>
        </div>
        
        <h2 className="mb-[1.2rem] text-[#f57c00] font-bold text-xl">Tasks Manager :)</h2>
        
        <form onSubmit={handlePasswordSubmit}>
          <input
            type="password"
            className="w-full p-[0.7rem] text-[1rem] border-[2px] border-[#f57c00] rounded-[8px] mb-[1rem] outline-none transition-colors focus:border-[#ef6c00] dark:bg-slate-700 dark:text-white dark:border-slate-600"
            value={enteredPassword}
            onChange={e => setEnteredPassword(e.target.value)}
            placeholder="Password"
            autoFocus
          />
          
          <button type="submit" disabled={isLoading} className="bg-[#f57c00] text-white border-none p-[0.75rem] w-full rounded-[8px] font-bold cursor-pointer transition-colors hover:bg-[#ef6c00] disabled:opacity-70 mb-3 shadow-md">
            {isLoading ? 'Unlocking...' : 'Unlock via Password'}
          </button>
        </form>

        {hasBiometricSetup ? (
          <button 
            onClick={loginWithBiometrics} 
            className="w-full p-[0.75rem] bg-slate-800 dark:bg-slate-600 text-white rounded-[8px] font-bold flex justify-center items-center gap-2 hover:bg-slate-700 dark:hover:bg-slate-500 transition-colors shadow-md"
          >
            <span>👆</span> Use Fingerprint
          </button>
        ) : (
          <div className="mt-4 pt-4 border-t border-orange-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Want faster access?</p>
            <button 
              onClick={() => {
                if(!enteredPassword) {
                  alert("Please type your password first, then click Setup!");
                  return;
                }
                setupBiometrics(enteredPassword);
              }} 
              className="w-full p-[0.5rem] bg-transparent border-[1.5px] border-slate-400 text-slate-600 dark:text-slate-300 rounded-[8px] font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Setup Biometric Login
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default LoginScreen;