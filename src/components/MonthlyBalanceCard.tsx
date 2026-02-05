import { useMemo } from 'react';
import { ArrowRight, Calendar } from 'lucide-react';
import { Avatar } from './Avatar';
import { Profile, Expense, Agreement, Settlement } from '@/contexts/CoupleContext';
import { isConfiguredProfile, maskCurrencyValue } from '@/lib/utils';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useI18n } from '@/contexts/I18nContext';

interface MonthlyBalanceCardProps {
  profiles: Profile[];
  expenses: Expense[];
  agreements: Agreement[];
  settlements: Settlement[];
}

interface PersonBalance {
  profile: Profile;
  owes: number;
  receives: number;
  netBalance: number;
}

interface Settlement_DTO {
  from: Profile;
  to: Profile;
  amount: number;
}

export function MonthlyBalanceCard({ profiles, expenses, agreements, settlements }: MonthlyBalanceCardProps) {
  const { t: prefT, valuesHidden } = usePreferences();
  const { formatCurrency } = useI18n();

  const configuredProfiles = profiles.filter(isConfiguredProfile);

  // Calculate monthly balance for all people
  const { monthlySettlements, currentMonth } = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthName = startOfMonth.toLocaleString('pt-BR', { month: 'long' });

    // Filter expenses for current month only
    const monthExpenses = expenses.filter(e => {
      const expenseDate = new Date(e.expense_date);
      return expenseDate >= startOfMonth;
    });

    // Filter settlements for current month
    const monthSettlements = settlements.filter(s => {
      const settlementDate = new Date(s.settled_at);
      return settlementDate >= startOfMonth;
    });

    // Balance tracking: positive = owes money, negative = is owed money (creditor)
    const balances: Map<string, number> = new Map();
    configuredProfiles.forEach(p => {
      balances.set(p.id, 0);
    });

    // Helper to process an expense and update balances
    const processExpense = (
      totalAmount: number,
      splitType: string,
      splitValue: { person1: number; person2: number } | Record<string, number>,
      paidByPosition: number,
      paidByProfileId?: string | null
    ) => {
      // Get the payer profile
      let payerProfile: Profile | undefined;
      if (paidByProfileId) {
        payerProfile = configuredProfiles.find(p => p.id === paidByProfileId);
      }
      if (!payerProfile) {
        payerProfile = configuredProfiles.find(p => p.position === paidByPosition);
      }

      if (!payerProfile) return;

      const numPeople = configuredProfiles.length;

      // Calculate each person's share
      const shares: Map<string, number> = new Map();

      if (splitType === 'equal') {
        const sharePerPerson = totalAmount / numPeople;
        configuredProfiles.forEach(p => {
          shares.set(p.id, sharePerPerson);
        });
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
        // One person pays 100% - they owe the full amount, others owe nothing
        const sv = splitValue as Record<string, number>;
        configuredProfiles.forEach(p => {
          const key = `person${p.position}`;
          if (sv[key] === 100) {
            shares.set(p.id, totalAmount);
          } else {
            shares.set(p.id, 0);
          }
        });
      }

      // The payer paid the full amount (becomes creditor for what they advanced)
      balances.set(payerProfile.id, (balances.get(payerProfile.id) || 0) - totalAmount);

      // Each person owes their share
      configuredProfiles.forEach(p => {
        const share = shares.get(p.id) || 0;
        balances.set(p.id, (balances.get(p.id) || 0) + share);
      });
    };

    // Process monthly expenses
    monthExpenses.forEach(expense => {
      processExpense(
        expense.total_amount,
        expense.split_type,
        expense.split_value,
        expense.paid_by,
        expense.paid_by_profile_id
      );
    });

    // Process active agreements (recurring payments)
    agreements.filter(a => a.is_active).forEach(agreement => {
      processExpense(
        agreement.amount,
        agreement.split_type,
        agreement.split_value,
        agreement.paid_by,
        agreement.paid_by_profile_id
      );
    });

    // Process monthly settlements (when someone pays back)
    monthSettlements.forEach(s => {
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
    const debtors: PersonBalance[] = [];
    const creditors: PersonBalance[] = [];

    configuredProfiles.forEach(p => {
      const balance = balances.get(p.id) || 0;
      if (balance > 0.01) {
        debtors.push({ profile: p, owes: balance, receives: 0, netBalance: balance });
      } else if (balance < -0.01) {
        creditors.push({ profile: p, owes: 0, receives: Math.abs(balance), netBalance: balance });
      }
    });

    // Sort to optimize settlements
    debtors.sort((a, b) => b.owes - a.owes);
    creditors.sort((a, b) => b.receives - a.receives);

    // Calculate who pays whom
    const settlementsNeeded: Settlement_DTO[] = [];

    debtors.forEach(debtor => {
      let remaining = debtor.owes;

      for (const creditor of creditors) {
        if (remaining <= 0.01) break;
        if (creditor.receives <= 0.01) continue;

        const amount = Math.min(remaining, creditor.receives);
        if (amount > 0.01) {
          settlementsNeeded.push({
            from: debtor.profile,
            to: creditor.profile,
            amount
          });
          remaining -= amount;
          creditor.receives -= amount;
        }
      }
    });

    return {
      monthlySettlements: settlementsNeeded,
      currentMonth: monthName.charAt(0).toUpperCase() + monthName.slice(1)
    };
  }, [expenses, agreements, settlements, configuredProfiles]);

  // Don't show if less than 2 configured profiles
  if (configuredProfiles.length < 2) {
    return null;
  }

  // Check if everyone is balanced
  const isBalanced = monthlySettlements.length === 0;

  return (
    <div className="bg-card rounded-3xl p-4 shadow-glass animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-medium text-muted-foreground">
          {prefT('Esse mês')} ({currentMonth})
        </h2>
      </div>

      {isBalanced ? (
        <div className="text-center py-3">
          <p className="text-sm font-medium text-green-600">
            {prefT('Tudo equilibrado este mês!')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {prefT('Ninguém deve nada a ninguém')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {monthlySettlements.map((settlement, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-2xl"
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

              <div className="flex items-center gap-2 px-3">
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">
                  {valuesHidden
                    ? maskCurrencyValue(formatCurrency(settlement.amount))
                    : formatCurrency(settlement.amount)}
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
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
    </div>
  );
}
