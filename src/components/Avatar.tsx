import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { getAvatarBgColor, getAvatarSrc } from '@/lib/avatar-registry';
import { CatAnimationType } from './CatAnimation';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps {
  avatarIndex: number;
  size?: AvatarSize;
  className?: string;
  ringColor?: string;        // Cor do anel (hex). Usa ring-2 por padrão.
  ringWidth?: 2 | 4;         // Espessura do anel (2 = ring-2, 4 = ring-4)
  animated?: boolean;         // Animação contínua (idle)
  animateOnHover?: boolean;   // Wiggle ao passar o mouse
  animateOnce?: boolean;      // Anima uma vez e para
  selected?: boolean;         // Estado selecionado (idle animation)
  showBackground?: boolean;   // Fundo colorido do avatar
  shadow?: boolean;           // Adiciona shadow-lg
  animation?: CatAnimationType;
  onClick?: () => void;
}

/**
 * Componente centralizado de Avatar.
 *
 * REGRA: SEMPRE use este componente para renderizar avatares de gatinho.
 * NUNCA use <img> com CAT_AVATARS diretamente.
 *
 * @example
 * <Avatar avatarIndex={profile.avatar_index} size="md" ringColor={profile.color} />
 */

const sizeClasses: Record<AvatarSize, string> = {
  xs:   'w-6 h-6',     // 24px — inline, expense cards
  sm:   'w-8 h-8',     // 32px — listas compactas
  md:   'w-12 h-12',   // 48px — padrão
  lg:   'w-16 h-16',   // 64px — perfil, modais
  xl:   'w-24 h-24',   // 96px — destaque, onboarding
  '2xl': 'w-32 h-32',  // 128px — hero
};

export function Avatar({
  avatarIndex,
  size = 'md',
  className,
  ringColor,
  ringWidth = 2,
  animated = false,
  animateOnHover = true,
  animateOnce = false,
  selected = false,
  showBackground = true,
  shadow = false,
  animation = 'idle',
  onClick,
}: AvatarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(animateOnce);
  const avatarSrc = getAvatarSrc(avatarIndex);
  const bgColor = getAvatarBgColor(avatarIndex);

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

  const ringClasses = ringColor
    ? ringWidth === 4
      ? 'ring-4 ring-offset-2 ring-offset-background'
      : 'ring-2 ring-offset-2 ring-offset-background'
    : '';

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden flex-shrink-0 relative',
        sizeClasses[size],
        ringClasses,
        shadow && 'shadow-lg',
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
