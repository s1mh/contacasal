import { useState, useEffect, useRef } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import { cn } from '@/lib/utils';
import { CAT_AVATARS, CAT_BG_COLORS } from '@/lib/constants';

// Types of cat animations available
export type CatAnimationType = 'idle' | 'licking' | 'rolling' | 'sleeping' | 'playing' | 'stretching' | 'lying' | 'purring';

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

// Optional Lottie animation URLs - users can add their own from LottieFiles
// Download animations from: https://lottiefiles.com/free-animations/cat
// Then upload to lottie.host or use the direct URL
const LOTTIE_ANIMATIONS: Partial<Record<CatAnimationType, string>> = {
  // Example format:
  // idle: 'https://lottie.host/your-animation-id/animation.json',
  // licking: 'https://assets.lottiefiles.com/packages/lf20_xxx.json',
};

interface CatAnimationProps {
  avatarIndex: number;
  animation?: CatAnimationType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  ringColor?: string;
  loop?: boolean;
  autoplay?: boolean;
  useLottie?: boolean; // Force use of Lottie animation if available
  showBackground?: boolean;
  onAnimationEnd?: () => void;
  onClick?: () => void;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

export function CatAnimation({
  avatarIndex,
  animation = 'idle',
  size = 'md',
  className,
  ringColor,
  loop = true,
  autoplay = true,
  useLottie = false,
  showBackground = true,
  onAnimationEnd,
  onClick,
}: CatAnimationProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [hasLottieError, setHasLottieError] = useState(false);
  const [isLottieLoading, setIsLottieLoading] = useState(false);

  const avatarSrc = CAT_AVATARS[avatarIndex - 1] || CAT_AVATARS[0];
  const bgColor = CAT_BG_COLORS[avatarIndex] || CAT_BG_COLORS[1];
  const cssAnimationClass = CSS_ANIMATIONS[animation];
  const lottieUrl = LOTTIE_ANIMATIONS[animation];

  // Try to load Lottie animation if URL is configured
  useEffect(() => {
    if (!useLottie || !lottieUrl) {
      setHasLottieError(true);
      return;
    }

    const loadAnimation = async () => {
      setIsLottieLoading(true);
      setHasLottieError(false);

      try {
        const response = await fetch(lottieUrl);
        if (!response.ok) throw new Error('Failed to load animation');
        const data = await response.json();
        setAnimationData(data);
      } catch (error) {
        console.warn(`Lottie animation not available for "${animation}", using CSS animation:`, error);
        setHasLottieError(true);
      } finally {
        setIsLottieLoading(false);
      }
    };

    loadAnimation();
  }, [animation, useLottie, lottieUrl]);

  // Handle animation complete callback
  const handleComplete = () => {
    onAnimationEnd?.();
  };

  // Use Lottie animation if loaded successfully
  const shouldUseLottie = useLottie && animationData && !hasLottieError && !isLottieLoading;

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden flex-shrink-0 relative cursor-pointer',
        sizeClasses[size],
        ringColor && 'ring-2 ring-offset-2 ring-offset-background',
        className
      )}
      style={ringColor ? { '--tw-ring-color': ringColor } as React.CSSProperties : undefined}
      onClick={onClick}
    >
      {/* Background color */}
      {showBackground && (
        <div
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: bgColor }}
        />
      )}

      {/* Lottie animation */}
      {shouldUseLottie ? (
        <Lottie
          lottieRef={lottieRef}
          animationData={animationData}
          loop={loop}
          autoplay={autoplay}
          className="w-full h-full relative z-10"
          onComplete={handleComplete}
        />
      ) : (
        /* CSS animated avatar image */
        <img
          src={avatarSrc}
          alt="Cat Avatar"
          className={cn(
            "w-full h-full object-cover relative z-10 transition-all",
            cssAnimationClass
          )}
          onAnimationEnd={!loop ? handleComplete : undefined}
        />
      )}
    </div>
  );
}

// Hook to get a random animation type
export function useRandomCatAnimation(excludeIdle = false): CatAnimationType {
  const allAnimations: CatAnimationType[] = ['idle', 'licking', 'rolling', 'sleeping', 'playing', 'stretching', 'lying', 'purring'];
  const animations = excludeIdle ? allAnimations.filter(a => a !== 'idle') : allAnimations;
  const [animation] = useState(() => animations[Math.floor(Math.random() * animations.length)]);
  return animation;
}

// Hook to cycle through animations
export function useCyclingCatAnimation(interval = 5000): CatAnimationType {
  const animations: CatAnimationType[] = ['idle', 'licking', 'rolling', 'sleeping', 'playing', 'stretching', 'lying', 'purring'];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % animations.length);
    }, interval);
    return () => clearInterval(timer);
  }, [interval]);

  return animations[index];
}

// Helper to configure Lottie animation URLs at runtime
export function setLottieAnimationUrl(type: CatAnimationType, url: string) {
  LOTTIE_ANIMATIONS[type] = url;
}

// Export animation types for external use
export const CAT_ANIMATION_TYPES: CatAnimationType[] = ['idle', 'licking', 'rolling', 'sleeping', 'playing', 'stretching', 'lying', 'purring'];
