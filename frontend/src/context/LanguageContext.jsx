import { createContext, useContext, useState, useCallback } from 'react';
import translations, { getLanguage, setLanguage as setLangStorage } from '../i18n/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLang] = useState(getLanguage());

  const setLanguage = useCallback((lang) => {
    setLang(lang);
    setLangStorage(lang);
  }, []);

  const t = useCallback((key) => {
    return translations[language]?.[key] || translations['vi']?.[key] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
