import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  split_type: 'equal' | 'percentage' | 'fixed' | 'full';
  split_value: { person1: number; person2: number };
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
  split_value: { person1: number; person2: number };
  paid_by: number;
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
  settled_at: string;
  note: string | null;
}

export interface Couple {
  id: string;
  share_code: string;
  profiles: Profile[];
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
  fetchCouple: (code: string) => Promise<void>;
  refetch: () => Promise<void>;
  updateProfile: (profileId: string, updates: Partial<Profile>) => Promise<void>;
  deleteProfile: (profileId: string, shareCode: string) => Promise<boolean>;
  addExpense: (expense: Omit<Expense, 'id' | 'couple_id' | 'created_at'>) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  addTag: (tag: Omit<Tag, 'id' | 'couple_id'>) => Promise<void>;
  deleteTag: (tagId: string) => Promise<void>;
  addCard: (card: Omit<Card, 'id' | 'created_at'>) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  addAgreement: (agreement: Omit<Agreement, 'id' | 'created_at'>) => Promise<void>;
  updateAgreement: (id: string, updates: Partial<Agreement>) => Promise<void>;
  deleteAgreement: (id: string) => Promise<void>;
  addSettlement: (settlement: Omit<Settlement, 'id' | 'settled_at'>) => Promise<void>;
  calculateBalance: () => { person1Owes: number; person2Owes: number; balance: number };
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

