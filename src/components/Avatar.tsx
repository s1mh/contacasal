import { cn } from '@/lib/utils';
import { CAT_AVATARS, CAT_BG_COLORS } from '@/lib/constants';
import { CatAnimationType } from './CatAnimation';

interface AvatarProps {
  avatarIndex: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  ringColor?: string;
  animated?: boolean;
  showBackground?: boolean;
  animation?: CatAnimationType;
  onClick?: () => void;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

// CSS animation class mapping
const CSS_ANIMATIONS: Record<CatAnimationType, string> = {
  idle: 'animate-cat-idle',
  licking: 'animate-cat-licking',
  rolling: 'animate-cat-rolling',
  sleeping: 'animate-cat-sleeping',
  playing: 'animate-cat-playing',
  stretching: 'animate-cat-stretching',
  lying: 'animate-cat-lying',
  purring: 'animate-cat-purring',
};

export function Avatar({
  avatarIndex,
  size = 'md',
  className,
  ringColor,
  animated = true,
  showBackground = true,
  animation = 'idle',
  onClick,
}: AvatarProps) {
  const avatarSrc = CAT_AVATARS[avatarIndex - 1] || CAT_AVATARS[0];
  const bgColor = CAT_BG_COLORS[avatarIndex] || CAT_BG_COLORS[1];
  const animationClass = animated ? CSS_ANIMATIONS[animation] : '';

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden flex-shrink-0 relative',
        sizeClasses[size],
        ringColor && 'ring-2 ring-offset-2 ring-offset-background',
        onClick && 'cursor-pointer',
        className
      )}
      style={ringColor ? { '--tw-ring-color': ringColor } as React.CSSProperties : undefined}
      onClick={onClick}
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
          animationClass
        )}
      />
    </div>
  );
}
