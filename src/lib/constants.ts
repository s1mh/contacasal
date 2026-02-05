import catAvatar1 from '@/assets/cat-avatar-1.png';
import catAvatar2 from '@/assets/cat-avatar-2.png';
import catAvatar3 from '@/assets/cat-avatar-3.png';
import catAvatar4 from '@/assets/cat-avatar-4.png';
import catAvatar5 from '@/assets/cat-avatar-5.png';
import catAvatar6 from '@/assets/cat-avatar-6.png';
import catAvatar7 from '@/assets/cat-avatar-7.png';
import catAvatar8 from '@/assets/cat-avatar-8.png';
import { getActivePreferences } from '@/lib/preferences';

export const CAT_AVATARS = [
  catAvatar1,
  catAvatar2,
  catAvatar3,
  catAvatar4,
  catAvatar5, // Laranja/Ruivo
  catAvatar6, // Preto
  catAvatar7, // Cinza
  catAvatar8, // Branco
];

export const PERSON_COLORS = [
  { name: 'Coral', value: '#F5A9B8' },
  { name: 'Sálvia', value: '#A8D5BA' },
  { name: 'Lavanda', value: '#C4B5E0' },
  { name: 'Céu', value: '#A5D4E8' },
  { name: 'Pêssego', value: '#F8C8A8' },
  { name: 'Menta', value: '#98E4D0' },
];

export const TAG_ICONS = {
  utensils: 'Utensils',
  home: 'Home',
  receipt: 'Receipt',
  'gamepad-2': 'Gamepad2',
  car: 'Car',
  tag: 'Tag',
  heart: 'Heart',
  gift: 'Gift',
  'shopping-bag': 'ShoppingBag',
  coffee: 'Coffee',
  plane: 'Plane',
  music: 'Music',
};

export const SPLIT_TYPES = {
  equal: { label: '50/50', description: 'Dividir igualmente' },
  percentage: { label: 'Percentual', description: 'Definir % para cada' },
  fixed: { label: 'Valor fixo', description: 'Valor específico por pessoa' },
  full: { label: '100%', description: 'Uma pessoa paga tudo' },
};

export const formatCurrency = (value: number): string => {
  const { locale, currency } = getActivePreferences();
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
};

export const formatDate = (date: string | Date): string => {
  const { locale } = getActivePreferences();
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
  }).format(new Date(date));
};

// Cores de fundo para cada avatar de gatinho
export const CAT_BG_COLORS: Record<number, string> = {
  1: '#FFE4EC', // Rosa claro (Malhado)
  2: '#E4F0FF', // Azul claro (Siamês)
  3: '#FFF4E4', // Laranja claro (Tigrado)
  4: '#F0E4FF', // Roxo claro (Preto)
  5: '#FFE8D9', // Pêssego (Laranja)
  6: '#E4FFE8', // Verde claro (Cinza)
  7: '#FFFBE4', // Amarelo claro (Branco)
  8: '#E4FFF0', // Menta (Rajado)
};
