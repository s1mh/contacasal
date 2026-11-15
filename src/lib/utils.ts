import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Converte "YYYY-MM-DD" em uma data LOCAL (meia-noite no fuso do usuário).
// `new Date('2026-11-14')` interpreta a string como UTC e, no Brasil (UTC-3),
// vira 13/11 às 21h: o gasto aparece um dia antes e pode cair no mês errado.
export function parseDateOnly(value: string | Date): Date {
  if (value instanceof Date) return value;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

// Check if a profile has been configured (not default placeholder names)
export function isConfiguredProfile(profile: { name: string }): boolean {
  return profile.name !== 'Pessoa 1' && profile.name !== 'Pessoa 2' && profile.name !== 'Pessoa';
}

// Mask a currency value with asterisks based on length
// Examples: R$ 150,00 → ******, R$ 1.500,00 → ********
export function maskCurrencyValue(formattedValue: string): string {
  // Remove currency symbol and spaces to get just the number part
  const numberPart = formattedValue.replace(/[^\d,.-]/g, '').trim();
  // Generate asterisks based on the length of the number
  const asterisks = '*'.repeat(Math.max(numberPart.length, 4));
  // Return with the same currency symbol prefix if present
  const currencyMatch = formattedValue.match(/^[^\d-]*/);
  const currencySymbol = currencyMatch ? currencyMatch[0] : '';
  return currencySymbol + asterisks;
}
