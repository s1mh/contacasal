import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Calendar, Filter, FileText } from 'lucide-react';
import { ExpenseCard } from '@/components/ExpenseCard';
import { TagPill } from '@/components/TagPill';
import { AnimatedPage, AnimatedItem } from '@/components/AnimatedPage';
import { Couple, Expense, useCoupleContext } from '@/contexts/CoupleContext';
import { formatCurrency } from '@/lib/constants';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import { DeleteExpenseDialog } from '@/components/DeleteExpenseDialog';
import { EditExpenseDialog } from '@/components/EditExpenseDialog';

export default function History() {
  const { couple } = useOutletContext<{ couple: Couple }>();
  const { deleteExpense, deleteExpenses, updateExpense } = useCoupleContext();
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  // Para gastos de crédito com billing_month, usar billing_month para filtrar
  // Para outros gastos, usar expense_date
  const filteredExpenses = useMemo(() => {
    return couple.expenses.filter((expense) => {
      const dateToCheck = expense.billing_month 
        ? parseISO(expense.billing_month) 
        : parseISO(expense.expense_date);
      const inMonth = isWithinInterval(dateToCheck, { start: monthStart, end: monthEnd });
      const matchesTag = !selectedTagId || expense.tag_id === selectedTagId;
      return inMonth && matchesTag;
    });
  }, [couple.expenses, monthStart, monthEnd, selectedTagId]);

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.total_amount, 0);
  }, [filteredExpenses]);

  // Encontrar parcelas relacionadas do mesmo parcelamento
  const getRelatedExpenses = (expense: Expense): Expense[] => {
    if (!expense.installments || expense.installments <= 1) return [expense];
    
    const baseDescription = expense.description?.replace(/\s*\(\d+\/\d+\)$/, '') || '';
    
    return couple.expenses.filter(e => {
      if (e.installments !== expense.installments) return false;
      if (e.card_id !== expense.card_id) return false;
      if (e.tag_id !== expense.tag_id) return false;
      const eBaseDesc = e.description?.replace(/\s*\(\d+\/\d+\)$/, '') || '';
      return eBaseDesc === baseDescription;
    });
  };

  const navigateMonth = (direction: number) => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  return (
    <AnimatedPage className="p-4 safe-top">
      {/* Header */}
      <AnimatedItem delay={0}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Histórico</h1>
          <div className="flex items-center gap-1 bg-muted rounded-full p-1">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-background rounded-full transition-colors"
            >
              ←
            </button>
            <span className="px-3 text-sm font-medium min-w-[100px] text-center">
              {format(selectedMonth, 'MMM yyyy', { locale: ptBR })}
            </span>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-background rounded-full transition-colors"
            >
              →
            </button>
          </div>
        </div>
      </AnimatedItem>

      {/* Month Summary */}
      <AnimatedItem delay={100}>
        <div className="bg-card rounded-3xl p-4 shadow-glass mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total do mês</p>
              <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{filteredExpenses.length} gastos</p>
            </div>
          </div>
        </div>
      </AnimatedItem>

      {/* Tag Filter */}
      <AnimatedItem delay={200}>
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filtrar por categoria</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTagId(null)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                !selectedTagId
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              Todos
            </button>
            {couple.tags.map((tag) => (
              <TagPill
                key={tag.id}
                name={tag.name}
                icon={tag.icon}
                color={tag.color}
                selected={selectedTagId === tag.id}
                onClick={() => setSelectedTagId(selectedTagId === tag.id ? null : tag.id)}
              />
            ))}
          </div>
        </div>
      </AnimatedItem>

      {/* Active Agreements - Separate section */}
      {couple.agreements.filter(a => a.is_active).length > 0 && (
        <AnimatedItem delay={250}>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Acordos recorrentes</span>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-glass space-y-3">
              {couple.agreements.filter(a => a.is_active).map((agreement) => {
                const tag = couple.tags.find(t => t.id === agreement.tag_id);
                const paidByProfile = couple.profiles.find(p => p.id === agreement.paid_by_profile_id || p.position === agreement.paid_by);
                
                return (
                  <div key={agreement.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {paidByProfile && (
                        <Avatar avatarIndex={paidByProfile.avatar_index} size="sm" ringColor={paidByProfile.color} />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          {tag && <TagPill name={tag.name} icon={tag.icon} color={tag.color} size="sm" />}
                          <span className="font-medium text-sm">{agreement.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Dia {agreement.day_of_month} de cada mês
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold">{formatCurrency(agreement.amount)}</span>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-border/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total acordos</span>
                  <span className="font-bold">
                    {formatCurrency(
                      couple.agreements.filter(a => a.is_active).reduce((sum, a) => sum + a.amount, 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </AnimatedItem>
      )}
      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <AnimatedItem delay={300}>
          <div className="bg-card rounded-2xl p-8 text-center shadow-glass">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              Nenhum gasto encontrado
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedTagId ? 'Tente remover o filtro' : 'Neste período'}
            </p>
          </div>
        </AnimatedItem>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((expense, index) => (
            <AnimatedItem key={expense.id} delay={300 + index * 50}>
              <ExpenseCard
                expense={expense}
                profiles={couple.profiles}
                tags={couple.tags}
                cards={couple.cards}
                onEdit={() => {
                  setExpenseToEdit(expense);
                  setEditDialogOpen(true);
                }}
                onDelete={() => {
                  setExpenseToDelete(expense);
                  setDeleteDialogOpen(true);
                }}
              />
            </AnimatedItem>
          ))}
        </div>
      )}

      {/* Delete Dialog */}
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

      {/* Edit Dialog */}
      {expenseToEdit && (
        <EditExpenseDialog
          expense={expenseToEdit}
          profiles={couple.profiles}
          tags={couple.tags}
          cards={couple.cards}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setExpenseToEdit(null);
          }}
          onSave={(updates) => updateExpense(expenseToEdit.id, updates)}
        />
      )}
    </AnimatedPage>
  );
}
