import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const THEME_KEY = 'theme';

// Dark mode is the default for first-time users
const readInitialTheme = () => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === null ? true : saved === 'dark';
  } catch {
    return true;
  }
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(readInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    try {
      localStorage.setItem(THEME_KEY, isDarkMode ? 'dark' : 'light');
    } catch {
      // Theme just won't persist if storage is blocked
    }
  }, [isDarkMode]);

  const toggleTheme = useCallback(() => setIsDarkMode(dark => !dark), []);

  const value = useMemo(
    () => ({ isDarkMode, toggleTheme }),
    [isDarkMode, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return context;
}
