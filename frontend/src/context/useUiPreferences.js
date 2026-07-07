import { useContext } from 'react';
import { UiPreferencesContext } from './uiPreferencesContextObject.js';

export const useUiPreferences = () => {
  const context = useContext(UiPreferencesContext);

  if (!context) {
    throw new Error('useUiPreferences must be used within UiPreferencesProvider.');
  }

  return context;
};
