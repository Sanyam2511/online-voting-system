export const SUPPORTED_LANGUAGES = ['en', 'hi'];

export const normalizeLanguage = (value) => (value === 'hi' ? 'hi' : 'en');

export const stripLanguagePrefix = (pathname = '') => {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return '/';
  }

  if (SUPPORTED_LANGUAGES.includes(segments[0])) {
    const rest = segments.slice(1).join('/');
    return `/${rest}`.replace(/\/$/, '') || '/';
  }

  return pathname;
};

export const buildLanguagePath = (language, pathname = '/') => {
  const normalizedLanguage = normalizeLanguage(language);
  const cleanPath = stripLanguagePrefix(pathname);
  const suffix = cleanPath === '/' ? '' : cleanPath;
  return `/${normalizedLanguage}${suffix}`;
};
