import { useOutletContext, useParams } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { BalanceCard } from '@/components/BalanceCard';
import { ExpenseCard } from '@/components/ExpenseCard';
import { Avatar } from '@/components/Avatar';
import { AnimatedPage, AnimatedItem } from '@/components/AnimatedPage';
import { Couple, useCouple } from '@/hooks/useCouple';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function Summary() {
  const { couple } = useOutletContext<{ couple: Couple }>();
  const { calculateBalance, deleteExpense } = useCouple();
  const { shareCode } = useParams();
  const { toast } = useToast();
  const balance = calculateBalance();

  const recentExpenses = couple.expenses.slice(0, 5);
  
  // Only show profiles that have been configured (name !== "Pessoa 1" and "Pessoa 2")
  const configuredProfiles = couple.profiles.filter(p => 
    p.name !== 'Pessoa 1' && p.name !== 'Pessoa 2' && p.name !== 'Pessoa'
  );

  const handleShare = async () => {
    const url = window.location.origin + `/c/${shareCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Conta de Casal',
          text: 'Entre no nosso espaço compartilhado!',
          url,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Link copiado!',
        description: 'Compartilhe com seu parceiro(a).',
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
            Compartilhar
          </Button>
        </div>
      </AnimatedItem>

      {/* Balance Card */}
      <AnimatedItem delay={100}>
        <BalanceCard profiles={couple.profiles} balance={balance} />
      </AnimatedItem>

      {/* Recent Expenses */}
      <div className="mt-6">
        <AnimatedItem delay={200}>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Últimos gastos
          </h2>
        </AnimatedItem>
        
        {recentExpenses.length === 0 ? (
          <AnimatedItem delay={250}>
            <div className="bg-card rounded-2xl p-6 text-center shadow-glass">
              <p className="text-muted-foreground">
                Nenhum gasto ainda
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Toque no + para adicionar
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
                  onDelete={() => deleteExpense(expense.id)}
                />
              </AnimatedItem>
            ))}
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}
