import { useMemo } from 'react';
import { cn, isConfiguredProfile, maskCurrencyValue } from '@/lib/utils';
import { Avatar } from './Avatar';
import { Profile, Expense, Agreement, Settlement } from '@/contexts/CoupleContext';
import { ArrowRight, Eye, EyeOff, Scale } from 'lucide-react';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useI18n } from '@/contexts/I18nContext';
import { useCoupleContext } from '@/contexts/CoupleContext';

interface BalanceCardProps {
  profiles: Profile[];
  balance: {
    person1Owes: number;
    person2Owes: number;
    balance: number;
  };
}

interface SettlementNeeded {
  from: Profile;
  to: Profile;
  amount: number;
}

export function BalanceCard({ profiles, balance }: BalanceCardProps) {
  const { t: prefT, valuesHidden, setValuesHidden } = usePreferences();
  const { formatCurrency } = useI18n();
  const { couple } = useCoupleContext();

  const configuredProfiles = profiles.filter(isConfiguredProfile);
  const hasMultiplePeople = configuredProfiles.length >= 2;

  // Calculate settlements for all people (scalable approach)
  const settlements = useMemo<SettlementNeeded[]>(() => {
    if (!couple || configuredProfiles.length < 2) return [];

    // Balance tracking: positive = owes money, negative = is owed money (creditor)
    const balances: Map<string, number> = new Map();
    configuredProfiles.forEach(p => {
      balances.set(p.id, 0);
    });

    // Helper to calculate shares and update balances
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
      // Then each person owes their share (becomes debtor)
      // Net effect: payer's balance = their_share - total_paid = negative (creditor)
      // Others' balance = their_share (positive = debtor)

      // Payer advanced the full amount
      balances.set(payerProfile.id, (balances.get(payerProfile.id) || 0) - totalAmount);

      // Each person owes their share
      configuredProfiles.forEach(p => {
        const share = shares.get(p.id) || 0;
        balances.set(p.id, (balances.get(p.id) || 0) + share);
      });
    };

    // Process all expenses
    couple.expenses.forEach(expense => {
      processExpense(
        expense.total_amount,
        expense.split_type,
        expense.split_value,
        expense.paid_by,
        expense.paid_by_profile_id
      );
    });

    // Process active agreements
    couple.agreements.filter(a => a.is_active).forEach(agreement => {
      processExpense(
        agreement.amount,
        agreement.split_type,
        agreement.split_value,
        agreement.paid_by,
        agreement.paid_by_profile_id
      );
    });

    // Process settlements (when someone pays back, reduce their debt)
    couple.settlements.forEach(s => {
      let payerProfile: Profile | undefined;
      let receiverProfile: Profile | undefined;

      // Find who paid the settlement
      if (s.paid_by_profile_id) {
        payerProfile = configuredProfiles.find(p => p.id === s.paid_by_profile_id);
      }
      if (!payerProfile) {
        payerProfile = configuredProfiles.find(p => p.position === s.paid_by);
      }

      // Find who received the settlement
      if (s.received_by_profile_id) {
        receiverProfile = configuredProfiles.find(p => p.id === s.received_by_profile_id);
      }

      if (payerProfile) {
        // Payer reduces their debt (or increases credit)
        balances.set(payerProfile.id, (balances.get(payerProfile.id) || 0) - s.amount);
      }
      if (receiverProfile) {
        // Receiver reduces their credit (or increases debt)
        balances.set(receiverProfile.id, (balances.get(receiverProfile.id) || 0) + s.amount);
      }
    });

    // Calculate settlements needed
    // Positive balance = debtor (owes money)
    // Negative balance = creditor (is owed money)
    const debtors: { profile: Profile; owes: number }[] = [];
    const creditors: { profile: Profile; receives: number }[] = [];

    configuredProfiles.forEach(p => {
      const bal = balances.get(p.id) || 0;
      if (bal > 0.01) {
        debtors.push({ profile: p, owes: bal });
      } else if (bal < -0.01) {
        creditors.push({ profile: p, receives: Math.abs(bal) });
      }
    });

    // Sort to optimize settlements (largest first)
    debtors.sort((a, b) => b.owes - a.owes);
    creditors.sort((a, b) => b.receives - a.receives);

    // Calculate who pays whom
    const settlementsNeeded: SettlementNeeded[] = [];

    for (const debtor of debtors) {
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
    }

    return settlementsNeeded;
  }, [couple, configuredProfiles]);

  const isBalanced = settlements.length === 0;
  const totalOwed = settlements.reduce((sum, s) => sum + s.amount, 0);

  // Waiting state - not enough people configured
  if (!hasMultiplePeople) {
    const singleConfigured = configuredProfiles[0];
    return (
      <div className="bg-card rounded-3xl p-6 shadow-glass animate-fade-in">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">{prefT('Equilíbrio total')}</h2>
        <div className="flex flex-col items-center justify-center py-4">
          {singleConfigured && (
            <Avatar
              avatarIndex={singleConfigured.avatar_index}
              size="lg"
              ringColor={singleConfigured.color}
              animateOnHover
              animation="licking"
            />
          )}
          <div className="text-center mt-3">
            <p className="text-lg font-semibold text-secondary-foreground">
              {prefT('Aguardando mais pessoas')}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {prefT('Compartilhe o link para começarem juntos')}
            </p>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">
          {prefT('Use o botão "Compartilhar" para convidar')}
        </p>
      </div>
    );
  }

  // All balanced
  if (isBalanced) {
    return (
      <div className="bg-card rounded-3xl p-6 shadow-glass animate-fade-in">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">{prefT('Equilíbrio total')}</h2>
        <div className="flex items-center justify-center gap-4 py-4">
          <div className="flex -space-x-2">
            {configuredProfiles.slice(0, 3).map((p, i) => (
              <Avatar
                key={p.id}
                avatarIndex={p.avatar_index}
                size="lg"
                ringColor={p.color}
                animateOnHover
                animation={i === 0 ? "sleeping" : "purring"}
                className={cn(i > 0 && "-ml-4")}
              />
            ))}
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-secondary-foreground">
              {prefT('Tudo equilibrado!')}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {prefT('Vocês estão em dia')}
            </p>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">
          {prefT('Continue registrando para manter o equilíbrio')}
        </p>
      </div>
    );
  }

  // Show settlements needed
  return (
    <div className="bg-card rounded-3xl p-6 shadow-glass animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-muted-foreground">{prefT('Equilíbrio total')}</h2>
        <button
          onClick={() => setValuesHidden(!valuesHidden)}
          className="p-1 rounded-full hover:bg-muted/80 transition-colors"
          aria-label={valuesHidden ? prefT('Mostrar valores') : prefT('Ocultar valores')}
        >
          {valuesHidden ? (
            <EyeOff className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Eye className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Show up to 3 settlements with compact layout */}
      <div className="space-y-3">
        {settlements.slice(0, 3).map((settlement, index) => (
          <div
            key={index}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Avatar
                avatarIndex={settlement.from.avatar_index}
                size="md"
                ringColor={settlement.from.color}
                animateOnHover
                animation="stretching"
              />
              <span className="text-sm font-medium" style={{ color: settlement.from.color }}>
                {settlement.from.name}
              </span>
            </div>

            <div className="flex items-center gap-2 px-3">
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <span className="font-bold text-lg">
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
                size="md"
                ringColor={settlement.to.color}
                animateOnHover
                animation="playing"
              />
            </div>
          </div>
        ))}
      </div>

      {settlements.length > 3 && (
        <p className="text-center text-xs text-muted-foreground mt-3">
          +{settlements.length - 3} {prefT('mais acertos pendentes')}
        </p>
      )}

      <p className="text-center text-xs text-muted-foreground mt-4">
        {prefT('Total a ajustar')}: {valuesHidden ? maskCurrencyValue(formatCurrency(totalOwed)) : formatCurrency(totalOwed)}
      </p>
    </div>
  );
}
