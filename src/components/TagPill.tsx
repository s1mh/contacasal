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
import { cn } from '@/lib/utils';

interface TagPillProps {
  name: string;
  icon: string;
  color: string;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
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

export function TagPill({ name, icon, color, selected, onClick, size = 'md' }: TagPillProps) {
  const Icon = iconMap[icon] || TagIcon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'tag-pill transition-all duration-200',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1.5 text-xs',
        selected
          ? 'ring-2 ring-offset-1 ring-offset-background'
          : 'hover:scale-105'
      )}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        ...(selected ? { '--tw-ring-color': color } as React.CSSProperties : {}),
      }}
    >
      <Icon className={cn(size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
      {name && <span className="font-medium">{name}</span>}
    </button>
  );
}
