// Re-export types and hook from CoupleContext for backward compatibility
export type { 
  Profile, 
  Tag, 
  Card, 
  Expense, 
  Agreement, 
  Settlement, 
  Couple 
} from '@/contexts/CoupleContext';

export { useCoupleContext as useCouple } from '@/contexts/CoupleContext';
