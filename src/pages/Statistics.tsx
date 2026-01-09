import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Couple } from '@/hooks/useCouple';
import { Charts, ExpensesByTagChart, ExpensesByPersonChart, MonthlyEvolutionChart } from '@/components/Charts';
import { ExportButton } from '@/components/ExportButton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, PieChart, TrendingUp, Users } from 'lucide-react';
import { subMonths, startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/constants';

type Period = 'current' | 'last3' | 'last6' | 'year' | 'all';

export default function Statistics() {
  const { couple } = useOutletContext<{ couple: Couple }>();
  const [period, setPeriod] = useState<Period>('current');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  const filteredExpenses = useMemo(() => {
    let expenses = couple.expenses;

    // Filter by period
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date = endOfMonth(now);

    switch (period) {
      case 'current':
        startDate = startOfMonth(now);
        break;
      case 'last3':
        startDate = startOfMonth(subMonths(now, 2));
        break;
      case 'last6':
        startDate = startOfMonth(subMonths(now, 5));
        break;
      case 'year':
        startDate = startOfMonth(subMonths(now, 11));
        break;
      case 'all':
        startDate = null;
        break;
    }

    if (startDate) {
      expenses = expenses.filter(e => {
        const expenseDate = new Date(e.expense_date);
        return isWithinInterval(expenseDate, { start: startDate!, end: endDate });
      });
    }

    // Filter by tag
    if (selectedTag !== 'all') {
      expenses = expenses.filter(e => e.tag_id === selectedTag);
    }

    return expenses;
  }, [couple.expenses, period, selectedTag]);

  const stats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, e) => sum + e.total_amount, 0);
    const avgPerExpense = filteredExpenses.length > 0 ? total / filteredExpenses.length : 0;
    
    const byPerson = couple.profiles.map(p => {
      const personTotal = filteredExpenses
        .filter(e => e.paid_by === p.position)
        .reduce((sum, e) => sum + e.total_amount, 0);
      return { name: p.name, total: personTotal, color: p.color };
    });

    return { total, avgPerExpense, byPerson, count: filteredExpenses.length };
  }, [filteredExpenses, couple.profiles]);

  const periodLabel = useMemo(() => {
    switch (period) {
      case 'current': return format(new Date(), 'MMMM yyyy', { locale: ptBR });
      case 'last3': return 'Últimos 3 meses';
      case 'last6': return 'Últimos 6 meses';
      case 'year': return 'Último ano';
      case 'all': return 'Todo período';
    }
  }, [period]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          Estatísticas
        </h1>
        <ExportButton 
          expenses={filteredExpenses} 
          profiles={couple.profiles} 
          tags={couple.tags}
          period={periodLabel}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Mês atual</SelectItem>
            <SelectItem value="last3">3 meses</SelectItem>
            <SelectItem value="last6">6 meses</SelectItem>
            <SelectItem value="year">12 meses</SelectItem>
            <SelectItem value="all">Tudo</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedTag} onValueChange={setSelectedTag}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {couple.tags.map(tag => (
              <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border">
          <p className="text-xs text-muted-foreground mb-1">Total gasto</p>
          <p className="text-xl font-bold text-primary">{formatCurrency(stats.total)}</p>
          <p className="text-xs text-muted-foreground mt-1">{stats.count} despesa(s)</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border">
          <p className="text-xs text-muted-foreground mb-1">Média por gasto</p>
          <p className="text-xl font-bold">{formatCurrency(stats.avgPerExpense)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="space-y-6">
        {/* By Tag */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">Por Categoria</h3>
          </div>
          <ExpensesByTagChart expenses={filteredExpenses} tags={couple.tags} />
        </div>

        {/* By Person */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">Por Pessoa</h3>
          </div>
          <ExpensesByPersonChart expenses={filteredExpenses} profiles={couple.profiles} />
        </div>

        {/* Monthly Evolution */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">Evolução Mensal</h3>
          </div>
          <MonthlyEvolutionChart expenses={couple.expenses} />
        </div>
      </div>
    </div>
  );
}
