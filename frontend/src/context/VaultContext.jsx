import { createContext, useContext } from 'react';

// Vault actions for screens behind the lock (header lock button, Settings).
const VaultContext = createContext(null);

export function VaultProvider({ value, children }) {
  return (
    <VaultContext.Provider value={value}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  return useContext(VaultContext);
}
