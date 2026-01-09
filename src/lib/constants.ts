import catAvatar1 from '@/assets/cat-avatar-1.png';
import catAvatar2 from '@/assets/cat-avatar-2.png';
import catAvatar3 from '@/assets/cat-avatar-3.png';
import catAvatar4 from '@/assets/cat-avatar-4.png';

export const CAT_AVATARS = [
  catAvatar1,
  catAvatar2,
  catAvatar3,
  catAvatar4,
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
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(date));
};
