import { cn } from '@/lib/utils';
import { CAT_AVATARS } from '@/lib/constants';

interface AvatarProps {
  avatarIndex: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  ringColor?: string;
  animated?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

export function Avatar({ avatarIndex, size = 'md', className, ringColor, animated = true }: AvatarProps) {
  const avatarSrc = CAT_AVATARS[avatarIndex - 1] || CAT_AVATARS[0];

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden bg-muted flex-shrink-0',
        sizeClasses[size],
        ringColor && 'ring-2 ring-offset-2 ring-offset-background',
        animated && 'animate-cat-idle',
        className
      )}
      style={ringColor ? { '--tw-ring-color': ringColor } as React.CSSProperties : undefined}
    >
      <img
        src={avatarSrc}
        alt="Avatar"
        className="w-full h-full object-cover"
      />
    </div>
  );
}
