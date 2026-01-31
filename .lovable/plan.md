
# Plano de Correção: Gastos Parcelados

## Problemas Identificados

### Problema 1: Parcelas pulando meses
**Causa**: No `NewExpense.tsx`, quando cria parcelas, a `expense_date` das parcelas 2+ é definida como o `billing_month` (mês da fatura), não a data original da compra. Então:
- Parcela 01/12: `expense_date` = 31/01 (data da compra) 
- Parcela 02/12: `expense_date` = Março (billing_month)
- Fevereiro fica vazio porque nenhuma parcela tem `expense_date` em fevereiro

O correto é usar `billing_month` para filtrar gastos de crédito, não `expense_date`.

### Problema 2: Notificações duplicadas
**Causa**: No `NewExpense.tsx`, há um loop que chama `addExpense` para cada parcela (12 vezes para 12x). Cada `addExpense` mostra um toast e chama `refetch()`. Resultado: 12 toasts + 12 recarregamentos da página.

### Problema 3: Exclusão sem opções
**Causa**: O botão de excluir deleta apenas a parcela clicada, sem perguntar se quer apagar todas ou selecionar quais.

---

## Solução 1: Corrigir Filtro de Parcelas

### Alterações em `src/pages/History.tsx`:

Modificar o filtro para usar `billing_month` quando disponível (gastos de crédito):

```typescript
const filteredExpenses = useMemo(() => {
  return couple.expenses.filter((expense) => {
    // Para gastos de crédito com billing_month, usar billing_month para filtrar
    // Para outros gastos, usar expense_date
    const dateToCheck = expense.billing_month 
      ? parseISO(expense.billing_month) 
      : parseISO(expense.expense_date);
    
    const inMonth = isWithinInterval(dateToCheck, { start: monthStart, end: monthEnd });
    const matchesTag = !selectedTagId || expense.tag_id === selectedTagId;
    return inMonth && matchesTag;
  });
}, [couple.expenses, monthStart, monthEnd, selectedTagId]);
```

### Alterações em `src/pages/NewExpense.tsx`:

Manter `expense_date` sempre como a data original da compra. O `billing_month` já está correto para cada parcela:

```typescript
// Linha 132-134 - Manter expense_date como a data original para TODAS as parcelas
expense_date: expenseDate.toISOString().split('T')[0], // Sempre a data original
billing_month: expenseBillingMonth?.toISOString().split('T')[0] || null, // Este já varia por parcela
```

---

## Solução 2: Evitar Notificações Duplicadas

### Alterações em `src/contexts/CoupleContext.tsx`:

Criar nova função `addExpenses` (plural) que insere múltiplas despesas de uma vez:

```typescript
const addExpenses = async (expenses: Omit<Expense, 'id' | 'couple_id' | 'created_at'>[]) => {
  if (!couple || expenses.length === 0) return;
  
  // Validar todas
  for (const expense of expenses) {
    const validationError = validateExpense(expense);
    if (validationError) {
      toast({ title: validationError, variant: 'destructive' });
      return;
    }
  }

  // Optimistic update - adicionar todas de uma vez
  const tempExpenses: Expense[] = expenses.map((expense, index) => ({
    ...expense,
    id: `temp-${Date.now()}-${index}`,
    couple_id: couple.id,
    created_at: new Date().toISOString(),
  }));

  setCouple(prev => {
    if (!prev) return prev;
    return {
      ...prev,
      expenses: [...tempExpenses, ...prev.expenses],
    };
  });

  try {
    // Inserir todas de uma vez no banco
    const { error } = await supabase.from('expenses').insert(
      expenses.map(e => ({ couple_id: couple.id, ...e }))
    );
    if (error) throw error;
    
    // Uma única notificação
    const isInstallment = expenses.length > 1;
    toast({ 
      title: isInstallment ? `Parcelamento registrado! 💳` : 'Gasto registrado! 💸',
      description: isInstallment 
        ? `${expenses.length}x adicionados` 
        : 'Já está na conta do casal'
    });
    
    // Um único refetch
    await refetch();
  } catch (err) {
    console.error('Error adding expenses:', err);
    toast({ 
      title: 'Ops! Algo deu errado',
      description: 'Não foi possível registrar',
      variant: 'destructive' 
    });
    // Reverter
    setCouple(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        expenses: prev.expenses.filter(e => !e.id.startsWith('temp-')),
      };
    });
  }
};
```

### Alterações em `src/pages/NewExpense.tsx`:

Usar `addExpenses` em vez de loop com `addExpense`:

