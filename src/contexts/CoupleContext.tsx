import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isConfiguredProfile } from '@/lib/utils';
import {
  validateExpense,
  validateProfile,
  validateTag,
  validateCard,
  validateAgreement,
  validateSettlement,
} from '@/lib/validation';

// ============ Types ============
export interface Profile {
  id: string;
  couple_id: string;
  name: string;
  color: string;
  avatar_index: number;
  position: number;
  username?: string;
  email?: string;
}

export interface SpaceRole {
  id: string;
  space_id: string;
  profile_id: string;
  role: 'admin' | 'member';
}

export interface Tag {
  id: string;
  couple_id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Card {
  id: string;
  profile_id: string;
  couple_id: string;
  name: string;
  type: 'credit' | 'debit';
  closing_day: number | null;
  due_day: number | null;
  color: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  couple_id: string;
  description: string | null;
  total_amount: number;
  paid_by: number;
  paid_by_profile_id?: string | null;
  split_type: 'equal' | 'percentage' | 'fixed' | 'full';
  split_value: { person1: number; person2: number } | Record<string, number>;
  tag_id: string | null;
  expense_date: string;
  created_at: string;
  payment_type: 'debit' | 'credit';
  card_id: string | null;
  billing_month: string | null;
  installments: number;
  installment_number: number;
}

export interface Agreement {
  id: string;
  couple_id: string;
  name: string;
  amount: number;
  split_type: string;
  split_value: { person1: number; person2: number } | Record<string, number>;
  paid_by: number;
  paid_by_profile_id?: string | null;
  tag_id: string | null;
  day_of_month: number;
  is_active: boolean;
  created_at?: string;
}

export interface Settlement {
  id: string;
  couple_id: string;
  amount: number;
  paid_by: number;
  paid_by_profile_id?: string | null;
  received_by_profile_id?: string | null;
  settled_at: string;
  note: string | null;
}

export interface Couple {
  id: string;
  share_code: string;
  max_members: number;
  profiles: Profile[];
  roles: SpaceRole[];
  tags: Tag[];
  expenses: Expense[];
  cards: Card[];
  agreements: Agreement[];
  settlements: Settlement[];
}

interface CoupleContextType {
  couple: Couple | null;
  loading: boolean;
  error: string | null;
  realtimeStatus: string;
  isSyncing: boolean;
  fetchCouple: (code: string) => Promise<void>;
  refetch: () => Promise<void>;
  updateProfile: (profileId: string, updates: Partial<Profile>) => Promise<void>;
  deleteProfile: (profileId: string, shareCode: string) => Promise<boolean>;
  addExpense: (expense: Omit<Expense, 'id' | 'couple_id' | 'created_at'>) => Promise<void>;
  addExpenses: (expenses: Omit<Expense, 'id' | 'couple_id' | 'created_at'>[]) => Promise<void>;
  updateExpense: (expenseId: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  deleteExpenses: (expenseIds: string[]) => Promise<void>;
  addTag: (tag: Omit<Tag, 'id' | 'couple_id'>) => Promise<void>;
  deleteTag: (tagId: string) => Promise<void>;
  addCard: (card: Omit<Card, 'id' | 'created_at'>) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  addAgreement: (agreement: Omit<Agreement, 'id' | 'created_at'>) => Promise<void>;
  updateAgreement: (id: string, updates: Partial<Agreement>) => Promise<void>;
  deleteAgreement: (id: string) => Promise<void>;
  addSettlement: (settlement: Omit<Settlement, 'id' | 'settled_at'>) => Promise<void>;
  calculateBalance: () => { person1Owes: number; person2Owes: number; balance: number };
  isAdmin: (profileId: string) => boolean;
  getConfiguredProfiles: () => Profile[];
}

const CoupleContext = createContext<CoupleContextType | null>(null);

export function useCoupleContext() {
  const context = useContext(CoupleContext);
  if (!context) {
    throw new Error('useCoupleContext must be used within a CoupleProvider');
  }
  return context;
}

interface CoupleProviderProps {
  children: ReactNode;
  shareCode: string;
}

export function CoupleProvider({ children, shareCode }: CoupleProviderProps) {
  const { toast } = useToast();
  const [couple, setCouple] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<string>('CONNECTING');
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to fetch and transform all couple data
  const fetchCoupleData = useCallback(async (coupleId: string, coupleData: { id: string; share_code: string; max_members?: number }): Promise<Couple> => {
    const [profilesRes, tagsRes, expensesRes, cardsRes, agreementsRes, settlementsRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('id, couple_id, name, color, avatar_index, position, username, email').eq('couple_id', coupleId).order('position'),
      supabase.from('tags').select('*').eq('couple_id', coupleId),
      supabase.from('expenses').select('*').eq('couple_id', coupleId).order('expense_date', { ascending: false }),
      supabase.from('cards').select('*').eq('couple_id', coupleId),
      supabase.from('agreements').select('*').eq('couple_id', coupleId),
      supabase.from('settlements').select('*').eq('couple_id', coupleId).order('settled_at', { ascending: false }),
      supabase.from('space_roles').select('*').eq('space_id', coupleId),
    ]);

    return {
      id: coupleData.id,
      share_code: coupleData.share_code,
      max_members: coupleData.max_members || 5,
      profiles: profilesRes.data || [],
      roles: (rolesRes.data || []) as SpaceRole[],
      tags: tagsRes.data || [],
      expenses: (expensesRes.data || []).map(e => ({
        ...e,
        split_value: e.split_value as { person1: number; person2: number },
        payment_type: e.payment_type || 'debit',
        installments: e.installments || 1,
        installment_number: e.installment_number || 1,
      })) as Expense[],
      cards: (cardsRes.data || []) as Card[],
      agreements: (agreementsRes.data || []).map(a => ({
        ...a,
        split_value: a.split_value as { person1: number; person2: number },
      })) as Agreement[],
      settlements: (settlementsRes.data || []) as Settlement[],
    };
  }, []);

