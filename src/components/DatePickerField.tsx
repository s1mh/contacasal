import { useState } from 'react';
import { format, isToday, isYesterday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerFieldProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
}

export function DatePickerField({ value, onChange, label }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);

  const getDisplayDate = (date: Date) => {
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "d 'de' MMM", { locale: ptBR });
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
            {value ? getDisplayDate(value) : "Selecionar data"}
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
            locale={ptBR}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
