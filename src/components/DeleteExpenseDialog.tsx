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
import { formatCurrency } from '@/lib/constants';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const [selectedIds, setSelectedIds] = useState<string[]>([expense.id]);
  const [mode, setMode] = useState<'confirm' | 'select'>('confirm');
  
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
            <AlertDialogTitle>Apagar gasto?</AlertDialogTitle>
            <AlertDialogDescription>
              {expense.description || 'Este gasto'} de {formatCurrency(expense.total_amount)} será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteSingle} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Apagar
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
            <AlertDialogTitle>Apagar parcelamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Este gasto tem {expense.installments} parcelas. O que deseja fazer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 py-4">
            <button
              onClick={handleDeleteAll}
              className="p-3 rounded-xl border-2 border-destructive/50 hover:bg-destructive/10 text-left transition-colors"
            >
              <p className="font-medium text-destructive">Apagar todas as parcelas</p>
              <p className="text-xs text-muted-foreground">
                Remove todas as {relatedExpenses.length} parcelas encontradas
              </p>
            </button>
            <button
              onClick={() => setMode('select')}
              className="p-3 rounded-xl border-2 border-border hover:border-primary/50 text-left transition-colors"
            >
              <p className="font-medium">Selecionar parcelas</p>
              <p className="text-xs text-muted-foreground">
                Escolher quais meses apagar
              </p>
            </button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
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
          <AlertDialogTitle>Selecionar parcelas</AlertDialogTitle>
          <AlertDialogDescription>
            Marque as parcelas que deseja apagar
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
                    Parcela {exp.installment_number}/{exp.installments}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {exp.billing_month 
                      ? format(parseISO(exp.billing_month), 'MMMM yyyy', { locale: ptBR })
                      : format(parseISO(exp.expense_date), 'MMMM yyyy', { locale: ptBR })
                    }
                  </p>
                </div>
                <span className="font-medium">{formatCurrency(exp.total_amount)}</span>
              </label>
            ))}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setMode('confirm')}>Voltar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Apagar {selectedIds.length} parcela{selectedIds.length > 1 ? 's' : ''}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
