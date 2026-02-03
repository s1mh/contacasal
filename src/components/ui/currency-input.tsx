import { forwardRef, useState, useEffect } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  showPrefix?: boolean;
}

// Format cents to display string (e.g., 70000 cents -> "700,00")
const formatCentsToDisplay = (cents: number, showPrefix: boolean): string => {
  if (cents === 0) return '';
  const reais = cents / 100;
  const formatted = reais.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return showPrefix ? `R$ ${formatted}` : formatted;
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
    const resolvedPlaceholder = placeholder ?? (showPrefix ? 'R$ 0,00' : '0,00');
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
        value={formatCentsToDisplay(cents, showPrefix)}
        onChange={handleChange}
        placeholder={resolvedPlaceholder}
        disabled={disabled}
        className={cn(className)}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
