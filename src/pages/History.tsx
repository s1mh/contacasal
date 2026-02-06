import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Calendar, Filter, FileText, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { ExpenseCard } from '@/components/ExpenseCard';
import { TagPill } from '@/components/TagPill';
import { AnimatedPage, AnimatedItem } from '@/components/AnimatedPage';
import { Couple, Expense, Profile, useCoupleContext } from '@/contexts/CoupleContext';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { getDateFnsLocale } from '@/lib/preferences';
import { usePreferences } from '@/contexts/PreferencesContext';
import { cn, maskCurrencyValue, isConfiguredProfile } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import { DeleteExpenseDialog } from '@/components/DeleteExpenseDialog';
import { EditExpenseDialog } from '@/components/EditExpenseDialog';
import { useI18n } from '@/contexts/I18nContext';

export default function History() {
  const { t, locale, formatCurrency, interpolate } = useI18n();
  const { couple } = useOutletContext<{ couple: Couple }>();
  const { deleteExpense, deleteExpenses, updateExpense } = useCoupleContext();
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const { locale: prefLocale, t: prefT, valuesHidden, setValuesHidden } = usePreferences();
  const dateLocale = getDateFnsLocale(prefLocale);

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  // Para gastos de crédito com billing_month, usar billing_month para filtrar
  // Para outros gastos, usar expense_date
  const filteredExpenses = useMemo(() => {
    return couple.expenses.filter((expense) => {
      const dateToCheck = expense.billing_month 
        ? parseISO(expense.billing_month) 
        : parseISO(expense.expense_date);
      const inMonth = isWithinInterval(dateToCheck, { start: monthStart, end: monthEnd });
      const matchesTag = !selectedTagId || expense.tag_id === selectedTagId;
      return inMonth && matchesTag;
    });
  }, [couple.expenses, monthStart, monthEnd, selectedTagId]);

  const totalAmount = useMemo(() => {
    const expensesTotal = filteredExpenses.reduce((sum, e) => sum + e.total_amount, 0);
    const agreementsTotal = couple.agreements
      .filter(a => a.is_active)
      .reduce((sum, a) => sum + a.amount, 0);
    return expensesTotal + agreementsTotal;
  }, [filteredExpenses, couple.agreements]);

  // Calculate who paid whom for the selected month
  const configuredProfiles = couple.profiles.filter(isConfiguredProfile);

  const monthlySettlements = useMemo(() => {
    if (configuredProfiles.length < 2) return [];

    const balances: Map<string, number> = new Map();
    configuredProfiles.forEach(p => balances.set(p.id, 0));

    const processExpense = (
      totalAmount: number,
      splitType: string,
      splitValue: { person1: number; person2: number } | Record<string, number>,
      paidByPosition: number,
      paidByProfileId?: string | null
    ) => {
      let payerProfile: Profile | undefined;
      if (paidByProfileId) {
        payerProfile = configuredProfiles.find(p => p.id === paidByProfileId);
      }
      if (!payerProfile) {
        payerProfile = configuredProfiles.find(p => p.position === paidByPosition);
      }
      if (!payerProfile) return;

      const numPeople = configuredProfiles.length;
      const shares: Map<string, number> = new Map();

      if (splitType === 'equal') {
        const sharePerPerson = totalAmount / numPeople;
        configuredProfiles.forEach(p => shares.set(p.id, sharePerPerson));
      } else if (splitType === 'percentage') {
        const sv = splitValue as Record<string, number>;
        configuredProfiles.forEach(p => {
          const key = `person${p.position}`;
          const percentage = sv[key] ?? (100 / numPeople);
          shares.set(p.id, (totalAmount * percentage) / 100);
        });
      } else if (splitType === 'fixed') {
        const sv = splitValue as Record<string, number>;
        configuredProfiles.forEach(p => {
          const key = `person${p.position}`;
          shares.set(p.id, sv[key] ?? 0);
        });
      } else if (splitType === 'full') {
        const sv = splitValue as Record<string, number>;
        configuredProfiles.forEach(p => {
          const key = `person${p.position}`;
          shares.set(p.id, sv[key] === 100 ? totalAmount : 0);
        });
      }

      balances.set(payerProfile.id, (balances.get(payerProfile.id) || 0) - totalAmount);
      configuredProfiles.forEach(p => {
        const share = shares.get(p.id) || 0;
        balances.set(p.id, (balances.get(p.id) || 0) + share);
      });
    };

    // Process filtered expenses for this month
    filteredExpenses.forEach(expense => {
      processExpense(expense.total_amount, expense.split_type, expense.split_value, expense.paid_by, expense.paid_by_profile_id);
    });

    // Process active agreements
    couple.agreements.filter(a => a.is_active).forEach(agreement => {
      processExpense(agreement.amount, agreement.split_type, agreement.split_value, agreement.paid_by, agreement.paid_by_profile_id);
    });

    // Process settlements for this month
    couple.settlements
      .filter(s => {
        const settlementDate = parseISO(s.settled_at);
        return isWithinInterval(settlementDate, { start: monthStart, end: monthEnd });
      })
      .forEach(s => {
        let payerProfile: Profile | undefined;
        let receiverProfile: Profile | undefined;

        if (s.paid_by_profile_id) {
          payerProfile = configuredProfiles.find(p => p.id === s.paid_by_profile_id);
        }
        if (!payerProfile) {
          payerProfile = configuredProfiles.find(p => p.position === s.paid_by);
        }
        if (s.received_by_profile_id) {
          receiverProfile = configuredProfiles.find(p => p.id === s.received_by_profile_id);
        }

        if (payerProfile) {
          balances.set(payerProfile.id, (balances.get(payerProfile.id) || 0) - s.amount);
        }
        if (receiverProfile) {
          balances.set(receiverProfile.id, (balances.get(receiverProfile.id) || 0) + s.amount);
        }
      });

    // Calculate settlements needed
    const debtors: { profile: Profile; owes: number }[] = [];
    const creditors: { profile: Profile; receives: number }[] = [];

    configuredProfiles.forEach(p => {
      const balance = balances.get(p.id) || 0;
      if (balance > 0.01) {
        debtors.push({ profile: p, owes: balance });
      } else if (balance < -0.01) {
        creditors.push({ profile: p, receives: Math.abs(balance) });
      }
    });

    debtors.sort((a, b) => b.owes - a.owes);
    creditors.sort((a, b) => b.receives - a.receives);

    const settlements: { from: Profile; to: Profile; amount: number }[] = [];
    debtors.forEach(debtor => {
      let remaining = debtor.owes;
      for (const creditor of creditors) {
        if (remaining <= 0.01) break;
        if (creditor.receives <= 0.01) continue;
        const amount = Math.min(remaining, creditor.receives);
        if (amount > 0.01) {
          settlements.push({ from: debtor.profile, to: creditor.profile, amount });
          remaining -= amount;
          creditor.receives -= amount;
        }
      }
    });

    return settlements;
  }, [filteredExpenses, couple.agreements, couple.settlements, configuredProfiles, monthStart, monthEnd]);

  // Encontrar parcelas relacionadas do mesmo parcelamento
  const getRelatedExpenses = (expense: Expense): Expense[] => {
    if (!expense.installments || expense.installments <= 1) return [expense];
    
    const baseDescription = expense.description?.replace(/\s*\(\d+\/\d+\)$/, '') || '';
    
    return couple.expenses.filter(e => {
      if (e.installments !== expense.installments) return false;
      if (e.card_id !== expense.card_id) return false;
      if (e.tag_id !== expense.tag_id) return false;
      const eBaseDesc = e.description?.replace(/\s*\(\d+\/\d+\)$/, '') || '';
      return eBaseDesc === baseDescription;
    });
  };

  const navigateMonth = (direction: number) => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  return (
    <AnimatedPage className="p-4 safe-top">
      {/* Header */}
      <AnimatedItem delay={0}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">{prefT('Histórico')}</h1>
          <div className="flex items-center gap-1 bg-muted rounded-full p-1">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-background rounded-full transition-colors"
            >
              ←
            </button>
            <span className="px-3 text-sm font-medium min-w-[100px] text-center">
              {format(selectedMonth, 'MMM yyyy', { locale: dateLocale })}
            </span>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-background rounded-full transition-colors"
            >
              →
            </button>
          </div>
        </div>
      </AnimatedItem>

      {/* Month Summary */}
      <AnimatedItem delay={100}>
        <div className="bg-card rounded-3xl p-4 shadow-glass mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{prefT('Total do mês')}</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold transition-all duration-300">
                  {valuesHidden ? maskCurrencyValue(formatCurrency(totalAmount)) : formatCurrency(totalAmount)}
                </p>
                <button
                  onClick={() => setValuesHidden(!valuesHidden)}
                  className="p-1.5 rounded-full hover:bg-muted/80 transition-colors"
                  aria-label={valuesHidden ? prefT('Mostrar valores') : prefT('Ocultar valores')}
                >
                  {valuesHidden ? (
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Eye className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                {filteredExpenses.length} {prefT('gastos')}
              </p>
            </div>
          </div>

          {/* Who paid whom */}
          {monthlySettlements.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
              {monthlySettlements.map((settlement, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <Avatar
                      avatarIndex={settlement.from.avatar_index}
                      size="sm"
                      ringColor={settlement.from.color}
                    />
                    <span className="text-sm font-medium" style={{ color: settlement.from.color }}>
                      {settlement.from.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2">
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-semibold text-sm">
                      {valuesHidden
                        ? maskCurrencyValue(formatCurrency(settlement.amount))
                        : formatCurrency(settlement.amount)}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: settlement.to.color }}>
                      {settlement.to.name}
                    </span>
                    <Avatar
                      avatarIndex={settlement.to.avatar_index}
                      size="sm"
                      ringColor={settlement.to.color}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          {monthlySettlements.length === 0 && configuredProfiles.length >= 2 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-center text-green-600 font-medium">
                {prefT('Tudo equilibrado este mês!')}
              </p>
            </div>
          )}
        </div>
      </AnimatedItem>

      {/* Tag Filter */}
      <AnimatedItem delay={200}>
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{prefT('Filtrar por categoria')}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTagId(null)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                !selectedTagId
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {prefT('Todos')}
            </button>
            {couple.tags.map((tag) => (
              <TagPill
                key={tag.id}
                name={tag.name}
                icon={tag.icon}
                color={tag.color}
                selected={selectedTagId === tag.id}
                onClick={() => setSelectedTagId(selectedTagId === tag.id ? null : tag.id)}
              />
            ))}
          </div>
        </div>
      </AnimatedItem>

      {/* Active Agreements - Separate section */}
      {couple.agreements.filter(a => a.is_active).length > 0 && (
        <AnimatedItem delay={250}>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{prefT('Acordos recorrentes')}</span>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-glass space-y-3">
              {couple.agreements.filter(a => a.is_active).map((agreement) => {
                const tag = couple.tags.find(t => t.id === agreement.tag_id);
                const paidByProfile = couple.profiles.find(p => p.id === agreement.paid_by_profile_id || p.position === agreement.paid_by);
                
                return (
                  <div key={agreement.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {paidByProfile && (
                        <Avatar avatarIndex={paidByProfile.avatar_index} size="sm" ringColor={paidByProfile.color} />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          {tag && <TagPill name={tag.name} icon={tag.icon} color={tag.color} size="sm" />}
                          <span className="font-medium text-sm">{agreement.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {prefT('Dia {day} de cada mês', { day: agreement.day_of_month })}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold transition-all duration-300">
                      {valuesHidden ? maskCurrencyValue(formatCurrency(agreement.amount)) : formatCurrency(agreement.amount)}
                    </span>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-border/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{prefT('Total acordos')}</span>
                  <span className="font-bold transition-all duration-300">
                    {valuesHidden
                      ? maskCurrencyValue(formatCurrency(couple.agreements.filter(a => a.is_active).reduce((sum, a) => sum + a.amount, 0)))
                      : formatCurrency(couple.agreements.filter(a => a.is_active).reduce((sum, a) => sum + a.amount, 0))
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </AnimatedItem>
      )}
      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <AnimatedItem delay={300}>
          <div className="bg-card rounded-2xl p-8 text-center shadow-glass">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
              {prefT('Nenhum gasto encontrado')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedTagId ? prefT('Tente remover o filtro') : prefT('Neste período')}
            </p>
          </div>
        </AnimatedItem>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((expense, index) => (
            <AnimatedItem key={expense.id} delay={300 + index * 50}>
              <ExpenseCard
                expense={expense}
                profiles={couple.profiles}
                tags={couple.tags}
                cards={couple.cards}
                onEdit={() => {
                  setExpenseToEdit(expense);
                  setEditDialogOpen(true);
                }}
                onDelete={() => {
                  setExpenseToDelete(expense);
                  setDeleteDialogOpen(true);
                }}
              />
            </AnimatedItem>
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      {expenseToDelete && (
        <DeleteExpenseDialog
          expense={expenseToDelete}
          relatedExpenses={getRelatedExpenses(expenseToDelete)}
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) setExpenseToDelete(null);
          }}
          onDeleteSingle={() => deleteExpense(expenseToDelete.id)}
          onDeleteMultiple={(ids) => deleteExpenses(ids)}
        />
      )}

      {/* Edit Dialog */}
      {expenseToEdit && (
        <EditExpenseDialog
          expense={expenseToEdit}
          profiles={couple.profiles}
          tags={couple.tags}
          cards={couple.cards}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setExpenseToEdit(null);
          }}
          onSave={(updates) => updateExpense(expenseToEdit.id, updates)}
        />
      )}
    </AnimatedPage>
  );
}