  const fetchCouple = useCallback(async (code: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select('*')
        .single();

      if (coupleError) {
        if (coupleError.code === 'PGRST116') {
          setError('Espaço não encontrado. Faça login novamente.');
        } else {
          throw coupleError;
        }
        return;
      }

      setCouple(await fetchCoupleData(coupleData.id, coupleData));
    } catch (err: unknown) {
      console.error('Error fetching couple:', err);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [fetchCoupleData]);

  const refetch = useCallback(async () => {
    if (shareCode) {
      await fetchCouple(shareCode);
    }
  }, [shareCode, fetchCouple]);

  const silentRefetch = useCallback(async () => {
    if (!shareCode || !couple) return;

    syncTimeoutRef.current = setTimeout(() => setIsSyncing(true), 100);

    try {
      const { data: coupleData } = await supabase
        .from('couples')
        .select('*')
        .single();

      if (!coupleData) return;

      setCouple(await fetchCoupleData(coupleData.id, coupleData));
    } catch (err: unknown) {
      console.error('[CoupleContext] Silent refetch error:', err);
    } finally {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      setIsSyncing(false);
    }
  }, [shareCode, couple, fetchCoupleData]);

  // ============ MUTATIONS with immediate local updates ============

  const updateProfile = async (profileId: string, updates: Partial<Profile>) => {
    const validationData = {
      name: updates.name ?? 'placeholder',
      color: updates.color ?? '#000000',
      avatar_index: updates.avatar_index ?? 1,
    };
    
    const validationError = validateProfile(validationData);
    if (validationError) {
      toast({ title: validationError, variant: 'destructive' });
      return;
    }

    // Optimistic update - update local state immediately
    setCouple(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        profiles: prev.profiles.map(p => 
          p.id === profileId ? { ...p, ...updates } : p
        ),
      };
    });

    try {
      const { error } = await supabase.from('profiles').update(updates).eq('id', profileId);
      if (error) throw error;
      toast({ 
        title: 'Perfil atualizado! ✨',
        description: 'Suas alterações foram salvas'
      });
    } catch (err: unknown) {
      console.error('Error updating profile:', err);
      toast({ 
        title: 'Ops! Algo deu errado 😕',
        description: 'Não foi possível atualizar o perfil',
        variant: 'destructive' 
      });
      // Revert on error
      await refetch();
    }
  };

