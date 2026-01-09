import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/constants';
import { Avatar } from './Avatar';
import { Expense, Profile, Tag } from '@/hooks/useCouple';
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
  LucideIcon
} from 'lucide-react';

interface ExpenseCardProps {
  expense: Expense;
  profiles: Profile[];
  tags: Tag[];
  onDelete?: () => void;
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

export function ExpenseCard({ expense, profiles, tags, onDelete }: ExpenseCardProps) {
  const paidByProfile = profiles.find(p => p.position === expense.paid_by);
  const tag = tags.find(t => t.id === expense.tag_id);

  const TagIconComponent = tag ? (iconMap[tag.icon] || TagIcon) : TagIcon;

  const getSplitDescription = () => {
    switch (expense.split_type) {
      case 'equal':
        return '50/50';
      case 'percentage':
        return `${expense.split_value.person1}% / ${expense.split_value.person2}%`;
      case 'fixed':
        return `${formatCurrency(expense.split_value.person1)} / ${formatCurrency(expense.split_value.person2)}`;
      case 'full':
        return expense.split_value.person1 === 100 ? `100% ${profiles[0]?.name}` : `100% ${profiles[1]?.name}`;
      default:
        return '';
    }
  };

  return (
    <div className="expense-card bg-card rounded-2xl p-4 shadow-glass group">
      <div className="flex items-start gap-3">
        {/* Tag icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: tag?.color ? `${tag.color}20` : 'hsl(var(--muted))' }}
        >
          <TagIconComponent 
            className="w-5 h-5" 
            style={{ color: tag?.color || 'hsl(var(--muted-foreground))' }} 
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-foreground truncate">
                {expense.description || tag?.name || 'Gasto'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {formatDate(expense.expense_date)}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {getSplitDescription()}
                </span>
              </div>
            </div>
            <p className="font-semibold text-foreground whitespace-nowrap">
              {formatCurrency(expense.total_amount)}
            </p>
          </div>

          {/* Paid by */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              {paidByProfile && (
                <>
                  <Avatar 
                    avatarIndex={paidByProfile.avatar_index} 
                    size="sm" 
                    ringColor={paidByProfile.color}
                  />
                  <span className="text-xs text-muted-foreground">
                    pago por <span style={{ color: paidByProfile.color }}>{paidByProfile.name}</span>
                  </span>
                </>
              )}
            </div>

            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive transition-all rounded-lg hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
