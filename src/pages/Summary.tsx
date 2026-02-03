import { useOutletContext, useParams } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { BalanceCard } from '@/components/BalanceCard';
import { ExpenseCard } from '@/components/ExpenseCard';
import { Avatar } from '@/components/Avatar';
import { AnimatedPage, AnimatedItem } from '@/components/AnimatedPage';
import { Couple, useCoupleContext } from '@/contexts/CoupleContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { AIInsightsCard } from '@/components/AIInsightsCard';
import { isConfiguredProfile } from '@/lib/utils';
import { usePreferences } from '@/contexts/PreferencesContext';

export default function Summary() {
  const { t } = useI18n();
  const { couple } = useOutletContext<{ couple: Couple }>();
  const { calculateBalance } = useCoupleContext();
  const { shareCode } = useParams();
  const { toast } = useToast();
  const { t } = usePreferences();
  const balance = calculateBalance();

  const recentExpenses = couple.expenses.slice(0, 5);

  const configuredProfiles = couple.profiles.filter(isConfiguredProfile);

  const handleShare = async () => {
    const url = window.location.origin + `/c/${shareCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('Conta de Casal'),
          text: t('Entre no nosso espaço compartilhado!'),
          url,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({
        title: t('Link copiado!'),
        description: t('Compartilhe com seu parceiro(a).'),
      });
    }
  };

  return (
    <AnimatedPage className="p-4 safe-top">
      {/* Header */}
      <AnimatedItem delay={0}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {configuredProfiles.map(profile => (
              <Avatar 
                key={profile.id} 
                avatarIndex={profile.avatar_index} 
                size="md" 
                ringColor={profile.color} 
              />
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="rounded-full gap-2"
          >
            <Share2 className="w-4 h-4" />
            {t('Compartilhar')}
          </Button>
        </div>
      </AnimatedItem>

      {/* Balance Card */}
      <AnimatedItem delay={100}>
        <BalanceCard profiles={couple.profiles} balance={balance} />
      </AnimatedItem>

      {/* AI Insights */}
      <AnimatedItem delay={150}>
        <div className="mt-4">
          <AIInsightsCard coupleId={couple.id} />
        </div>
      </AnimatedItem>

      {/* Recent Expenses */}
      <div className="mt-6">
        <AnimatedItem delay={200}>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            {t('Últimos gastos')}
          </h2>
        </AnimatedItem>
        
        {recentExpenses.length === 0 ? (
          <AnimatedItem delay={250}>
            <div className="bg-card rounded-2xl p-6 text-center shadow-glass">
              <p className="text-muted-foreground">
                {t('Nenhum gasto ainda')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('Toque no + para adicionar')}
              </p>
            </div>
          </AnimatedItem>
        ) : (
          <div className="space-y-3">
            {recentExpenses.map((expense, index) => (
              <AnimatedItem key={expense.id} delay={250 + index * 50}>
                <ExpenseCard
                  expense={expense}
                  profiles={couple.profiles}
                  tags={couple.tags}
                />
              </AnimatedItem>
            ))}
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}
