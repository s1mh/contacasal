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
import { usePreferences } from '@/contexts/PreferencesContext';
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
  const { formatCurrency } = useI18n();
  const [selectedIds, setSelectedIds] = useState<string[]>([expense.id]);
  const [mode, setMode] = useState<'confirm' | 'select'>('confirm');
  const { locale: prefLocale, t: prefT } = usePreferences();
  const dateLocale = getDateFnsLocale(prefLocale);
  
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
            <AlertDialogTitle>{prefT('Apagar gasto?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {prefT('{expense} de {amount} será removido.', {
                expense: expense.description || prefT('Este gasto'),
                amount: formatCurrency(expense.total_amount),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{prefT('Cancelar')}</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteSingle} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {prefT('Apagar')}
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
            <AlertDialogTitle>{prefT('Apagar parcelamento?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {prefT('Este gasto tem {count} parcelas. O que deseja fazer?', { count: expense.installments })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 py-4">
            <button
              onClick={handleDeleteAll}
              className="p-3 rounded-xl border-2 border-destructive/50 hover:bg-destructive/10 text-left transition-colors"
            >
              <p className="font-medium text-destructive">{prefT('Apagar todas as parcelas')}</p>
              <p className="text-xs text-muted-foreground">
                {prefT('Remove todas as {count} parcelas encontradas', { count: relatedExpenses.length })}
              </p>
            </button>
            <button
              onClick={() => setMode('select')}
              className="p-3 rounded-xl border-2 border-border hover:border-primary/50 text-left transition-colors"
            >
              <p className="font-medium">{prefT('Selecionar parcelas')}</p>
              <p className="text-xs text-muted-foreground">
                {prefT('Escolher quais meses apagar')}
              </p>
            </button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{prefT('Cancelar')}</AlertDialogCancel>
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
          <AlertDialogTitle>{prefT('Selecionar parcelas')}</AlertDialogTitle>
          <AlertDialogDescription>
            {prefT('Marque as parcelas que deseja apagar')}
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
                    {prefT('Parcela {current}/{total}', {
                      current: exp.installment_number,
                      total: exp.installments,
                    })}
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
          <AlertDialogCancel onClick={() => setMode('confirm')}>{prefT('Voltar')}</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {prefT('Apagar {count} parcela(s)', { count: selectedIds.length })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
