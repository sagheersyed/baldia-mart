// ThemeContext.tsx
// Provides dark/light theme via React Context.
// Uses device color scheme by default; can be overridden manually.
// Usage:
//   const { theme, isDark, toggleTheme } = useTheme();

import React, {
  createContext, useContext, useState,
  useEffect, useCallback, useMemo, memo,
} from 'react';
import { useColorScheme, Appearance } from 'react-native';
import { theme as lightTheme, darkTheme, Theme } from '../theme/theme';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setDark: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
  setDark: () => {},
});

export const ThemeProvider = memo(function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const scheme = useColorScheme();
  const [isDark, setIsDark] = useState<boolean>(scheme === 'dark');

  // Sync when device colour scheme changes
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setIsDark(colorScheme === 'dark');
    });
    return () => sub.remove();
  }, []);

  const toggleTheme = useCallback(() => setIsDark(prev => !prev), []);
  const setDark = useCallback((dark: boolean) => setIsDark(dark), []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: (isDark ? darkTheme : lightTheme) as Theme,
      isDark,
      toggleTheme,
      setDark,
    }),
    [isDark, toggleTheme, setDark],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export default ThemeContext;
