import { useState } from 'react';
import { format, isToday, isYesterday, isTomorrow } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDateFnsLocale } from '@/lib/preferences';
import { usePreferences } from '@/contexts/PreferencesContext';

interface DatePickerFieldProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
}

export function DatePickerField({ value, onChange, label }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const { locale: prefLocale, t: prefT } = usePreferences();
  const dateLocale = getDateFnsLocale(prefLocale);
  const relativeFormatter = new Intl.RelativeTimeFormat(prefLocale, { numeric: 'auto' });
  const selectDateLabel = prefT('Selecionar data');

  const getDisplayDate = (date: Date) => {
    if (isToday(date)) return relativeFormatter.format(0, 'day');
    if (isYesterday(date)) return relativeFormatter.format(-1, 'day');
    if (isTomorrow(date)) return relativeFormatter.format(1, 'day');
    return format(date, "d 'de' MMM", { locale: dateLocale });
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-muted-foreground">{label}</label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? getDisplayDate(value) : selectDateLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              if (date) {
                onChange(date);
                setOpen(false);
              }
            }}
            locale={dateLocale}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
