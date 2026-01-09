import { forwardRef, useState, useEffect } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, placeholder = '0,00', disabled }, ref) => {
    const [displayValue, setDisplayValue] = useState('');

    // Format number to display string (e.g., 50000 cents -> "500,00")
    const formatToDisplay = (cents: number): string => {
      if (cents === 0) return '';
      return (cents / 100).toFixed(2).replace('.', ',');
    };

    // Parse display string to cents
    const parseToNumber = (display: string): number => {
      const numbers = display.replace(/\D/g, '');
      return parseInt(numbers || '0', 10);
    };

    // Sync internal display with external value
    useEffect(() => {
      const cents = Math.round(value * 100);
      setDisplayValue(formatToDisplay(cents));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const cents = parseToNumber(input);
      
      // Limit to reasonable amount (R$ 999,999.99)
      if (cents > 99999999) return;
      
      setDisplayValue(formatToDisplay(cents));
      onChange(cents / 100);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(className)}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
