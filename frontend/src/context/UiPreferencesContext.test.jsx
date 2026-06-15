/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UiPreferencesProvider } from './UiPreferencesContext.jsx';
import { useUiPreferences } from './useUiPreferences.js';

const Probe = () => {
  const {
    language,
    setLanguage,
    theme,
    toggleTheme,
    t
  } = useUiPreferences();

  return (
    <div>
      <p data-testid="lang-value">{language}</p>
      <p data-testid="home-label">{t('nav.home')}</p>
      <button type="button" onClick={() => setLanguage('hi')}>Switch Hindi</button>
      <button type="button" onClick={toggleTheme}>Toggle Theme</button>
      <p data-testid="theme-value">{String(theme)}</p>
    </div>
  );
};

describe('UiPreferencesProvider', () => {
  it('supports language and theme toggles', async () => {
    render(
      <UiPreferencesProvider>
        <Probe />
      </UiPreferencesProvider>
    );

    expect(screen.getByTestId('lang-value').textContent).toBe('en');
    expect(screen.getByTestId('home-label').textContent).toBe('Home');

    fireEvent.click(screen.getByText('Switch Hindi'));
    expect(screen.getByTestId('lang-value').textContent).toBe('hi');
    expect(screen.getByTestId('home-label').textContent).toBe('होम');

    fireEvent.click(screen.getByText('Toggle Theme'));

    await waitFor(() => {
      expect(document.body.classList.contains('theme-dark')).toBe(true);
      expect(screen.getByTestId('theme-value').textContent).toBe('dark');
    });
  });
});
