import { ptBR } from './translations/pt-BR';
import { enUS } from './translations/en-US';
import { esES } from './translations/es-ES';
import type { SupportedLocale } from '../preferences';

export type TranslationKeys = typeof ptBR;

const translations: Record<SupportedLocale, TranslationKeys> = {
  'pt-BR': ptBR,
  'en-US': enUS,
  'es-ES': esES,
};

export const getTranslations = (locale: SupportedLocale): TranslationKeys => {
  return translations[locale] || translations['pt-BR'];
};

// Helper to interpolate variables in strings like "{name} owes"
export const interpolate = (text: string, variables: Record<string, string>): string => {
  return text.replace(/\{(\w+)\}/g, (_, key) => variables[key] || `{${key}}`);
};

export { ptBR, enUS, esES };
