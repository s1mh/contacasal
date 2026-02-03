import { forwardRef, useState, useEffect } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';
import { getActivePreferences, getCurrencySymbol } from '@/lib/preferences';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  showPrefix?: boolean;
}

// Format cents to display string (e.g., 70000 cents -> "700,00")
const formatCentsToDisplay = (
  cents: number,
  showPrefix: boolean,
  locale: string,
  currencySymbol: string
): string => {
  if (cents === 0) return '';
  const amount = cents / 100;
  const formatted = amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return showPrefix ? `${currencySymbol} ${formatted}` : formatted;
};

// Convert value (in reais) to cents for internal use
const reaisToCents = (reais: number): number => Math.round(reais * 100);

// Convert cents to reais for external use
const centsToReais = (cents: number): number => cents / 100;

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    { value, onChange, className, placeholder, disabled, showPrefix = true },
    ref
  ) => {
    const { locale, currency } = getActivePreferences();
    const currencySymbol = getCurrencySymbol(locale, currency);
    const formattedZero = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(0);
    const resolvedPlaceholder =
      placeholder ?? (showPrefix ? `${currencySymbol} ${formattedZero}` : formattedZero);
    // Store value internally as cents (integer) for precise formatting
    const [cents, setCents] = useState(() => reaisToCents(value));

    // Sync with external value
    useEffect(() => {
      setCents(reaisToCents(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Extract only digits from input
      const digits = e.target.value.replace(/\D/g, '');

      // Convert to cents (as integer)
      let newCents = parseInt(digits, 10) || 0;

      // Limit to max value (R$ 999.999,99 = 99999999 cents)
      newCents = Math.min(newCents, 99999999);

      setCents(newCents);
      onChange(centsToReais(newCents));
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={formatCentsToDisplay(cents, showPrefix, locale, currencySymbol)}
        onChange={handleChange}
        placeholder={resolvedPlaceholder}
        disabled={disabled}
        className={cn(className)}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
