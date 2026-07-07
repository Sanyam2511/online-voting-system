import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UiPreferencesContext } from './uiPreferencesContextObject.js';

const STORAGE_KEY = 'securevote-ui-preferences';

export const UiPreferencesProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.theme) setTheme(parsed.theme);
      }
    } catch (e) {
      console.warn('Could not load preferences', e);
    }
    setIsInitialized(true);
  }, []);

  const savePreferences = useCallback((newPrefs) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, ...newPrefs }));
    } catch (e) {
      console.warn('Could not save preferences', e);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      savePreferences({ theme: newTheme });
      return newTheme;
    });
  }, [savePreferences]);

  useEffect(() => {
    if (!isInitialized) return;
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    
    // Set color scheme for native UI elements
    document.documentElement.style.colorScheme = theme;
  }, [theme, isInitialized]);

  const value = useMemo(() => ({
    theme,
    setTheme,
    toggleTheme
  }), [theme, toggleTheme]);

  if (!isInitialized) return null;

  return (
    <UiPreferencesContext.Provider value={value}>
      {children}
    </UiPreferencesContext.Provider>
  );
};
