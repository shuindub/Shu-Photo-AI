
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Theme, Language } from '../types';
import { getTranslation } from '../config/translations';

interface SettingsContextType {
  theme: Theme;
  toggleTheme: () => void;
  language: Language;
  toggleLanguage: () => void;
  t: typeof translations['en'];
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

import { translations } from '../config/translations';

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('app_theme');
    return (saved as Theme) || 'dark';
  });

  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('app_theme', theme);
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ru' : 'en');
  };

  const t = getTranslation(language);

  return (
    <SettingsContext.Provider value={{ theme, toggleTheme, language, toggleLanguage, t }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
