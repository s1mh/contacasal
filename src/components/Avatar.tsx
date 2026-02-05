import { cn } from '@/lib/utils';
import { CAT_AVATARS, CAT_BG_COLORS } from '@/lib/constants';

interface AvatarProps {
  avatarIndex: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  ringColor?: string;
  animated?: boolean;
  showBackground?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

export function Avatar({ avatarIndex, size = 'md', className, ringColor, animated = true, showBackground = true }: AvatarProps) {
  const avatarSrc = CAT_AVATARS[avatarIndex - 1] || CAT_AVATARS[0];
  const bgColor = CAT_BG_COLORS[avatarIndex] || CAT_BG_COLORS[1];

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden flex-shrink-0 relative',
        sizeClasses[size],
        ringColor && 'ring-2 ring-offset-2 ring-offset-background',
        className
      )}
      style={ringColor ? { '--tw-ring-color': ringColor } as React.CSSProperties : undefined}
    >
      {/* Fundo colorido */}
      {showBackground && (
        <div 
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: bgColor }}
        />
      )}
      
      {/* Imagem do gatinho */}
      <img
        src={avatarSrc}
        alt="Avatar"
        className={cn(
          "w-full h-full object-cover relative z-10",
          animated && "animate-cat-idle"
        )}
      />
    </div>
  );
}
