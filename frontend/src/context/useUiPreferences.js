import { useContext, useMemo } from 'react';
import { UiPreferencesContext } from './uiPreferencesContextObject.js';
import { buildLanguagePath } from './i18n.js';

export const useUiPreferences = () => {
  const context = useContext(UiPreferencesContext);

  if (!context) {
    throw new Error('useUiPreferences must be used within UiPreferencesProvider.');
  }

  const withLanguagePath = useMemo(() => {
    return (pathname) => buildLanguagePath(context.language, pathname);
  }, [context.language]);

  return {
    ...context,
    withLanguagePath
  };
};
