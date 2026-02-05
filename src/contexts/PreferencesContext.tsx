import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import {
  DEFAULT_PREFERENCES,
  getActivePreferences,
  setActivePreferences,
  setGlobalPreferences,
  SupportedCurrency,
} from '@/lib/preferences';
import { SupportedLocale, translate } from '@/lib/i18n';

interface PreferencesContextValue {
  locale: SupportedLocale;
  currency: SupportedCurrency;
  setLocale: (locale: SupportedLocale) => void;
  setCurrency: (currency: SupportedCurrency) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
  valuesHidden: boolean;
  setValuesHidden: (hidden: boolean) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children, shareCode }: { children: ReactNode; shareCode?: string }) {
  const initial = getActivePreferences();
  const [locale, setLocaleState] = useState<SupportedLocale>(initial.locale);
  const [currency, setCurrencyState] = useState<SupportedCurrency>(initial.currency);
  const [valuesHidden, setValuesHiddenState] = useState<boolean>(() => 
    localStorage.getItem('values_hidden') === 'true'
  );

  const setValuesHidden = (hidden: boolean) => {
    setValuesHiddenState(hidden);
    localStorage.setItem('values_hidden', String(hidden));
  };

  useEffect(() => {
    if (shareCode) {
      setActivePreferences(shareCode, { locale, currency });
    } else {
      setGlobalPreferences({ locale, currency });
    }
  }, [shareCode, locale, currency]);

  const value = useMemo(
    () => ({
      locale,
      currency,
      setLocale: setLocaleState,
      setCurrency: setCurrencyState,
      t: (key: string, variables?: Record<string, string | number>) =>
        translate(locale, key, variables),
      valuesHidden,
      setValuesHidden,
    }),
    [locale, currency, valuesHidden]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    return {
      locale: DEFAULT_PREFERENCES.locale,
      currency: DEFAULT_PREFERENCES.currency,
      setLocale: () => undefined,
      setCurrency: () => undefined,
      t: (key: string) => key,
      valuesHidden: false,
      setValuesHidden: () => undefined,
    };
  }
  return context;
}