```typescript
const handleSubmit = async () => {
  if (!numericAmount) return;

  setLoading(true);
  try {
    const installmentAmount = numericAmount / installments;
    
    // Criar array de todas as parcelas
    const expensesToAdd = [];
    for (let i = 0; i < installments; i++) {
      let expenseBillingMonth = billingMonth;
      if (billingMonth && i > 0) {
        expenseBillingMonth = addMonths(billingMonth, i);
      }

      expensesToAdd.push({
        description: installments > 1 
          ? `${description || 'Compra'} (${i + 1}/${installments})`
          : description || null,
        total_amount: installmentAmount,
        paid_by: paidBy,
        split_type: splitType,
        split_value: splitType === 'fixed' 
          ? { person1: splitPreview.person1 / installments, person2: splitPreview.person2 / installments }
          : splitValue,
        tag_id: selectedTagId,
        expense_date: expenseDate.toISOString().split('T')[0], // Data original para todas
        payment_type: paymentType,
        card_id: paymentType === 'credit' ? selectedCardId : null,
        billing_month: expenseBillingMonth?.toISOString().split('T')[0] || null,
        installments: installments,
        installment_number: i + 1,
      });
    }
    
    // Adicionar todas de uma vez
    await addExpenses(expensesToAdd);
    navigate(`/c/${shareCode}`);
  } finally {
    setLoading(false);
  }
};
```

---

## Solução 3: Pop-up para Exclusão de Parcelas

### Criar componente `src/components/DeleteExpenseDialog.tsx`:

```typescript
import { useState } from 'react';
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
  relatedExpenses: Expense[]; // Todas as parcelas do mesmo parcelamento
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
            <AlertDialogAction onClick={onDeleteSingle} className="bg-destructive text-destructive-foreground">
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
            .sort((a, b) => a.installment_number - b.installment_number)
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
            className="bg-destructive text-destructive-foreground"
          >
            Apagar {selectedIds.length} parcela{selectedIds.length > 1 ? 's' : ''}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Alterações em `src/contexts/CoupleContext.tsx`:

Adicionar função para deletar múltiplas despesas:

```typescript
const deleteExpenses = async (expenseIds: string[]) => {
  const previousExpenses = couple?.expenses || [];

  // Optimistic update
  setCouple(prev => {
    if (!prev) return prev;
    return {
      ...prev,
      expenses: prev.expenses.filter(e => !expenseIds.includes(e.id)),
    };
  });

  try {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .in('id', expenseIds);
    if (error) throw error;
    
    toast({ 
      title: expenseIds.length > 1 ? 'Parcelas removidas! 🗑️' : 'Gasto removido! 🗑️',
      description: expenseIds.length > 1 ? `${expenseIds.length} parcelas removidas` : 'Retirado da conta'
    });
  } catch (err) {
    console.error('Error deleting expenses:', err);
    toast({ 
      title: 'Ops! Algo deu errado',
      description: 'Não foi possível remover',
      variant: 'destructive' 
    });
    // Revert
    setCouple(prev => {
      if (!prev) return prev;
      return { ...prev, expenses: previousExpenses };
    });
  }
};
```

### Alterações em `src/pages/History.tsx`:

Integrar o diálogo de exclusão:

```typescript
// Adicionar estados
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

// Função para encontrar parcelas relacionadas
const getRelatedExpenses = (expense: Expense) => {
  if (expense.installments <= 1) return [expense];
  
  // Encontrar todas as parcelas do mesmo parcelamento
  // Baseado em: mesma descrição base, mesmo card_id, mesmo tag_id, mesmo installments
  const baseDescription = expense.description?.replace(/\s*\(\d+\/\d+\)$/, '') || '';
  
  return couple.expenses.filter(e => {
    if (e.installments !== expense.installments) return false;
    if (e.card_id !== expense.card_id) return false;
    if (e.tag_id !== expense.tag_id) return false;
    const eBaseDesc = e.description?.replace(/\s*\(\d+\/\d+\)$/, '') || '';
    return eBaseDesc === baseDescription;
  });
};

// Modificar o ExpenseCard para usar o diálogo
<ExpenseCard
  expense={expense}
  profiles={couple.profiles}
  tags={couple.tags}
  cards={couple.cards}
  onDelete={() => {
    setExpenseToDelete(expense);
    setDeleteDialogOpen(true);
  }}
/>

// Adicionar o diálogo no final do componente
{expenseToDelete && (
  <DeleteExpenseDialog
    expense={expenseToDelete}
    relatedExpenses={getRelatedExpenses(expenseToDelete)}
    open={deleteDialogOpen}
    onOpenChange={(open) => {
      setDeleteDialogOpen(open);
      if (!open) setExpenseToDelete(null);
    }}
    onDeleteSingle={() => deleteExpense(expenseToDelete.id)}
    onDeleteMultiple={(ids) => deleteExpenses(ids)}
  />
)}
```

---

## Resumo de Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/NewExpense.tsx` | Manter `expense_date` original para todas parcelas + usar `addExpenses` |
| `src/pages/History.tsx` | Filtrar por `billing_month` quando disponível + integrar diálogo de exclusão |
| `src/contexts/CoupleContext.tsx` | Adicionar `addExpenses` e `deleteExpenses` (plural) |
| `src/components/DeleteExpenseDialog.tsx` | **CRIAR** - Pop-up com opções para parcelamentos |

---

## Resultado Esperado

1. **Parcelas em sequência**: Todas as 12 parcelas aparecerão em meses consecutivos (Mar, Abr, Mai...)
2. **Uma única notificação**: Ao adicionar parcelamento, apenas 1 toast "Parcelamento registrado! 12x"
3. **Exclusão inteligente**: Pop-up perguntando se quer apagar todas ou selecionar quais parcelas

