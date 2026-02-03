import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getActivePreferences, setActivePreferences, SupportedCurrency } from '@/lib/preferences';
import { SupportedLocale, getTranslations, interpolate, TranslationKeys } from '@/lib/i18n';

interface I18nContextValue {
  locale: SupportedLocale;
  currency: SupportedCurrency;
  t: TranslationKeys;
  setLocale: (locale: SupportedLocale) => void;
  setCurrency: (currency: SupportedCurrency) => void;
  formatCurrency: (value: number) => string;
  interpolate: (text: string, variables: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children, shareCode }: { children: ReactNode; shareCode?: string }) {
  const preferences = getActivePreferences();
  const [locale, setLocaleState] = useState<SupportedLocale>(preferences.locale);
  const [currency, setCurrencyState] = useState<SupportedCurrency>(preferences.currency);

  // Update translations when locale changes
  const t = getTranslations(locale);

  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    if (shareCode) {
      setActivePreferences(shareCode, { locale: newLocale, currency });
    } else {
      localStorage.setItem('app_preferences', JSON.stringify({ locale: newLocale, currency }));
    }
  };

  const setCurrency = (newCurrency: SupportedCurrency) => {
    setCurrencyState(newCurrency);
    if (shareCode) {
      setActivePreferences(shareCode, { locale, currency: newCurrency });
    } else {
      localStorage.setItem('app_preferences', JSON.stringify({ locale, currency: newCurrency }));
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  // Listen for storage changes to sync across tabs
  useEffect(() => {
    const handleStorageChange = () => {
      const newPreferences = getActivePreferences();
      setLocaleState(newPreferences.locale);
      setCurrencyState(newPreferences.currency);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <I18nContext.Provider value={{ 
      locale, 
      currency, 
      t, 
      setLocale, 
      setCurrency, 
      formatCurrency,
      interpolate,
    }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    // Return default values if used outside provider
    const preferences = getActivePreferences();
    const t = getTranslations(preferences.locale);
    return {
      locale: preferences.locale,
      currency: preferences.currency,
      t,
      setLocale: () => {},
      setCurrency: () => {},
      formatCurrency: (value: number) => new Intl.NumberFormat(preferences.locale, {
        style: 'currency',
        currency: preferences.currency,
      }).format(value),
      interpolate,
    };
  }
  return context;
}
