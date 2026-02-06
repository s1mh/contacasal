import { useOutletContext, useParams } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { ExpenseCard } from '@/components/ExpenseCard';
import { Avatar } from '@/components/Avatar';
import { AnimatedPage, AnimatedItem } from '@/components/AnimatedPage';
import { Couple } from '@/contexts/CoupleContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { AIInsightsCard } from '@/components/AIInsightsCard';
import { MonthComparisonCard } from '@/components/MonthComparisonCard';
import { TopCategoriesCard } from '@/components/TopCategoriesCard';
import { isConfiguredProfile } from '@/lib/utils';
import { usePreferences } from '@/contexts/PreferencesContext';
import { MonthlyBalanceCard } from '@/components/MonthlyBalanceCard';

export default function Summary() {
  const { couple, myPosition } = useOutletContext<{ couple: Couple; myPosition: number | null }>();
  const { shareCode } = useParams();
  const { toast } = useToast();
  const { t: prefT } = usePreferences();

  // Get current user's profile
  const currentUserProfile = myPosition
    ? couple.profiles.find(p => p.position === myPosition && isConfiguredProfile(p))
    : null;

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return prefT('Bom dia');
    if (hour >= 12 && hour < 18) return prefT('Boa tarde');
    return prefT('Boa noite');
  };

  const recentExpenses = couple.expenses.slice(0, 5);

  const configuredProfiles = couple.profiles.filter(isConfiguredProfile);

  const handleShare = async () => {
    const baseUrl = window.location.origin + `/c/${shareCode}`;
    const inviterName = currentUserProfile?.name;
    const url = inviterName ? `${baseUrl}?from=${encodeURIComponent(inviterName)}` : baseUrl;

    if (navigator.share) {
      try {
        await navigator.share({
          title: prefT('Conta de Casal'),
          text: prefT('Entre no nosso espaço compartilhado!'),
          url,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({
        title: prefT('Link copiado!'),
        description: prefT('Compartilhe com seu parceiro(a).'),
      });
    }
  };

  return (
    <AnimatedPage className="p-4 safe-top">
      {/* Header with greeting */}
      <AnimatedItem delay={0}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {currentUserProfile ? (
              <>
                <Avatar
                  avatarIndex={currentUserProfile.avatar_index}
                  size="md"
                  ringColor={currentUserProfile.color}
                  animateOnHover
                  animation="playing"
                />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">{getGreeting()},</span>
                  <span className="font-semibold text-foreground" style={{ color: currentUserProfile.color }}>
                    {currentUserProfile.name}
                  </span>
                </div>
              </>
            ) : (
              configuredProfiles.map(profile => (
                <Avatar
                  key={profile.id}
                  avatarIndex={profile.avatar_index}
                  size="md"
                  ringColor={profile.color}
                  animateOnHover
                  animation="playing"
                />
              ))
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="rounded-full gap-2"
          >
            <Share2 className="w-4 h-4" />
            {prefT('Compartilhar')}
          </Button>
        </div>
      </AnimatedItem>

      {/* Monthly Balance Card */}
      <AnimatedItem delay={100}>
        <MonthlyBalanceCard
          profiles={couple.profiles}
          expenses={couple.expenses}
          agreements={couple.agreements}
          settlements={couple.settlements}
        />
      </AnimatedItem>

      {/* AI Insights */}
      <AnimatedItem delay={125}>
        <div className="mt-4">
          <AIInsightsCard coupleId={couple.id} />
        </div>
      </AnimatedItem>

      {/* Month Comparison */}
      <AnimatedItem delay={150}>
        <div className="mt-4">
          <MonthComparisonCard
            expenses={couple.expenses}
            agreements={couple.agreements}
          />
        </div>
      </AnimatedItem>

      {/* Top Categories */}
      <AnimatedItem delay={175}>
        <div className="mt-4">
          <TopCategoriesCard
            expenses={couple.expenses}
            tags={couple.tags}
          />
        </div>
      </AnimatedItem>

      {/* Recent Expenses */}
      <div className="mt-6">
        <AnimatedItem delay={200}>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            {prefT('Últimos gastos')}
          </h2>
        </AnimatedItem>
        
        {recentExpenses.length === 0 ? (
          <AnimatedItem delay={225}>
            <div className="bg-card rounded-2xl p-6 text-center shadow-glass">
              <p className="text-muted-foreground">
                {prefT('Nenhum gasto ainda')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {prefT('Toque no + para adicionar')}
              </p>
            </div>
          </AnimatedItem>
        ) : (
          <div className="space-y-3">
            {recentExpenses.map((expense, index) => (
              <AnimatedItem key={expense.id} delay={225 + index * 50}>
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
