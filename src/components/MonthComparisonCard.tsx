 import { useMemo } from 'react';
 import { TrendingUp, TrendingDown, Minus, Eye, EyeOff } from 'lucide-react';
 import { startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval } from 'date-fns';
 import { usePreferences } from '@/contexts/PreferencesContext';
 import { useI18n } from '@/contexts/I18nContext';
 import { cn, maskCurrencyValue } from '@/lib/utils';
 import { Expense, Agreement } from '@/contexts/CoupleContext';
 
 interface MonthComparisonCardProps {
   expenses: Expense[];
   agreements: Agreement[];
 }
 
export function MonthComparisonCard({ expenses = [], agreements = [] }: MonthComparisonCardProps) {
  const { t: prefT, valuesHidden, setValuesHidden } = usePreferences();
  const { formatCurrency } = useI18n();
  
  const { currentTotal, previousTotal, percentChange, trend } = useMemo(() => {
    // Defensive check for undefined arrays
    const safeExpenses = expenses || [];
    const safeAgreements = agreements || [];
    
    const now = new Date();
    const currentStart = startOfMonth(now);
    const currentEnd = endOfMonth(now);
    const prevMonth = subMonths(now, 1);
    const prevStart = startOfMonth(prevMonth);
    const prevEnd = endOfMonth(prevMonth);
    
    const agreementsTotal = safeAgreements
      .filter(a => a?.is_active)
      .reduce((sum, a) => sum + (a?.amount || 0), 0);
    
    const currentExpenses = safeExpenses
      .filter(e => {
        if (!e?.expense_date) return false;
        try {
          const date = e.billing_month ? parseISO(e.billing_month) : parseISO(e.expense_date);
          return isWithinInterval(date, { start: currentStart, end: currentEnd });
        } catch {
          return false;
        }
      })
      .reduce((sum, e) => sum + (e?.total_amount || 0), 0);
    
    const prevExpenses = safeExpenses
      .filter(e => {
        if (!e?.expense_date) return false;
        try {
          const date = e.billing_month ? parseISO(e.billing_month) : parseISO(e.expense_date);
          return isWithinInterval(date, { start: prevStart, end: prevEnd });
        } catch {
          return false;
        }
      })
      .reduce((sum, e) => sum + (e?.total_amount || 0), 0);
    
    const current = currentExpenses + agreementsTotal;
    const previous = prevExpenses + agreementsTotal;
    
    if (previous === 0) {
      return { currentTotal: current, previousTotal: previous, percentChange: 0, trend: 'neutral' as const };
    }
    
    const change = ((current - previous) / previous) * 100;
    const trendValue = change > 2 ? 'up' : change < -2 ? 'down' : 'neutral';
    
    return { 
      currentTotal: current, 
      previousTotal: previous, 
      percentChange: Math.abs(Math.round(change)),
      trend: trendValue as 'up' | 'down' | 'neutral'
    };
  }, [expenses, agreements]);
   
   const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
   
   return (
     <div className="bg-card rounded-3xl p-4 shadow-glass">
       <div className="flex items-center gap-2 mb-3">
         <TrendIcon className={cn(
           "w-5 h-5",
           trend === 'up' && "text-destructive",
           trend === 'down' && "text-green-500",
           trend === 'neutral' && "text-muted-foreground"
         )} />
         <span className="text-sm font-medium text-muted-foreground">
           {prefT('Comparado ao mês passado')}
         </span>
       </div>
       
       {previousTotal === 0 ? (
         <p className="text-sm text-muted-foreground text-center py-2">
           {prefT('Sem dados do mês anterior')}
         </p>
       ) : (
         <div className="space-y-2">
           <div className="flex items-baseline gap-2">
             <span className={cn(
               "text-2xl font-bold",
               trend === 'up' && "text-destructive",
               trend === 'down' && "text-green-500",
               trend === 'neutral' && "text-foreground"
             )}>
               {trend === 'up' && '▲'}
               {trend === 'down' && '▼'}
               {trend === 'neutral' && '='}
               {' '}{percentChange}%
             </span>
             <span className="text-sm text-muted-foreground">
               {trend === 'up' && prefT('a mais')}
               {trend === 'down' && prefT('a menos')}
               {trend === 'neutral' && prefT('igual')}
               {trend === 'down' && ' 🎉'}
             </span>
           </div>
           
           <div className="flex items-center gap-2 text-sm">
             <span className="transition-all duration-300">
               {valuesHidden ? maskCurrencyValue(formatCurrency(previousTotal)) : formatCurrency(previousTotal)}
             </span>
             <span className="text-muted-foreground">→</span>
             <span className="font-medium transition-all duration-300">
               {valuesHidden ? maskCurrencyValue(formatCurrency(currentTotal)) : formatCurrency(currentTotal)}
             </span>
             <button
               onClick={() => setValuesHidden(!valuesHidden)}
               className="p-1 rounded-full hover:bg-muted/80 transition-colors ml-1"
               aria-label={valuesHidden ? prefT('Mostrar valores') : prefT('Ocultar valores')}
             >
               {valuesHidden ? (
                 <EyeOff className="w-4 h-4 text-muted-foreground" />
               ) : (
                 <Eye className="w-4 h-4 text-muted-foreground" />
               )}
             </button>
           </div>
         </div>
       )}
     </div>
   );
 }