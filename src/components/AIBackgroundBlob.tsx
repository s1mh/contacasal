import { cn } from '@/lib/utils';

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
          background: 'linear-gradient(-45deg, #ffe4c9, #ffd4a8, #ffcba4, #ffe0c0, #fff0e0, #ffdcc8)',
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
            background: 'radial-gradient(circle at 30% 30%, rgba(255,180,130,0.6) 0%, transparent 50%)',
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
            background: 'radial-gradient(circle at 70% 70%, rgba(255,200,160,0.5) 0%, transparent 50%)',
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
              background: 'radial-gradient(circle at 50% 50%, rgba(255,170,120,0.4) 0%, transparent 40%)',
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
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
          }}
        />
      )}
    </div>
  );
}
