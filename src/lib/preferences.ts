import { enUS, es, ptBR } from 'date-fns/locale';

export type SupportedLocale = 'pt-BR' | 'en-US' | 'es-ES';
export type SupportedCurrency = 'BRL' | 'USD' | 'EUR';

export const DEFAULT_PREFERENCES = {
  locale: 'pt-BR' as SupportedLocale,
  currency: 'BRL' as SupportedCurrency,
};

const isSupportedLocale = (value: string): value is SupportedLocale =>
  value === 'pt-BR' || value === 'en-US' || value === 'es-ES';

const isSupportedCurrency = (value: string): value is SupportedCurrency =>
  value === 'BRL' || value === 'USD' || value === 'EUR';

const getShareCodeFromPath = (): string | null => {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/\/c\/([^/]+)/);
  return match?.[1] ?? null;
};

const parsePreferences = (raw: string | null) => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<typeof DEFAULT_PREFERENCES>;
    const locale = parsed.locale && isSupportedLocale(parsed.locale) ? parsed.locale : DEFAULT_PREFERENCES.locale;
    const currency = parsed.currency && isSupportedCurrency(parsed.currency) ? parsed.currency : DEFAULT_PREFERENCES.currency;
    return { locale, currency };
  } catch {
    return null;
  }
};

export const getActivePreferences = () => {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  const shareCode = getShareCodeFromPath();
  const scoped = shareCode ? parsePreferences(localStorage.getItem(`couple_preferences_${shareCode}`)) : null;
  const global = parsePreferences(localStorage.getItem('app_preferences'));
  return scoped || global || DEFAULT_PREFERENCES;
};

export const setActivePreferences = (shareCode: string, preferences: typeof DEFAULT_PREFERENCES) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`couple_preferences_${shareCode}`, JSON.stringify(preferences));
  localStorage.setItem('app_preferences', JSON.stringify(preferences));
};

export const getDateFnsLocale = (locale: SupportedLocale) => {
  switch (locale) {
    case 'en-US':
      return enUS;
    case 'es-ES':
      return es;
    case 'pt-BR':
    default:
      return ptBR;
  }
};

export const getCurrencySymbol = (locale: SupportedLocale, currency: SupportedCurrency) => {
  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
  }).formatToParts(0);
  return parts.find((part) => part.type === 'currency')?.value ?? currency;
};
