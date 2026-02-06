export const colorFallbacks = {
  neutral500: '#6B7280', // used as fallback for charts/categories
  neutral600: '#4B5563',
  tagDefault: '#94A3B8',
  neutralText: '#000000',
} as const;

export const cardColorOptions = [
  { name: 'Roxo', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Laranja', value: '#F59E0B' },
  { name: 'Cinza', value: '#6B7280' },
] as const;

export const aiInsightsBackground = {
  gradient: 'linear-gradient(-45deg, #ffe4c9, #ffd4a8, #ffcba4, #ffe0c0, #fff0e0, #ffdcc8)',
  blob1: 'radial-gradient(circle at 30% 30%, rgba(255,180,130,0.6) 0%, transparent 50%)',
  blob2: 'radial-gradient(circle at 70% 70%, rgba(255,200,160,0.5) 0%, transparent 50%)',
  blob3: 'radial-gradient(circle at 50% 50%, rgba(255,170,120,0.4) 0%, transparent 40%)',
  shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
} as const;

