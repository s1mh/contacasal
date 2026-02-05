import { cn } from '@/lib/utils';

interface AIBackgroundBlobProps {
  className?: string;
}

export function AIBackgroundBlob({ className }: AIBackgroundBlobProps) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden rounded-3xl", className)}>
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-100/80 via-peach-100/60 to-amber-50/70" />

      {/* Animated blobs */}
      <div className="absolute inset-0 animate-ai-breathe">
        {/* Blob 1 - Laranja */}
        <div
          className="absolute w-32 h-32 rounded-full animate-ai-blob-1"
          style={{
            background: 'radial-gradient(circle, rgba(255,183,130,0.8) 0%, rgba(255,200,150,0.4) 50%, transparent 70%)',
            top: '10%',
            left: '10%',
            filter: 'blur(20px)',
          }}
        />

        {/* Blob 2 - Pêssego */}
        <div
          className="absolute w-40 h-40 rounded-full animate-ai-blob-2"
          style={{
            background: 'radial-gradient(circle, rgba(255,218,185,0.7) 0%, rgba(255,228,196,0.3) 50%, transparent 70%)',
            top: '20%',
            right: '15%',
            filter: 'blur(25px)',
          }}
        />

        {/* Blob 3 - Rosa suave */}
        <div
          className="absolute w-28 h-28 rounded-full animate-ai-blob-3"
          style={{
            background: 'radial-gradient(circle, rgba(255,200,180,0.6) 0%, rgba(255,220,200,0.3) 50%, transparent 70%)',
            bottom: '15%',
            left: '30%',
            filter: 'blur(18px)',
          }}
        />

        {/* Blob 4 - Laranja claro */}
        <div
          className="absolute w-24 h-24 rounded-full animate-ai-blob-1"
          style={{
            background: 'radial-gradient(circle, rgba(255,195,160,0.5) 0%, rgba(255,210,180,0.2) 50%, transparent 70%)',
            bottom: '25%',
            right: '20%',
            filter: 'blur(15px)',
            animationDelay: '-3s',
          }}
        />
      </div>

      {/* Subtle overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
    </div>
  );
}
