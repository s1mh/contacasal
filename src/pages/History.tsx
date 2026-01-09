import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Calendar, Filter } from 'lucide-react';
import { ExpenseCard } from '@/components/ExpenseCard';
import { TagPill } from '@/components/TagPill';
import { Couple, useCouple } from '@/hooks/useCouple';
import { formatCurrency } from '@/lib/constants';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function History() {
  const { couple } = useOutletContext<{ couple: Couple }>();
  const { deleteExpense } = useCouple();
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  const filteredExpenses = useMemo(() => {
    return couple.expenses.filter((expense) => {
      const expenseDate = parseISO(expense.expense_date);
      const inMonth = isWithinInterval(expenseDate, { start: monthStart, end: monthEnd });
      const matchesTag = !selectedTagId || expense.tag_id === selectedTagId;
      return inMonth && matchesTag;
    });
  }, [couple.expenses, monthStart, monthEnd, selectedTagId]);

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.total_amount, 0);
  }, [filteredExpenses]);

  const navigateMonth = (direction: number) => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  return (
    <div className="p-4 safe-top">
      {/* Header */}
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

      {/* Month Summary */}
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

      {/* Tag Filter */}
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

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 text-center shadow-glass">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            Nenhum gasto encontrado
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedTagId ? 'Tente remover o filtro' : 'Neste período'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              profiles={couple.profiles}
              tags={couple.tags}
              onDelete={() => deleteExpense(expense.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
