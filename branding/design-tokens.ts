/**
 * Conta de Casal — Design Tokens
 *
 * Fonte de verdade para todos os valores de design.
 * Importável em qualquer parte do código.
 *
 * Uso:
 *   import { colors, typography, spacing, avatars } from '@/branding/design-tokens';
 */

// ─── Cores ───────────────────────────────────────────────

export const colors = {
  /** Cor primária — Coral suave */
  primary: {
    DEFAULT: 'hsl(15, 85%, 65%)',
    foreground: 'hsl(0, 0%, 100%)',
    hex: '#E8845A',
    hsl: '15 85% 65%',
  },
  /** Cor secundária — Sálvia/Verde */
  secondary: {
    DEFAULT: 'hsl(145, 30%, 80%)',
    foreground: 'hsl(145, 40%, 20%)',
    hex: '#B3D9C0',
    hsl: '145 30% 80%',
  },
  /** Cor de acento — Lavanda */
  accent: {
    DEFAULT: 'hsl(270, 40%, 90%)',
    foreground: 'hsl(270, 40%, 30%)',
    hex: '#DDD0F0',
    hsl: '270 40% 90%',
  },
  /** Cor destrutiva — Vermelho */
  destructive: {
    DEFAULT: 'hsl(0, 65%, 55%)',
    foreground: 'hsl(0, 0%, 100%)',
    hex: '#D43F3F',
  },

  background: {
    light: 'hsl(30, 30%, 98%)',     // #FDF8F6
    dark: 'hsl(25, 20%, 8%)',       // #171312
    lightHex: '#FDF8F6',
    darkHex: '#171312',
  },
  card: {
    light: 'hsl(30, 25%, 99%)',     // #FEFCFB
    dark: 'hsl(25, 18%, 12%)',      // #211D1A
  },
  foreground: {
    light: 'hsl(25, 20%, 20%)',     // #3D3330
    dark: 'hsl(30, 20%, 95%)',      // #F7F3F0
  },
  muted: {
    light: 'hsl(30, 15%, 94%)',     // #F0EDEB
    dark: 'hsl(25, 15%, 18%)',
    foregroundLight: 'hsl(25, 10%, 50%)',
    foregroundDark: 'hsl(30, 10%, 60%)',
  },
  border: {
    light: 'hsl(30, 20%, 90%)',     // #EAE5E1
    dark: 'hsl(25, 15%, 20%)',
  },

  /** Tema de cor do app (meta theme-color) */
  themeColor: '#FDF8F6',
} as const;

// ─── Cores de Perfil ─────────────────────────────────────

export const personColors = [
  { name: 'Coral',   value: '#F5A9B8', hsl: '350 70% 75%' },
  { name: 'Sálvia',  value: '#A8D5BA', hsl: '145 45% 70%' },
  { name: 'Lavanda', value: '#C4B5E0', hsl: '270 35% 80%' },
  { name: 'Céu',     value: '#A5D4E8', hsl: '200 55% 78%' },
  { name: 'Pêssego', value: '#F8C8A8', hsl: '25 85% 82%' },
  { name: 'Menta',   value: '#98E4D0', hsl: '160 55% 75%' },
] as const;

// ─── Cores de Categoria ──────────────────────────────────

export const tagColors = {
  food:      { hsl: '38 92% 50%',  hex: '#F5A623', name: 'Alimentação' },
  home:      { hsl: '217 91% 60%', hex: '#3B82F6', name: 'Casa' },
  bills:     { hsl: '0 84% 60%',   hex: '#EF4444', name: 'Contas' },
  leisure:   { hsl: '262 83% 58%', hex: '#8B5CF6', name: 'Lazer' },
  transport: { hsl: '189 94% 43%', hex: '#06B6D4', name: 'Transporte' },
  other:     { hsl: '220 9% 46%',  hex: '#6B7280', name: 'Outros' },
} as const;

// ─── Cores de Card (CardManager) ─────────────────────────

export const cardColors = [
  '#8B5CF6', // Roxo
  '#EC4899', // Rosa
  '#3B82F6', // Azul
  '#10B981', // Verde
  '#F59E0B', // Amarelo
  '#6B7280', // Cinza
] as const;

// ─── Avatares ────────────────────────────────────────────

export const avatarConfig = {
  /** Total de avatares disponíveis */
  total: 8,

  /** Cores de fundo para cada avatar (índice 1-8) */
  backgrounds: {
    1: '#FFE4EC',  // Rosa claro  (Malhado)
    2: '#E4F0FF',  // Azul claro  (Siamês)
    3: '#FFF4E4',  // Laranja claro (Tigrado)
    4: '#F0E4FF',  // Roxo claro  (Preto)
    5: '#FFE8D9',  // Pêssego     (Laranja)
    6: '#E4FFE8',  // Verde claro (Cinza)
    7: '#FFFBE4',  // Amarelo claro (Branco)
    8: '#E4FFF0',  // Menta       (Rajado)
  } as Record<number, string>,

  /** Nomes dos gatinhos */
  names: {
    1: 'Malhado',
    2: 'Siamês',
    3: 'Tigrado',
    4: 'Preto',
    5: 'Laranja',
    6: 'Cinza',
    7: 'Branco',
    8: 'Rajado',
  } as Record<number, string>,

  /** Tamanhos padronizados (classes Tailwind) */
  sizes: {
    xs:   'w-6 h-6',    // 24px — inline em listas
    sm:   'w-8 h-8',    // 32px — grids compactos
    md:   'w-12 h-12',  // 48px — padrão
    lg:   'w-16 h-16',  // 64px — perfil, modais
    xl:   'w-24 h-24',  // 96px — destaque
    '2xl': 'w-32 h-32', // 128px — hero
  },

  /** Dimensões em pixels */
  sizePx: {
    xs: 24,
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
    '2xl': 128,
  },
} as const;

