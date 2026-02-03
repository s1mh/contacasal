import { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Expense, Profile, Tag } from '@/hooks/useCouple';
import { formatCurrency } from '@/lib/constants';
import { isConfiguredProfile } from '@/lib/utils';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { getCurrencySymbol, getDateFnsLocale } from '@/lib/preferences';
import { usePreferences } from '@/contexts/PreferencesContext';

interface ChartsProps {
  expenses: Expense[];
  profiles: Profile[];
  tags: Tag[];
}

export function ExpensesByTagChart({ expenses, tags }: { expenses: Expense[]; tags: Tag[] }) {
  const { t: prefT } = usePreferences();
  const data = useMemo(() => {
    const byTag = expenses.reduce((acc, expense) => {
      const tagId = expense.tag_id || 'other';
      acc[tagId] = (acc[tagId] || 0) + expense.total_amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(byTag)
      .map(([tagId, amount]) => {
        const tag = tags.find(t => t.id === tagId);
        return {
          name: tag?.name || 'Outros',
          value: amount,
          color: tag?.color || '#6B7280',
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [expenses, tags]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        {prefT('Sem dados para exibir')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2 text-xs">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.name}</span>
            <span className="text-muted-foreground">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExpensesByPersonChart({ expenses, profiles }: { expenses: Expense[]; profiles: Profile[] }) {
  const { t: prefT } = usePreferences();
  const data = useMemo(() => {
    const configuredProfiles = profiles.filter(isConfiguredProfile);
    
    const byPerson = configuredProfiles.map(profile => {
      const personExpenses = expenses.filter(e => e.paid_by === profile.position);
      const total = personExpenses.reduce((sum, e) => sum + e.total_amount, 0);
      return {
        name: profile.name,
        value: total,
        color: profile.color,
      };
    });
    return byPerson;
  }, [expenses, profiles]);

  if (expenses.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        {prefT('Sem dados para exibir')}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
        <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} hide />
        <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
        <Tooltip 
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
        />
        <Bar dataKey="value" radius={[0, 8, 8, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyEvolutionChart({ expenses }: { expenses: Expense[] }) {
  const { t: prefT, locale: prefLocale, currency } = usePreferences();
  const dateLocale = getDateFnsLocale(prefLocale);
  const currencySymbol = getCurrencySymbol(prefLocale, currency);
  const compactFormatter = new Intl.NumberFormat(prefLocale, { maximumFractionDigits: 0 });

  const data = useMemo(() => {
    const months: { month: Date; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(new Date(), i);
      months.push({
        month: startOfMonth(month),
        label: format(month, 'MMM', { locale: dateLocale }),
      });
    }

    return months.map(({ month, label }) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthExpenses = expenses.filter(e => {
        const expenseDate = new Date(e.expense_date);
        return isWithinInterval(expenseDate, { start: monthStart, end: monthEnd });
      });
      const total = monthExpenses.reduce((sum, e) => sum + e.total_amount, 0);
      return { name: label, value: total };
    });
  }, [expenses, dateLocale]);

  if (expenses.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        {prefT('Sem dados para exibir')}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ left: 0, right: 10, top: 10 }}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis
          tickFormatter={(value) => `${currencySymbol}${compactFormatter.format(value / 1000)}k`}
          tick={{ fontSize: 10 }}
          width={60}
        />
        <Tooltip 
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
        />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke="hsl(var(--primary))" 
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--primary))' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Charts({ expenses, profiles, tags }: ChartsProps) {
  const { t: prefT } = usePreferences();
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">{prefT('Gastos por Categoria')}</h3>
        <ExpensesByTagChart expenses={expenses} tags={tags} />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">{prefT('Gastos por Pessoa')}</h3>
        <ExpensesByPersonChart expenses={expenses} profiles={profiles} />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">{prefT('Evolução Mensal')}</h3>
        <MonthlyEvolutionChart expenses={expenses} />
      </div>
    </div>
  );
}
