import { useEffect, useMemo, useState } from 'react';
import { PreferencesContext } from './preferences.js';

function getInitialTheme() {
  const saved = localStorage.getItem('deci-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialLanguage() {
  const saved = localStorage.getItem('deci-language');
  return saved === 'ar' ? 'ar' : 'en';
}

export function PreferencesProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);
  const [language, setLanguage] = useState(getInitialLanguage);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('deci-theme', theme);
  }, [theme]);

  useEffect(() => {
    const direction = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    localStorage.setItem('deci-language', language);
  }, [language]);

  const value = useMemo(
    () => ({
      theme,
      language,
      direction: language === 'ar' ? 'rtl' : 'ltr',
      toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
      toggleLanguage: () => setLanguage((current) => (current === 'en' ? 'ar' : 'en')),
    }),
    [language, theme],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
