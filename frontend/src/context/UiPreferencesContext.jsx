/* eslint-disable react-hooks/set-state-in-effect */
import React, { useMemo, useEffect } from 'react';
import { UiPreferencesContext } from './uiPreferencesContextObject.js';

const STORAGE_KEY = 'securevote-ui-preferences';

export const UiPreferencesProvider = ({ children }) => {
  const theme = 'dark';

  useEffect(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    document.body.classList.remove('theme-light');
    document.body.classList.add('theme-dark');
    document.documentElement.style.colorScheme = 'dark';
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme: () => {} }), []);

  return <UiPreferencesContext.Provider value={value}>{children}</UiPreferencesContext.Provider>;
};
