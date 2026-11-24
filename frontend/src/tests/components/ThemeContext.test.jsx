import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../../context/ThemeContext';

function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>{isDarkMode ? 'dark' : 'light'}</button>;
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('defaults to dark mode for first-time users', () => {
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);

    expect(screen.getByRole('button')).toHaveTextContent('dark');
    expect(document.documentElement).toHaveClass('dark');
  });

  it('restores and persists the saved theme', () => {
    localStorage.setItem('theme', 'light');
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);

    expect(screen.getByRole('button')).toHaveTextContent('light');
    expect(document.documentElement).not.toHaveClass('dark');

    fireEvent.click(screen.getByRole('button'));

    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});
