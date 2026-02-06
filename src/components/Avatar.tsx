import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { CAT_AVATARS, CAT_BG_COLORS } from '@/lib/constants';
import { CatAnimationType } from './CatAnimation';

interface AvatarProps {
  avatarIndex: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  ringColor?: string;
  animated?: boolean; // Force animation always on
  animateOnHover?: boolean; // Only animate when hovered (wiggle like profile creation)
  animateOnce?: boolean; // Animate once for 2 seconds then stop
  selected?: boolean; // Is this avatar selected (for selection screens)
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

export function Avatar({
  avatarIndex,
  size = 'md',
  className,
  ringColor,
  animated = false,
  animateOnHover = true,
  animateOnce = false,
  selected = false,
  showBackground = true,
  animation = 'idle',
  onClick,
}: AvatarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(animateOnce);
  const avatarSrc = CAT_AVATARS[avatarIndex - 1] || CAT_AVATARS[0];
  const bgColor = CAT_BG_COLORS[avatarIndex] || CAT_BG_COLORS[1];

  // Handle animateOnce - stop animation after 2 seconds
  useEffect(() => {
    if (animateOnce) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [animateOnce, avatarIndex]);

  // Determine animation class based on props
  const getAnimationClass = () => {
    // Hover wiggle takes priority (same animation as profile creation screen)
    if (animateOnHover && isHovered) {
      return 'animate-wiggle';
    }
    if (animated || selected || isAnimating) {
      return 'animate-cat-idle';
    }
    return '';
  };

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
          "w-full h-full object-cover relative z-10 transition-transform",
          getAnimationClass()
        )}
      />
    </div>
  );
}
