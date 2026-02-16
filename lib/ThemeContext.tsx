import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { themes, type ThemeConfig, type ThemeKey } from './theme';

interface ThemeContextValue {
  theme: ThemeConfig;
  themeKey: ThemeKey;
  setTheme: (key: ThemeKey) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: themes.void,
  themeKey: 'void',
  setTheme: () => {},
  isDark: true,
});

const STORAGE_KEY = 'dreamdecode_theme';

async function loadThemeKey(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }
  try {
    const SecureStore = await import('expo-secure-store');
    return await SecureStore.getItemAsync(STORAGE_KEY);
  } catch { return null; }
}

async function saveThemeKey(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(STORAGE_KEY, key); } catch {}
    return;
  }
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(STORAGE_KEY, key);
  } catch {}
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeKey, setThemeKey] = useState<ThemeKey>('void');

  useEffect(() => {
    loadThemeKey().then((saved) => {
      if (saved && saved in themes) {
        setThemeKey(saved as ThemeKey);
      }
    });
  }, []);

  const setTheme = useCallback((key: ThemeKey) => {
    setThemeKey(key);
    saveThemeKey(key);
  }, []);

  const theme = themes[themeKey];

  return (
    <ThemeContext.Provider value={{ theme, themeKey, setTheme, isDark: theme.isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useColors() {
  return useContext(ThemeContext).theme.colors;
}