  const deleteProfile = async (profileId: string, code: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('profiles').update({
        name: 'Pessoa',
        avatar_index: 1,
        color: '#94A3B8'
      }).eq('id', profileId);
      if (error) throw error;
      
      localStorage.removeItem(`couple_${code}`);
      
      toast({ 
        title: 'Até logo! 👋',
        description: 'Seu perfil foi desvinculado'
      });
      return true;
    } catch (err: unknown) {
      console.error('Error deleting profile:', err);
      toast({ 
        title: 'Ops! Algo deu errado 😕',
        description: 'Não foi possível remover o perfil',
        variant: 'destructive' 
      });
      return false;
    }
  };

  const addExpense = async (expense: Omit<Expense, 'id' | 'couple_id' | 'created_at'>) => {
    if (!couple) return;
    
    const validationError = validateExpense(expense);
    if (validationError) {
      toast({ title: validationError, variant: 'destructive' });
      return;
    }

    // Create temporary ID for optimistic update
    const tempId = `temp-${Date.now()}`;
    const newExpense: Expense = {
      ...expense,
      id: tempId,
      couple_id: couple.id,
      created_at: new Date().toISOString(),
    };

    // Optimistic update
    setCouple(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        expenses: [newExpense, ...prev.expenses],
      };
    });

    try {
      const { error } = await supabase.from('expenses').insert({
        couple_id: couple.id,
        ...expense,
      });
      if (error) throw error;
      toast({ 
        title: 'Gasto registrado! 💸',
        description: 'Já está na conta do casal'
      });
      // Refetch to get real ID
      await refetch();
    } catch (err: unknown) {
      console.error('Error adding expense:', err);
      toast({ 
        title: 'Ops! Algo deu errado 😕',
        description: 'Não foi possível registrar o gasto',
        variant: 'destructive' 
      });
      // Revert on error
      setCouple(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          expenses: prev.expenses.filter(e => e.id !== tempId),
        };
      });
    }
  };

  // Bulk add expenses (for installments)
  const addExpenses = async (expenses: Omit<Expense, 'id' | 'couple_id' | 'created_at'>[]) => {
    if (!couple || expenses.length === 0) return;
    
    // Validate all expenses
    for (const expense of expenses) {
      const validationError = validateExpense(expense);
      if (validationError) {
        toast({ title: validationError, variant: 'destructive' });
        return;
      }
    }

    // Optimistic update - add all at once
    const tempExpenses: Expense[] = expenses.map((expense, index) => ({
      ...expense,
      id: `temp-${Date.now()}-${index}`,
      couple_id: couple.id,
      created_at: new Date().toISOString(),
    }));

    setCouple(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        expenses: [...tempExpenses, ...prev.expenses],
      };
    });

    try {
      // Insert all at once
      const { error } = await supabase.from('expenses').insert(
        expenses.map(e => ({ couple_id: couple.id, ...e }))
      );
      if (error) throw error;
      
      // Single notification
      const isInstallment = expenses.length > 1;
      toast({ 
        title: isInstallment ? 'Parcelamento registrado! 💳' : 'Gasto registrado! 💸',
        description: isInstallment 
          ? `${expenses.length}x adicionados` 
          : 'Já está na conta do casal'
      });
      
      // Single refetch
      await refetch();
    } catch (err: unknown) {
      console.error('Error adding expenses:', err);
      toast({ 
        title: 'Ops! Algo deu errado 😕',
        description: 'Não foi possível registrar',
        variant: 'destructive' 
      });
      // Revert
      setCouple(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          expenses: prev.expenses.filter(e => !e.id.startsWith('temp-')),
        };
      });
    }
  };

  // Update single expense
  const updateExpense = async (expenseId: string, updates: Partial<Expense>) => {
    const previousExpenses = couple?.expenses || [];

    // Optimistic update
    setCouple(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        expenses: prev.expenses.map(e => 
          e.id === expenseId ? { ...e, ...updates } : e
        ),
      };
    });

    try {
      const { error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', expenseId);
      if (error) throw error;
      
      toast({ 
        title: 'Gasto atualizado! ✏️',
        description: 'Alterações salvas'
      });
    } catch (err: unknown) {
      console.error('Error updating expense:', err);
      toast({ 
        title: 'Ops! Algo deu errado 😕',
        description: 'Não foi possível atualizar',
        variant: 'destructive' 
      });
      // Revert
      setCouple(prev => {
        if (!prev) return prev;
        return { ...prev, expenses: previousExpenses };
      });
    }
  };

  const deleteExpense = async (expenseId: string) => {
    // Save for rollback
    const previousExpenses = couple?.expenses || [];

    // Optimistic update
    setCouple(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        expenses: prev.expenses.filter(e => e.id !== expenseId),
      };
    });

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
      if (error) throw error;
      toast({ 
        title: 'Gasto removido! 🗑️',
        description: 'Retirado da conta'
      });
    } catch (err: unknown) {
      console.error('Error deleting expense:', err);
      toast({ 
        title: 'Ops! Algo deu errado 😕',
        description: 'Não foi possível remover o gasto',
        variant: 'destructive' 
      });
      // Revert on error
      setCouple(prev => {
        if (!prev) return prev;
        return { ...prev, expenses: previousExpenses };
      });
    }
  };

  // Bulk delete expenses (for installments)
  const deleteExpenses = async (expenseIds: string[]) => {
    const previousExpenses = couple?.expenses || [];

    // Optimistic update
    setCouple(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        expenses: prev.expenses.filter(e => !expenseIds.includes(e.id)),
      };
    });

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .in('id', expenseIds);
      if (error) throw error;
      
      toast({ 
        title: expenseIds.length > 1 ? 'Parcelas removidas! 🗑️' : 'Gasto removido! 🗑️',
        description: expenseIds.length > 1 ? `${expenseIds.length} parcelas removidas` : 'Retirado da conta'
      });
    } catch (err: unknown) {
      console.error('Error deleting expenses:', err);
      toast({ 
        title: 'Ops! Algo deu errado 😕',
        description: 'Não foi possível remover',
        variant: 'destructive' 
      });
      // Revert
      setCouple(prev => {
        if (!prev) return prev;
        return { ...prev, expenses: previousExpenses };
      });
    }
  };

  const addTag = async (tag: Omit<Tag, 'id' | 'couple_id'>) => {
    if (!couple) return;
    
    const validationError = validateTag(tag);
    if (validationError) {
      toast({ title: validationError, variant: 'destructive' });
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const newTag: Tag = { ...tag, id: tempId, couple_id: couple.id };

    setCouple(prev => {
      if (!prev) return prev;
      return { ...prev, tags: [...prev.tags, newTag] };
    });

    try {
      const { error } = await supabase.from('tags').insert({ couple_id: couple.id, ...tag });
      if (error) throw error;
      toast({ 
        title: 'Nova categoria! 🏷️',
        description: 'Pronta para usar'
      });
      await refetch();
    } catch (err: unknown) {
      console.error('Error adding tag:', err);
      toast({ 
        title: 'Ops! Algo deu errado 😕',
        description: 'Não foi possível criar a categoria',
        variant: 'destructive' 
      });
      setCouple(prev => {
        if (!prev) return prev;
        return { ...prev, tags: prev.tags.filter(t => t.id !== tempId) };
      });
    }
  };

  const deleteTag = async (tagId: string) => {
    const previousTags = couple?.tags || [];

    setCouple(prev => {
      if (!prev) return prev;
      return { ...prev, tags: prev.tags.filter(t => t.id !== tagId) };
    });

    try {
      const { error } = await supabase.from('tags').delete().eq('id', tagId);
      if (error) throw error;
      toast({ 
        title: 'Categoria removida! 🗑️',
        description: 'Não afeta gastos anteriores'
      });
    } catch (err: unknown) {
      console.error('Error deleting tag:', err);
      toast({ 
        title: 'Ops! Algo deu errado 😕',
        description: 'Não foi possível remover a categoria',
        variant: 'destructive' 
      });
      setCouple(prev => {
        if (!prev) return prev;
        return { ...prev, tags: previousTags };
      });
    }
  };

  const addCard = async (card: Omit<Card, 'id' | 'created_at'>) => {
    const validationError = validateCard(card);
    if (validationError) {
      toast({ title: validationError, variant: 'destructive' });
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const newCard: Card = { ...card, id: tempId, created_at: new Date().toISOString() };

    setCouple(prev => {
      if (!prev) return prev;
      return { ...prev, cards: [...prev.cards, newCard] };
    });

    try {
      const { error } = await supabase.from('cards').insert(card);
      if (error) throw error;
      toast({ 
        title: 'Cartão adicionado! 💳',
        description: 'Pronto para registrar gastos'
      });
      await refetch();
    } catch (err: unknown) {
      console.error('Error adding card:', err);
      toast({ 
        title: 'Ops! Algo deu errado 😕',
        description: 'Não foi possível adicionar o cartão',
        variant: 'destructive' 
      });
      setCouple(prev => {
        if (!prev) return prev;
        return { ...prev, cards: prev.cards.filter(c => c.id !== tempId) };
      });
    }
  };

  const deleteCard = async (cardId: string) => {
    const previousCards = couple?.cards || [];

    setCouple(prev => {
      if (!prev) return prev;
      return { ...prev, cards: prev.cards.filter(c => c.id !== cardId) };
    });

    try {
      const { error } = await supabase.from('cards').delete().eq('id', cardId);
      if (error) throw error;
      toast({ 
        title: 'Cartão removido! 🗑️',
        description: 'Retirado da lista'
      });
    } catch (err: unknown) {
      console.error('Error deleting card:', err);
      toast({ 
        title: 'Ops! Algo deu errado 😕',
        description: 'Não foi possível remover o cartão',
        variant: 'destructive' 
      });
      setCouple(prev => {
        if (!prev) return prev;
        return { ...prev, cards: previousCards };
      });
    }
  };

  const addAgreement = async (agreement: Omit<Agreement, 'id' | 'created_at'>) => {
    const validationError = validateAgreement(agreement);
    if (validationError) {
      toast({ title: validationError, variant: 'destructive' });
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const newAgreement: Agreement = { ...agreement, id: tempId, created_at: new Date().toISOString() };

    setCouple(prev => {
      if (!prev) return prev;
      return { ...prev, agreements: [...prev.agreements, newAgreement] };
    });

    try {
      const { error } = await supabase.from('agreements').insert(agreement);
      if (error) throw error;
      toast({ 
        title: 'Acordo criado! 🤝',
        description: 'Facilita gastos recorrentes'
      });
      await refetch();
    } catch (err: unknown) {
      console.error('Error adding agreement:', err);
      toast({ 
        title: 'Ops! Algo deu errado 😕',
        description: 'Não foi possível criar o acordo',
        variant: 'destructive' 
      });
      setCouple(prev => {
        if (!prev) return prev;
        return { ...prev, agreements: prev.agreements.filter(a => a.id !== tempId) };
      });
    }
  };

  const updateAgreement = async (id: string, updates: Partial<Agreement>) => {
    const previousAgreements = couple?.agreements || [];

    setCouple(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        agreements: prev.agreements.map(a => a.id === id ? { ...a, ...updates } : a),
      };
    });

    try {
      const { error } = await supabase.from('agreements').update(updates).eq('id', id);
      if (error) throw error;
    } catch (err: unknown) {
      console.error('Error updating agreement:', err);
      toast({ 
        title: 'Ops! Algo deu errado 😕',
        description: 'Não foi possível atualizar o acordo',
        variant: 'destructive' 
      });
      setCouple(prev => {
        if (!prev) return prev;
        return { ...prev, agreements: previousAgreements };
      });
    }
  };

  const deleteAgreement = async (id: string) => {
    const previousAgreements = couple?.agreements || [];

    setCouple(prev => {
      if (!prev) return prev;
      return { ...prev, agreements: prev.agreements.filter(a => a.id !== id) };
    });

    try {
      const { error } = await supabase.from('agreements').delete().eq('id', id);
      if (error) throw error;
      toast({ 
        title: 'Acordo removido! 🗑️',
        description: 'Não afeta gastos anteriores'
      });
    } catch (err: unknown) {
      console.error('Error deleting agreement:', err);
      toast({ 
        title: 'Ops! Algo deu errado 😕',
        description: 'Não foi possível remover o acordo',
        variant: 'destructive' 
      });
      setCouple(prev => {
        if (!prev) return prev;
        return { ...prev, agreements: previousAgreements };
      });
    }
  };

  const addSettlement = async (settlement: Omit<Settlement, 'id' | 'settled_at'>) => {
    if (!couple) return;
    
    const validationError = validateSettlement(settlement);
    if (validationError) {
      toast({ title: validationError, variant: 'destructive' });
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const newSettlement: Settlement = { ...settlement, id: tempId, settled_at: new Date().toISOString() };

    setCouple(prev => {
      if (!prev) return prev;
      return { ...prev, settlements: [newSettlement, ...prev.settlements] };
    });

    try {
      const { error } = await supabase.from('settlements').insert(settlement);
      if (error) throw error;
      toast({ 
        title: 'Acerto registrado! 💰',
        description: 'Saldo atualizado'
      });
      await refetch();
    } catch (err: unknown) {
      console.error('Error adding settlement:', err);
      toast({ 
        title: 'Ops! Algo deu errado 😕',
        description: 'Não foi possível registrar o acerto',
        variant: 'destructive' 
      });
      setCouple(prev => {
        if (!prev) return prev;
        return { ...prev, settlements: prev.settlements.filter(s => s.id !== tempId) };
      });
    }
  };

  const calculateBalance = useCallback(() => {
    if (!couple) return { person1Owes: 0, person2Owes: 0, balance: 0 };

    let person1Total = 0;
    let person2Total = 0;

    // Helper function to calculate shares
    const calculateShares = (total_amount: number, split_type: string, split_value: { person1: number; person2: number } | Record<string, number>) => {
      let person1Share = 0;
      let person2Share = 0;

      switch (split_type) {
        case 'equal':
          person1Share = total_amount / 2;
          person2Share = total_amount / 2;
          break;
        case 'percentage':
          person1Share = (total_amount * (split_value as { person1: number; person2: number }).person1) / 100;
          person2Share = (total_amount * (split_value as { person1: number; person2: number }).person2) / 100;
          break;
        case 'fixed':
          person1Share = (split_value as { person1: number; person2: number }).person1;
          person2Share = (split_value as { person1: number; person2: number }).person2;
          break;
        case 'full':
          if ((split_value as { person1: number; person2: number }).person1 === 100) {
            person1Share = total_amount;
          } else {
            person2Share = total_amount;
          }
          break;
      }

      return { person1Share, person2Share };
    };

    // Process expenses
    couple.expenses.forEach((expense) => {
      const { total_amount, paid_by, split_type, split_value } = expense;
      const { person1Share, person2Share } = calculateShares(total_amount, split_type, split_value);

      if (paid_by === 1) {
        person2Total += person2Share;
      } else {
        person1Total += person1Share;
      }
    });

    // Process active agreements - include them in balance calculation
    couple.agreements.filter(a => a.is_active).forEach((agreement) => {
      const { amount, paid_by, split_type, split_value } = agreement;
      const { person1Share, person2Share } = calculateShares(amount, split_type, split_value);

      if (paid_by === 1) {
        person2Total += person2Share;
      } else {
        person1Total += person1Share;
      }
    });

    // Process settlements
    couple.settlements.forEach((s) => {
      if (s.paid_by === 1) {
        person1Total -= s.amount;
      } else {
        person2Total -= s.amount;
      }
    });

    return { 
      person1Owes: Math.max(0, person1Total), 
      person2Owes: Math.max(0, person2Total), 
      balance: person2Total - person1Total 
    };
  }, [couple]);

  const isAdmin = useCallback((profileId: string): boolean => {
    if (!couple) return false;
    const role = couple.roles.find(r => r.profile_id === profileId);
    return role?.role === 'admin';
  }, [couple]);

  const getConfiguredProfiles = useCallback((): Profile[] => {
    if (!couple) return [];
    return couple.profiles.filter(isConfiguredProfile);
  }, [couple]);

  // ============ Initial fetch ============
  useEffect(() => {
    if (shareCode) {
      fetchCouple(shareCode);
    }
  }, [shareCode, fetchCouple]);

  // ============ Realtime subscription ============
  useEffect(() => {
    if (!couple?.id) return;

    const channelName = `couple-realtime-${couple.id}`;
    const tables = ['expenses', 'profiles', 'tags', 'cards', 'agreements', 'settlements'];

    let channel = supabase.channel(channelName);
    tables.forEach(table => {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `couple_id=eq.${couple.id}` },
        () => silentRefetch()
      );
    });

    channel.subscribe((status, err) => {
      setRealtimeStatus(status);
      if (status === 'CHANNEL_ERROR') {
        console.error('[CoupleContext] Realtime error:', err);
      }
    });

    return () => { supabase.removeChannel(channel); };
  }, [couple?.id, silentRefetch]);

  // ============ Fallback polling on focus ============
  useEffect(() => {
    const handleFocus = () => {
      console.log('[CoupleContext] Window focused, silent refetching...');
      silentRefetch();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [silentRefetch]);

  const value: CoupleContextType = {
    couple,
    loading,
    error,
    realtimeStatus,
    isSyncing,
    fetchCouple,
    refetch,
    updateProfile,
    deleteProfile,
    addExpense,
    addExpenses,
    updateExpense,
    deleteExpense,
    deleteExpenses,
    addTag,
    deleteTag,
    addCard,
    deleteCard,
    addAgreement,
    updateAgreement,
    deleteAgreement,
    addSettlement,
    calculateBalance,
    isAdmin,
    getConfiguredProfiles,
  };

  return (
    <CoupleContext.Provider value={value}>
      {children}
    </CoupleContext.Provider>
  );
}
