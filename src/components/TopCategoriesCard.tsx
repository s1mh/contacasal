 import { useMemo } from 'react';
 import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
 import { usePreferences } from '@/contexts/PreferencesContext';
 import { useI18n } from '@/contexts/I18nContext';
 import { cn, maskCurrencyValue } from '@/lib/utils';
 import { colorFallbacks, withAlpha } from '@/design-system/tokens';
 import { Expense, Tag } from '@/contexts/CoupleContext';
 import { 
   Tag as TagIcon, 
   Utensils, 
   Home, 
   Receipt, 
   Gamepad2, 
   Car, 
   Heart, 
   Gift, 
   ShoppingBag, 
   Coffee, 
   Plane, 
   Music,
   LucideIcon
 } from 'lucide-react';
 
 interface TopCategoriesCardProps {
   expenses: Expense[];
   tags: Tag[];
 }
 
 const iconMap: Record<string, LucideIcon> = {
   tag: TagIcon,
   utensils: Utensils,
   home: Home,
   receipt: Receipt,
   'gamepad-2': Gamepad2,
   car: Car,
   heart: Heart,
   gift: Gift,
   'shopping-bag': ShoppingBag,
   coffee: Coffee,
   plane: Plane,
   music: Music,
 };
 
export function TopCategoriesCard({ expenses = [], tags = [] }: TopCategoriesCardProps) {
  const { t: prefT, valuesHidden } = usePreferences();
  const { formatCurrency } = useI18n();
  
  const topCategories = useMemo(() => {
    // Defensive check for undefined arrays
    const safeExpenses = expenses || [];
    const safeTags = tags || [];
    
    const now = new Date();
    const currentStart = startOfMonth(now);
    const currentEnd = endOfMonth(now);
    
    const currentExpenses = safeExpenses.filter(e => {
      if (!e?.expense_date) return false;
      try {
        const date = e.billing_month ? parseISO(e.billing_month) : parseISO(e.expense_date);
        return isWithinInterval(date, { start: currentStart, end: currentEnd });
      } catch {
        return false;
      }
    });
    
    const byCategory: Record<string, number> = {};
    currentExpenses.forEach(e => {
      const tagId = e?.tag_id || 'other';
      byCategory[tagId] = (byCategory[tagId] || 0) + (e?.total_amount || 0);
    });
    
    const total = Object.values(byCategory).reduce((sum, val) => sum + val, 0);
    
    return Object.entries(byCategory)
      .map(([tagId, amount]) => {
        const tag = safeTags.find(t => t?.id === tagId);
        return {
          tagId,
          name: tag?.name || prefT('Outros'),
          icon: tag?.icon || 'tag',
          color: tag?.color || colorFallbacks.neutral500,
          amount,
          percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  }, [expenses, tags, prefT]);
   
   if (topCategories.length === 0) {
     return null;
   }
   
   return (
     <div className="bg-card rounded-3xl p-4 shadow-glass">
       <div className="flex items-center gap-2 mb-3">
         <TagIcon className="w-5 h-5 text-primary" />
         <span className="text-sm font-medium text-muted-foreground">
           {prefT('Mais gastaram esse mês')}
         </span>
       </div>
       
       <div className="space-y-3">
         {topCategories.map((category, index) => {
           const Icon = iconMap[category.icon] || TagIcon;
           return (
             <div key={category.tagId} className="space-y-1.5">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <div 
                     className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: withAlpha(category.color, 0.125) }}
                   >
                     <Icon className="w-4 h-4" style={{ color: category.color }} />
                   </div>
                   <span className="text-sm font-medium">{category.name}</span>
                 </div>
                 <span className="text-sm font-semibold transition-all duration-300">
                   {valuesHidden ? maskCurrencyValue(formatCurrency(category.amount)) : formatCurrency(category.amount)}
                 </span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                   <div 
                     className="h-full rounded-full transition-all duration-500"
                     style={{ 
                       width: `${category.percentage}%`,
                       backgroundColor: category.color 
                     }}
                   />
                 </div>
                 <span className="text-xs text-muted-foreground w-10 text-right">
                   {category.percentage}%
                 </span>
               </div>
             </div>
           );
         })}
       </div>
     </div>
   );
 }