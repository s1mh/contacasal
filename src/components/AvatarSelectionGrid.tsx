import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAvatarIndices } from '@/lib/avatar-registry';
import { Avatar } from '@/components/Avatar';

interface AvatarSelectionGridProps {
  value: number;
  onChange: (avatarIndex: number) => void;
  className?: string;
  columns?: 3 | 4;
  size?: 'sm' | 'md' | 'lg';
  showBackground?: boolean;
}

const buttonSizeClasses: Record<NonNullable<AvatarSelectionGridProps['size']>, string> = {
  sm: 'w-12 h-12',
  md: 'w-14 h-14',
  lg: 'w-16 h-16',
};

const avatarSizeByButton: Record<NonNullable<AvatarSelectionGridProps['size']>, 'md' | 'lg'> = {
  sm: 'md',
  md: 'lg',
  lg: 'lg',
};

export function AvatarSelectionGrid({
  value,
  onChange,
  className,
  columns = 4,
  size = 'md',
  showBackground = false,
}: AvatarSelectionGridProps) {
  return (
    <div className={cn(columns === 3 ? 'grid grid-cols-3 gap-3' : 'grid grid-cols-4 gap-3', className)}>
      {getAvatarIndices().map((avatarIndex) => {
        const isSelected = value === avatarIndex;

        return (
          <button
            key={avatarIndex}
            type="button"
            onClick={() => onChange(avatarIndex)}
            className={cn(
              'relative rounded-full overflow-hidden ring-2 transition-all duration-300',
              buttonSizeClasses[size],
              isSelected ? 'ring-primary ring-offset-2 shadow-lg' : 'ring-border hover:ring-primary/50'
            )}
          >
            <Avatar
              avatarIndex={avatarIndex}
              size={avatarSizeByButton[size]}
              className="w-full h-full"
              selected={isSelected}
              animateOnHover
              animated={false}
              showBackground={showBackground}
            />
            {isSelected && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-primary drop-shadow-md animate-scale-in" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

