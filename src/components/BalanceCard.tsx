import { cn, isConfiguredProfile } from '@/lib/utils';
import { Avatar } from './Avatar';
import { Profile } from '@/hooks/useCouple';
import { ArrowRight } from 'lucide-react';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useI18n } from '@/contexts/I18nContext';

interface BalanceCardProps {
  profiles: Profile[];
  balance: {
    person1Owes: number;
    person2Owes: number;
    balance: number;
  };
}

export function BalanceCard({ profiles, balance }: BalanceCardProps) {
  const { t: prefT } = usePreferences();
  const { formatCurrency } = useI18n();
  const person1 = profiles.find(p => p.position === 1);
  const person2 = profiles.find(p => p.position === 2);

  if (!person1 || !person2) return null;

  const person1Configured = isConfiguredProfile(person1);
  const person2Configured = isConfiguredProfile(person2);
  const bothConfigured = person1Configured && person2Configured;

  const isBalanced = Math.abs(balance.balance) < 0.01;
  const person1Owes = balance.balance < 0;
  const owingPerson = person1Owes ? person1 : person2;
  const receivingPerson = person1Owes ? person2 : person1;
  const amount = Math.abs(balance.balance);

  return (
    <div className="bg-card rounded-3xl p-6 shadow-glass animate-fade-in">
      <h2 className="text-sm font-medium text-muted-foreground mb-4">{prefT('Equilíbrio atual')}</h2>

      {/* Show waiting message when only one person is configured */}
      {!bothConfigured ? (
        <div className="flex flex-col items-center justify-center py-4">
          {person1Configured && (
            <Avatar avatarIndex={person1.avatar_index} size="lg" ringColor={person1.color} />
          )}
          {person2Configured && (
            <Avatar avatarIndex={person2.avatar_index} size="lg" ringColor={person2.color} />
          )}
          <div className="text-center mt-3">
            <p className="text-lg font-semibold text-secondary-foreground">
              {prefT('Aguardando parceiro(a) 💕')}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {prefT('Compartilhe o link para começarem juntos')}
            </p>
          </div>
        </div>
      ) : isBalanced ? (
        <div className="flex items-center justify-center gap-4 py-4">
          <Avatar avatarIndex={person1.avatar_index} size="lg" ringColor={person1.color} />
          <div className="text-center">
            <p className="text-lg font-semibold text-secondary-foreground">
              {prefT('Tudo equilibrado! 🎉')}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {prefT('Vocês estão em dia')}
            </p>
          </div>
          <Avatar avatarIndex={person2.avatar_index} size="lg" ringColor={person2.color} />
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3">
          <div className="flex flex-col items-center">
            <Avatar avatarIndex={owingPerson.avatar_index} size="lg" ringColor={owingPerson.color} />
            <p className="text-sm font-medium mt-2" style={{ color: owingPerson.color }}>
              {owingPerson.name}
            </p>
          </div>

          <div className="flex flex-col items-center px-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ArrowRight className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {formatCurrency(amount)}
            </p>
          </div>

          <div className="flex flex-col items-center">
            <Avatar avatarIndex={receivingPerson.avatar_index} size="lg" ringColor={receivingPerson.color} />
            <p className="text-sm font-medium mt-2" style={{ color: receivingPerson.color }}>
              {receivingPerson.name}
            </p>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground mt-4">
        {!bothConfigured 
          ? prefT('Use o botão "Compartilhar" para convidar')
          : isBalanced 
            ? prefT('Continue registrando para manter o equilíbrio 💕')
            : prefT('O equilíbrio está em {amount} com {name}', {
              amount: formatCurrency(amount),
              name: receivingPerson.name,
            })
        }
      </p>
    </div>
  );
}
