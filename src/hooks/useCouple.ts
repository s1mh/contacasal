import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
}

export interface Couple {
  id: string;
  share_code: string;
  profiles: Profile[];
  tags: Tag[];
  expenses: Expense[];
}

export function useCouple() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [couple, setCouple] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCouple = async (code: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch couple
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

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('couple_id', coupleData.id)
        .order('position');

      if (profilesError) throw profilesError;

      // Fetch tags
      const { data: tags, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .eq('couple_id', coupleData.id);

      if (tagsError) throw tagsError;

      // Fetch expenses
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('couple_id', coupleData.id)
        .order('expense_date', { ascending: false });

      if (expensesError) throw expensesError;

      setCouple({
        id: coupleData.id,
        share_code: coupleData.share_code,
        profiles: profiles || [],
        tags: tags || [],
        expenses: (expenses || []).map(e => ({
          ...e,
          split_value: e.split_value as { person1: number; person2: number }
        })) as Expense[],
      });
    } catch (err: any) {
      console.error('Error fetching couple:', err);
      setError(err.message);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createCouple = async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('couples')
        .insert({})
        .select('share_code')
        .single();

      if (error) throw error;

      return data.share_code;
    } catch (err: any) {
      console.error('Error creating couple:', err);
      toast({
        title: 'Erro ao criar espaço',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateProfile = async (profileId: string, updates: Partial<Profile>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profileId);

      if (error) throw error;

      if (shareCode) await fetchCouple(shareCode);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast({
        title: 'Erro ao atualizar perfil',
        variant: 'destructive',
      });
    }
  };

  const addExpense = async (expense: Omit<Expense, 'id' | 'couple_id' | 'created_at'>) => {
    if (!couple) return;

    try {
      const { error } = await supabase.from('expenses').insert({
        couple_id: couple.id,
        description: expense.description,
        total_amount: expense.total_amount,
        paid_by: expense.paid_by,
        split_type: expense.split_type,
        split_value: expense.split_value,
        tag_id: expense.tag_id,
        expense_date: expense.expense_date,
      });

      if (error) throw error;

      if (shareCode) await fetchCouple(shareCode);
      
      toast({
        title: 'Gasto registrado!',
        description: 'O saldo foi atualizado.',
      });
    } catch (err: any) {
      console.error('Error adding expense:', err);
      toast({
        title: 'Erro ao adicionar gasto',
        variant: 'destructive',
      });
    }
  };

  const deleteExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      if (shareCode) await fetchCouple(shareCode);
      
      toast({
        title: 'Gasto removido',
      });
    } catch (err: any) {
      console.error('Error deleting expense:', err);
      toast({
        title: 'Erro ao remover gasto',
        variant: 'destructive',
      });
    }
  };

  const addTag = async (tag: Omit<Tag, 'id' | 'couple_id'>) => {
    if (!couple) return;

    try {
      const { error } = await supabase.from('tags').insert({
        couple_id: couple.id,
        name: tag.name,
        icon: tag.icon,
        color: tag.color,
      });

      if (error) throw error;

      if (shareCode) await fetchCouple(shareCode);
    } catch (err: any) {
      console.error('Error adding tag:', err);
      toast({
        title: 'Erro ao adicionar tag',
        variant: 'destructive',
      });
    }
  };

  const deleteTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      if (shareCode) await fetchCouple(shareCode);
    } catch (err: any) {
      console.error('Error deleting tag:', err);
      toast({
        title: 'Erro ao remover tag',
        variant: 'destructive',
      });
    }
  };

  const calculateBalance = () => {
    if (!couple || !couple.expenses.length) {
      return { person1Owes: 0, person2Owes: 0, balance: 0 };
    }

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
            person2Share = 0;
          } else {
            person1Share = 0;
            person2Share = total_amount;
          }
          break;
      }

      // If person 1 paid, person 2 owes their share
      if (paid_by === 1) {
        person2Total += person2Share;
      } else {
        // If person 2 paid, person 1 owes their share
        person1Total += person1Share;
      }
    });

    const balance = person2Total - person1Total;

    return {
      person1Owes: person1Total,
      person2Owes: person2Total,
      balance, // Positive = person1 gets money, Negative = person2 gets money
    };
  };

  useEffect(() => {
    if (shareCode) {
      fetchCouple(shareCode);

      // Set up real-time subscription
      const channel = supabase
        .channel('couple-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'expenses' },
          () => fetchCouple(shareCode)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          () => fetchCouple(shareCode)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tags' },
          () => fetchCouple(shareCode)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [shareCode]);

  return {
    couple,
    loading,
    error,
    createCouple,
    updateProfile,
    addExpense,
    deleteExpense,
    addTag,
    deleteTag,
    calculateBalance,
    refetch: () => shareCode && fetchCouple(shareCode),
  };
}