// ─── Tipografia ──────────────────────────────────────────

export const typography = {
  fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
  googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap',

  weights: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  scale: {
    display:   { size: '30px', weight: 700, lineHeight: 1.2, tailwind: 'text-3xl font-bold' },
    h1:        { size: '24px', weight: 700, lineHeight: 1.3, tailwind: 'text-2xl font-bold' },
    h2:        { size: '20px', weight: 600, lineHeight: 1.35, tailwind: 'text-xl font-semibold' },
    h3:        { size: '16px', weight: 600, lineHeight: 1.4, tailwind: 'text-base font-semibold' },
    body:      { size: '14px', weight: 400, lineHeight: 1.5, tailwind: 'text-sm' },
    bodySmall: { size: '12px', weight: 400, lineHeight: 1.5, tailwind: 'text-xs' },
    caption:   { size: '10px', weight: 500, lineHeight: 1.4, tailwind: 'text-[10px] font-medium' },
    button:    { size: '14px', weight: 600, lineHeight: 1, tailwind: 'text-sm font-semibold' },
  },
} as const;

// ─── Espaçamento ─────────────────────────────────────────

export const spacing = {
  /** Escala de espaçamento em rem (base 4px) */
  scale: {
    '0.5': '0.125rem',  // 2px
    '1':   '0.25rem',   // 4px
    '1.5': '0.375rem',  // 6px
    '2':   '0.5rem',    // 8px
    '3':   '0.75rem',   // 12px
    '4':   '1rem',      // 16px
    '5':   '1.25rem',   // 20px
    '6':   '1.5rem',    // 24px
    '8':   '2rem',      // 32px
    '10':  '2.5rem',    // 40px
    '12':  '3rem',      // 48px
    '16':  '4rem',      // 64px
    '20':  '5rem',      // 80px
    '24':  '6rem',      // 96px
  },
} as const;

// ─── Border Radius ───────────────────────────────────────

export const borderRadius = {
  sm:   '12px',   // calc(var(--radius) - 4px)
  md:   '14px',   // calc(var(--radius) - 2px)
  lg:   '16px',   // var(--radius)
  xl:   '12px',   // rounded-xl
  '2xl': '16px',  // rounded-2xl
  '3xl': '24px',  // rounded-3xl
  '4xl': '32px',  // rounded-4xl
  full: '9999px', // rounded-full
} as const;

// ─── Sombras ─────────────────────────────────────────────

export const shadows = {
  glass:   '0 8px 32px 0 rgba(0, 0, 0, 0.04)',
  glassLg: '0 12px 48px 0 rgba(0, 0, 0, 0.06)',
  fab:     '0 8px 32px -4px rgba(0, 0, 0, 0.15)',
} as const;

// ─── Animações ───────────────────────────────────────────

export const animations = {
  /** Transições de página */
  page: {
    fadeIn:  { duration: '300ms', timing: 'ease-out' },
    slideUp: { duration: '400ms', timing: 'ease-out' },
    scaleIn: { duration: '200ms', timing: 'ease-out' },
  },

  /** Animações de gatinho */
  cat: {
    idle:       { duration: '2s',   timing: 'ease-in-out', loop: true },
    wiggle:     { duration: '0.6s', timing: 'ease-in-out', loop: false },
    bounceGentle: { duration: '0.8s', timing: 'ease-in-out', loop: true },
    celebrate:  { duration: '0.5s', timing: 'ease-out', loop: false },
    playing:    { duration: '1.5s', timing: 'ease-in-out', loop: true },
    sleeping:   { duration: '3s',   timing: 'ease-in-out', loop: true },
    licking:    { duration: '1.8s', timing: 'ease-in-out', loop: true },
    rolling:    { duration: '2s',   timing: 'ease-in-out', loop: true },
    stretching: { duration: '2.5s', timing: 'ease-in-out', loop: true },
    lying:      { duration: '4s',   timing: 'ease-in-out', loop: true },
    purring:    { duration: '0.5s', timing: 'linear',      loop: true },
    tailWag:    { duration: '0.8s', timing: 'ease-in-out', loop: true },
  },

  /** Animações de UI */
  ui: {
    bounceSoft:  { duration: '2s',   timing: 'ease-in-out', loop: true },
    pulseSubtle: { duration: '2s',   timing: 'ease-in-out', loop: true },
    wave:        { duration: '1.5s', timing: 'ease-in-out', loop: false },
    jump:        { duration: '0.6s', timing: 'ease-out',    loop: false },
    spinSlow:    { duration: '3s',   timing: 'linear',      loop: true },
    syncPulse:   { duration: '1.2s', timing: 'ease-in-out', loop: true },
  },
} as const;

// ─── Breakpoints ─────────────────────────────────────────

export const breakpoints = {
  sm:   '640px',
  md:   '768px',
  lg:   '1024px',
  xl:   '1280px',
  '2xl': '1400px',
} as const;

// ─── Marca ───────────────────────────────────────────────

export const brand = {
  name: 'Conta de Casal',
  tagline: 'Divida gastos com carinho',
  taglineEN: 'Split expenses with love',
  taglineES: 'Divide gastos con cariño',
  description: 'Controle financeiro simples e empático para casais. Divida gastos com clareza e mantenha o equilíbrio.',
  emoji: '💕',
  url: 'https://contadecasal.com',
  social: {
    instagram: '@contadecasal',
    tiktok: '@contadecasal',
    twitter: '@contadecasal',
  },
} as const;
