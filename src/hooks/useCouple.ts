import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

export function useCouple() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const { toast } = useToast();
  const [couple, setCouple] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCouple = async (code: string) => {
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
    } catch (err: any) {
      console.error('Error fetching couple:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createCouple = async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.from('couples').insert({}).select('share_code').single();
      if (error) throw error;
      return data.share_code;
    } catch (err: any) {
      console.error('Error creating couple:', err);
      toast({ title: 'Erro ao criar espaço', variant: 'destructive' });
      return null;
    }
  };

  const updateProfile = async (profileId: string, updates: Partial<Profile>) => {
    try {
      const { error } = await supabase.from('profiles').update(updates).eq('id', profileId);
      if (error) throw error;
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast({ title: 'Erro ao atualizar perfil', variant: 'destructive' });
    }
  };

  const deleteProfile = async (profileId: string, shareCode: string) => {
    try {
      // Reset profile to default state instead of deleting
      const { error } = await supabase.from('profiles').update({
        name: 'Pessoa',
        avatar_index: 1,
        color: '#94A3B8'
      }).eq('id', profileId);
      if (error) throw error;
      
      // Clear localStorage
      localStorage.removeItem(`couple_${shareCode}`);
      
      toast({ title: 'Perfil removido' });
      return true;
    } catch (err: any) {
      console.error('Error deleting profile:', err);
      toast({ title: 'Erro ao remover perfil', variant: 'destructive' });
      return false;
    }
  };

  const addExpense = async (expense: Omit<Expense, 'id' | 'couple_id' | 'created_at'>) => {
    if (!couple) return;
    try {
      const { error } = await supabase.from('expenses').insert({
        couple_id: couple.id,
        ...expense,
      });
      if (error) throw error;
      if (shareCode) await fetchCouple(shareCode);
      toast({ title: 'Gasto registrado!' });
    } catch (err: any) {
      console.error('Error adding expense:', err);
      toast({ title: 'Erro ao adicionar gasto', variant: 'destructive' });
    }
  };

  const deleteExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
      if (error) throw error;
      if (shareCode) await fetchCouple(shareCode);
      toast({ title: 'Gasto removido' });
    } catch (err: any) {
      console.error('Error deleting expense:', err);
      toast({ title: 'Erro ao remover gasto', variant: 'destructive' });
    }
  };

  const addTag = async (tag: Omit<Tag, 'id' | 'couple_id'>) => {
    if (!couple) return;
    try {
      const { error } = await supabase.from('tags').insert({ couple_id: couple.id, ...tag });
      if (error) throw error;
      if (shareCode) await fetchCouple(shareCode);
    } catch (err: any) {
      console.error('Error adding tag:', err);
      toast({ title: 'Erro ao adicionar tag', variant: 'destructive' });
    }
  };

  const deleteTag = async (tagId: string) => {
    try {
      const { error } = await supabase.from('tags').delete().eq('id', tagId);
      if (error) throw error;
      if (shareCode) await fetchCouple(shareCode);
    } catch (err: any) {
      console.error('Error deleting tag:', err);
      toast({ title: 'Erro ao remover tag', variant: 'destructive' });
    }
  };

  const addCard = async (card: Omit<Card, 'id' | 'created_at'>) => {
    try {
      const { error } = await supabase.from('cards').insert(card);
      if (error) throw error;
      if (shareCode) await fetchCouple(shareCode);
      toast({ title: 'Cartão adicionado!' });
    } catch (err: any) {
      console.error('Error adding card:', err);
      toast({ title: 'Erro ao adicionar cartão', variant: 'destructive' });
    }
  };

  const deleteCard = async (cardId: string) => {
    try {
      const { error } = await supabase.from('cards').delete().eq('id', cardId);
      if (error) throw error;
      if (shareCode) await fetchCouple(shareCode);
      toast({ title: 'Cartão removido' });
    } catch (err: any) {
      console.error('Error deleting card:', err);
      toast({ title: 'Erro ao remover cartão', variant: 'destructive' });
    }
  };

  const addAgreement = async (agreement: Omit<Agreement, 'id' | 'created_at'>) => {
    try {
      const { error } = await supabase.from('agreements').insert(agreement);
      if (error) throw error;
      if (shareCode) await fetchCouple(shareCode);
      toast({ title: 'Acordo criado!' });
    } catch (err: any) {
      console.error('Error adding agreement:', err);
      toast({ title: 'Erro ao criar acordo', variant: 'destructive' });
    }
  };

  const updateAgreement = async (id: string, updates: Partial<Agreement>) => {
    try {
      const { error } = await supabase.from('agreements').update(updates).eq('id', id);
      if (error) throw error;
      if (shareCode) await fetchCouple(shareCode);
    } catch (err: any) {
      console.error('Error updating agreement:', err);
      toast({ title: 'Erro ao atualizar acordo', variant: 'destructive' });
    }
  };

  const deleteAgreement = async (id: string) => {
    try {
      const { error } = await supabase.from('agreements').delete().eq('id', id);
      if (error) throw error;
      if (shareCode) await fetchCouple(shareCode);
      toast({ title: 'Acordo removido' });
    } catch (err: any) {
      console.error('Error deleting agreement:', err);
      toast({ title: 'Erro ao remover acordo', variant: 'destructive' });
    }
  };

  const addSettlement = async (settlement: Omit<Settlement, 'id' | 'settled_at'>) => {
    try {
      const { error } = await supabase.from('settlements').insert(settlement);
      if (error) throw error;
      if (shareCode) await fetchCouple(shareCode);
      toast({ title: 'Acerto registrado!' });
    } catch (err: any) {
      console.error('Error adding settlement:', err);
      toast({ title: 'Erro ao registrar acerto', variant: 'destructive' });
    }
  };

  const calculateBalance = () => {
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

    // Subtract settlements
    couple.settlements.forEach((s) => {
      if (s.paid_by === 1) {
        person1Total -= s.amount;
      } else {
        person2Total -= s.amount;
      }
    });

    return { person1Owes: Math.max(0, person1Total), person2Owes: Math.max(0, person2Total), balance: person2Total - person1Total };
  };

  useEffect(() => {
    if (shareCode) {
      fetchCouple(shareCode);
      const channel = supabase
        .channel('couple-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchCouple(shareCode))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchCouple(shareCode))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tags' }, () => fetchCouple(shareCode))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, () => fetchCouple(shareCode))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agreements' }, () => fetchCouple(shareCode))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements' }, () => fetchCouple(shareCode))
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [shareCode]);

  return {
    couple,
    loading,
    error,
    createCouple,
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
    refetch: () => shareCode && fetchCouple(shareCode),
  };
}