  const fetchCouple = useCallback(async (code: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select('*')
        .eq('share_code', code)
        .single();

      if (coupleError) {
        if (coupleError.code === 'PGRST116') {
          setError('Espaço não encontrado');
        } else {
          throw coupleError;
        }
        return;
      }

      const [profilesRes, tagsRes, expensesRes, cardsRes, agreementsRes, settlementsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('couple_id', coupleData.id).order('position'),
        supabase.from('tags').select('*').eq('couple_id', coupleData.id),
        supabase.from('expenses').select('*').eq('couple_id', coupleData.id).order('expense_date', { ascending: false }),
        supabase.from('cards').select('*').eq('couple_id', coupleData.id),
        supabase.from('agreements').select('*').eq('couple_id', coupleData.id),
        supabase.from('settlements').select('*').eq('couple_id', coupleData.id).order('settled_at', { ascending: false }),
      ]);

      setCouple({
        id: coupleData.id,
        share_code: coupleData.share_code,
        profiles: profilesRes.data || [],
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
      });
    } catch (err: unknown) {
      console.error('Error fetching couple:', err);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    if (shareCode) {
      await fetchCouple(shareCode);
    }
  }, [shareCode, fetchCouple]);

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
      toast({ title: 'Perfil atualizado!' });
    } catch (err: unknown) {
      console.error('Error updating profile:', err);
      toast({ title: 'Erro ao atualizar perfil', variant: 'destructive' });
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
      
      toast({ title: 'Perfil removido' });
      return true;
    } catch (err: unknown) {
      console.error('Error deleting profile:', err);
      toast({ title: 'Erro ao remover perfil', variant: 'destructive' });
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
      toast({ title: 'Gasto registrado!' });
      // Refetch to get real ID
      await refetch();
    } catch (err: unknown) {
      console.error('Error adding expense:', err);
      toast({ title: 'Erro ao adicionar gasto', variant: 'destructive' });
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
      toast({ title: 'Gasto removido' });
    } catch (err: unknown) {
      console.error('Error deleting expense:', err);
      toast({ title: 'Erro ao remover gasto', variant: 'destructive' });
      // Revert on error
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
      toast({ title: 'Categoria adicionada!' });
      await refetch();
    } catch (err: unknown) {
      console.error('Error adding tag:', err);
      toast({ title: 'Erro ao adicionar categoria', variant: 'destructive' });
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
      toast({ title: 'Categoria removida' });
    } catch (err: unknown) {
      console.error('Error deleting tag:', err);
      toast({ title: 'Erro ao remover categoria', variant: 'destructive' });
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
      toast({ title: 'Cartão adicionado!' });
      await refetch();
    } catch (err: unknown) {
      console.error('Error adding card:', err);
      toast({ title: 'Erro ao adicionar cartão', variant: 'destructive' });
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
      toast({ title: 'Cartão removido' });
    } catch (err: unknown) {
      console.error('Error deleting card:', err);
      toast({ title: 'Erro ao remover cartão', variant: 'destructive' });
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
      toast({ title: 'Acordo criado!' });
      await refetch();
    } catch (err: unknown) {
      console.error('Error adding agreement:', err);
      toast({ title: 'Erro ao criar acordo', variant: 'destructive' });
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
      toast({ title: 'Erro ao atualizar acordo', variant: 'destructive' });
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
      toast({ title: 'Acordo removido' });
    } catch (err: unknown) {
      console.error('Error deleting agreement:', err);
      toast({ title: 'Erro ao remover acordo', variant: 'destructive' });
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
      toast({ title: 'Acerto registrado!' });
      await refetch();
    } catch (err: unknown) {
      console.error('Error adding settlement:', err);
      toast({ title: 'Erro ao registrar acerto', variant: 'destructive' });
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

    couple.expenses.forEach((expense) => {
      const { total_amount, paid_by, split_type, split_value } = expense;
      let person1Share = 0;
      let person2Share = 0;

      switch (split_type) {
        case 'equal':
          person1Share = total_amount / 2;
          person2Share = total_amount / 2;
          break;
        case 'percentage':
          person1Share = (total_amount * split_value.person1) / 100;
          person2Share = (total_amount * split_value.person2) / 100;
          break;
        case 'fixed':
          person1Share = split_value.person1;
          person2Share = split_value.person2;
          break;
        case 'full':
          if (split_value.person1 === 100) {
            person1Share = total_amount;
          } else {
            person2Share = total_amount;
          }
          break;
      }

      if (paid_by === 1) {
        person2Total += person2Share;
      } else {
        person1Total += person1Share;
      }
    });

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
    console.log('[CoupleContext] Setting up realtime channel:', channelName);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'expenses', filter: `couple_id=eq.${couple.id}` }, 
        (payload) => {
          console.log('[CoupleContext] Realtime expenses update:', payload.eventType);
          refetch();
        }
      )
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles', filter: `couple_id=eq.${couple.id}` }, 
        (payload) => {
          console.log('[CoupleContext] Realtime profiles update:', payload.eventType);
          refetch();
        }
      )
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'tags', filter: `couple_id=eq.${couple.id}` }, 
        (payload) => {
          console.log('[CoupleContext] Realtime tags update:', payload.eventType);
          refetch();
        }
      )
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'cards', filter: `couple_id=eq.${couple.id}` }, 
        (payload) => {
          console.log('[CoupleContext] Realtime cards update:', payload.eventType);
          refetch();
        }
      )
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'agreements', filter: `couple_id=eq.${couple.id}` }, 
        (payload) => {
          console.log('[CoupleContext] Realtime agreements update:', payload.eventType);
          refetch();
        }
      )
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'settlements', filter: `couple_id=eq.${couple.id}` }, 
        (payload) => {
          console.log('[CoupleContext] Realtime settlements update:', payload.eventType);
          refetch();
        }
      )
      .subscribe((status, err) => {
        console.log('[CoupleContext] Realtime status:', status, err || '');
        setRealtimeStatus(status);
        if (status === 'CHANNEL_ERROR') {
          console.error('[CoupleContext] Realtime channel error:', err);
        }
      });
      
    return () => { 
      console.log('[CoupleContext] Removing realtime channel:', channelName);
      supabase.removeChannel(channel); 
    };
  }, [couple?.id, refetch]);

  // ============ Fallback polling on focus ============
  useEffect(() => {
    const handleFocus = () => {
      console.log('[CoupleContext] Window focused, refetching...');
      refetch();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetch]);

  const value: CoupleContextType = {
    couple,
    loading,
    error,
    realtimeStatus,
    fetchCouple,
    refetch,
    updateProfile,
    deleteProfile,
    addExpense,
    deleteExpense,
    addTag,
    deleteTag,
    addCard,
    deleteCard,
    addAgreement,
    updateAgreement,
    deleteAgreement,
    addSettlement,
    calculateBalance,
  };

  return (
    <CoupleContext.Provider value={value}>
      {children}
    </CoupleContext.Provider>
  );
}
