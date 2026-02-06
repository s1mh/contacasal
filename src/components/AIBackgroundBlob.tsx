import { cn } from '@/lib/utils';
import { aiInsightsBackground } from '@/design-system/tokens';

interface AIBackgroundBlobProps {
  className?: string;
  thinking?: boolean; // More intense animation when "thinking"
}

export function AIBackgroundBlob({ className, thinking = false }: AIBackgroundBlobProps) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden rounded-3xl", className)}>
      {/* Animated gradient background */}
      <div
        className={cn(
          "absolute inset-0",
          thinking ? "animate-ai-gradient-fast" : "animate-ai-gradient"
        )}
        style={{
          background: aiInsightsBackground.gradient,
          backgroundSize: '400% 400%',
        }}
      />

      {/* Flowing blobs layer */}
      <div className={cn(
        "absolute inset-0",
        thinking ? "opacity-80" : "opacity-50"
      )}>
        {/* Blob 1 */}
        <div
          className={cn(
            "absolute rounded-full",
            thinking ? "animate-ai-blob-fast-1" : "animate-ai-blob-1"
          )}
          style={{
            width: '120%',
            height: '120%',
            top: '-30%',
            left: '-20%',
            background: aiInsightsBackground.blob1,
            filter: thinking ? 'blur(30px)' : 'blur(40px)',
          }}
        />

        {/* Blob 2 */}
        <div
          className={cn(
            "absolute rounded-full",
            thinking ? "animate-ai-blob-fast-2" : "animate-ai-blob-2"
          )}
          style={{
            width: '100%',
            height: '100%',
            bottom: '-20%',
            right: '-10%',
            background: aiInsightsBackground.blob2,
            filter: thinking ? 'blur(25px)' : 'blur(35px)',
          }}
        />

        {/* Blob 3 - only visible when thinking */}
        {thinking && (
          <div
            className="absolute rounded-full animate-ai-blob-fast-3"
            style={{
              width: '80%',
              height: '80%',
              top: '10%',
              left: '10%',
              background: aiInsightsBackground.blob3,
              filter: 'blur(20px)',
            }}
          />
        )}
      </div>

      {/* Shimmer effect when thinking */}
      {thinking && (
        <div
          className="absolute inset-0 animate-ai-shimmer"
          style={{
            background: aiInsightsBackground.shimmer,
            backgroundSize: '200% 100%',
          }}
        />
      )}
    </div>
  );
}
