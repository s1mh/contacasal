import { forwardRef, useState, useEffect, useCallback } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

// Format number to Brazilian Real display (e.g., 2088.50 -> "2.088,50")
const formatToDisplay = (value: number): string => {
  if (value === 0) return '';
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Parse display string to number (e.g., "2.088,50" -> 2088.50)
const parseToNumber = (display: string): number => {
  // Remove all non-numeric characters except comma
  const cleaned = display.replace(/[^\d,]/g, '');
  // Replace comma with dot for parsing
  const normalized = cleaned.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, placeholder = '0,00', disabled }, ref) => {
    const [displayValue, setDisplayValue] = useState(() => formatToDisplay(value));
    const [isFocused, setIsFocused] = useState(false);

    // Sync display with external value only when not focused
    useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatToDisplay(value));
      }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      
      // Allow only numbers and comma
      const cleaned = input.replace(/[^\d,]/g, '');
      
      // Limit to one comma
      const parts = cleaned.split(',');
      let formatted = parts[0];
      if (parts.length > 1) {
        // Limit decimal places to 2
        formatted += ',' + parts[1].slice(0, 2);
      }
      
      setDisplayValue(formatted);
    };

    const handleFocus = () => {
      setIsFocused(true);
      // Show raw value without thousands separator when focused
      if (value > 0) {
        setDisplayValue(value.toFixed(2).replace('.', ','));
      }
    };

    const handleBlur = () => {
      setIsFocused(false);
      const numericValue = parseToNumber(displayValue);
      
      // Limit to reasonable amount (R$ 999,999.99)
      const clampedValue = Math.min(numericValue, 999999.99);
      
      // Update parent with final value
      onChange(clampedValue);
      
      // Format display
      setDisplayValue(formatToDisplay(clampedValue));
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(className)}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
