import { cn, maskCurrencyValue } from '@/lib/utils';
import { formatCurrency as formatCurrencyConst, formatDate } from '@/lib/constants';
import { Expense, Profile, Tag, Card } from '@/hooks/useCouple';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useI18n } from '@/contexts/I18nContext';
import { Avatar } from '@/components/Avatar';
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
  Trash2,
  Pencil,
  CreditCard,
  Calendar,
  LucideIcon
} from 'lucide-react';

interface ExpenseCardProps {
  expense: Expense;
  profiles: Profile[];
  tags: Tag[];
  cards?: Card[];
  onDelete?: () => void;
  onEdit?: () => void;
  isNew?: boolean;
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

export function ExpenseCard({ expense, profiles, tags, cards = [], onDelete, onEdit, isNew }: ExpenseCardProps) {
  const { t: prefT, valuesHidden } = usePreferences();
  const { formatCurrency } = useI18n();
  const paidByProfile = profiles.find(p => p.position === expense.paid_by);
  const tag = tags.find(t => t.id === expense.tag_id);
  const card = cards.find(c => c.id === expense.card_id);

  const TagIconComponent = tag ? (iconMap[tag.icon] || TagIcon) : TagIcon;

  const getSplitDescription = () => {
    switch (expense.split_type) {
      case 'equal':
        return '50/50';
      case 'percentage':
        return `${expense.split_value.person1}% / ${expense.split_value.person2}%`;
      case 'fixed':
        return `${formatCurrencyConst(expense.split_value.person1)} / ${formatCurrencyConst(expense.split_value.person2)}`;
      case 'full':
        return expense.split_value.person1 === 100 ? `100% ${profiles[0]?.name}` : `100% ${profiles[1]?.name}`;
      default:
        return '';
    }
  };

  const isInstallment = expense.installments > 1;

  return (
    <div 
      className={cn(
        'expense-card bg-card rounded-3xl p-4 shadow-lg border border-border/50 group transition-all duration-200 hover:shadow-xl hover:scale-[1.01]',
        isNew && 'animate-fade-in'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Tag icon */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: tag?.color ? `${tag.color}20` : 'hsl(var(--muted))' }}
        >
          <TagIconComponent 
            className="w-6 h-6" 
            style={{ color: tag?.color || 'hsl(var(--muted-foreground))' }} 
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">
                {expense.description || tag?.name || prefT('Gasto')}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(expense.expense_date)}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {getSplitDescription()}
                </span>
              </div>
            </div>
            <p className="text-lg font-bold text-primary whitespace-nowrap transition-all duration-300">
              {valuesHidden ? maskCurrencyValue(formatCurrency(expense.total_amount)) : formatCurrency(expense.total_amount)}
            </p>
          </div>

          {/* Footer: Paid by + Payment info */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              {paidByProfile && (
                <div className="flex items-center gap-1.5">
                  <Avatar
                    avatarIndex={paidByProfile.avatar_index}
                    size="sm"
                    className="w-6 h-6"
                    ringColor={paidByProfile.color}
                    animateOnHover={false}
                    showBackground={false}
                  />
                  <span className="text-xs text-muted-foreground">{prefT('pagou')}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Payment type badge */}
              {expense.payment_type === 'credit' && (
                <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted">
                  <CreditCard className="w-3 h-3" />
                  <span>{card?.name || prefT('Crédito')}</span>
                  {isInstallment && (
                    <span className="font-medium">
                      {expense.installment_number}/{expense.installments}
                    </span>
                  )}
                </div>
              )}

              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-primary transition-all rounded-lg hover:bg-primary/10"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}

              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive transition-all rounded-lg hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
