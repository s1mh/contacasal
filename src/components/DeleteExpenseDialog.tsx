import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Expense } from '@/contexts/CoupleContext';
import { format, parseISO } from 'date-fns';
import { getDateFnsLocale } from '@/lib/preferences';
import { useI18n } from '@/contexts/I18nContext';

interface DeleteExpenseDialogProps {
  expense: Expense;
  relatedExpenses: Expense[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteSingle: () => void;
  onDeleteMultiple: (expenseIds: string[]) => void;
}

export function DeleteExpenseDialog({
  expense,
  relatedExpenses,
  open,
  onOpenChange,
  onDeleteSingle,
  onDeleteMultiple,
}: DeleteExpenseDialogProps) {
  const { t, locale, formatCurrency, interpolate } = useI18n();
  const [selectedIds, setSelectedIds] = useState<string[]>([expense.id]);
  const [mode, setMode] = useState<'confirm' | 'select'>('confirm');
  const dateLocale = getDateFnsLocale(locale);
  
  const isInstallment = expense.installments > 1;
  const hasMultipleInstallments = relatedExpenses.length > 1;

  // Reset state when expense changes
  useEffect(() => {
    setSelectedIds([expense.id]);
    setMode('confirm');
  }, [expense.id]);

  const handleDeleteAll = () => {
    onDeleteMultiple(relatedExpenses.map(e => e.id));
    onOpenChange(false);
  };

  const handleDeleteSelected = () => {
    onDeleteMultiple(selectedIds);
    onOpenChange(false);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  // Gasto simples - confirmação direta
  if (!isInstallment || !hasMultipleInstallments) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteExpense.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {interpolate(t.deleteExpense.willBeRemoved, {
                description: expense.description || t.expenses.description,
                amount: formatCurrency(expense.total_amount)
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteSingle} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Gasto parcelado - opções
  if (mode === 'confirm') {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteExpense.titleInstallment}</AlertDialogTitle>
            <AlertDialogDescription>
              {interpolate(t.deleteExpense.hasInstallments, { count: expense.installments.toString() })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 py-4">
            <button
              onClick={handleDeleteAll}
              className="p-3 rounded-xl border-2 border-destructive/50 hover:bg-destructive/10 text-left transition-colors"
            >
              <p className="font-medium text-destructive">{t.deleteExpense.deleteAll}</p>
              <p className="text-xs text-muted-foreground">
                {interpolate(t.deleteExpense.deleteAllDesc, { count: relatedExpenses.length.toString() })}
              </p>
            </button>
            <button
              onClick={() => setMode('select')}
              className="p-3 rounded-xl border-2 border-border hover:border-primary/50 text-left transition-colors"
            >
              <p className="font-medium">{t.deleteExpense.selectInstallments}</p>
              <p className="text-xs text-muted-foreground">
                {t.deleteExpense.selectInstallmentsDesc}
              </p>
            </button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Modo seleção de parcelas
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>{t.deleteExpense.selectTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.deleteExpense.selectDesc}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-4">
          {relatedExpenses
            .sort((a, b) => (a.installment_number || 1) - (b.installment_number || 1))
            .map((exp) => (
              <label
                key={exp.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={selectedIds.includes(exp.id)}
                  onCheckedChange={() => toggleSelection(exp.id)}
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {t.deleteExpense.installment} {exp.installment_number}/{exp.installments}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {exp.billing_month 
                      ? format(parseISO(exp.billing_month), 'MMMM yyyy', { locale: dateLocale })
                      : format(parseISO(exp.expense_date), 'MMMM yyyy', { locale: dateLocale })
                    }
                  </p>
                </div>
                <span className="font-medium">{formatCurrency(exp.total_amount)}</span>
              </label>
            ))}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setMode('confirm')}>{t.common.back}</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {interpolate(t.deleteExpense.deleteCount, { count: selectedIds.length.toString() })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
