import { useState, useEffect } from 'react';
import { Sparkles, Brain, TrendingUp, AlertTriangle, PartyPopper, RefreshCw, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { usePreferences } from '@/contexts/PreferencesContext';

interface AIInsight {
  type: 'tip' | 'alert' | 'celebration';
  message: string;
  priority: number;
}

interface LearningProgress {
  days: number;
  expenses: number;
  categories: number;
  minDays: number;
  minExpenses: number;
  minCategories: number;
}

interface AIInsightsCardProps {
  coupleId: string;
}

export function AIInsightsCard({ coupleId }: AIInsightsCardProps) {
  const { t } = usePreferences();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [learning, setLearning] = useState(true);
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-insights');
      
      if (fnError) {
        console.error('Error fetching insights:', fnError);
        setError(t('Não foi possível gerar insights'));
        return;
      }

      if (data.learning) {
        setLearning(true);
        setProgress(data.progress);
        setInsights([]);
      } else {
        setLearning(false);
        setInsights(data.insights || []);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(t('Erro ao conectar'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [coupleId]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'celebration':
        return <PartyPopper className="w-4 h-4" />;
      case 'alert':
        return <AlertTriangle className="w-4 h-4" />;
      case 'tip':
      default:
        return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getInsightStyle = (type: string) => {
    switch (type) {
      case 'celebration':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'alert':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'tip':
      default:
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl p-4 shadow-glass">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          <span className="font-semibold text-sm">{t('Insights')}</span>
        </div>
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="w-5 h-5 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-muted/50 to-muted rounded-3xl p-4 shadow-glass">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-muted-foreground" />
          <span className="font-semibold text-sm text-muted-foreground">{t('Insights')}</span>
        </div>
        <p className="text-xs text-muted-foreground text-center py-2">{error}</p>
      </div>
    );
  }

  if (learning && progress) {
    const daysProgress = Math.min((progress.days / progress.minDays) * 100, 100);
    const expensesProgress = Math.min((progress.expenses / progress.minExpenses) * 100, 100);
    const overallProgress = Math.round((daysProgress + expensesProgress) / 2);
    
    // Frases de incentivo baseadas no percentual
    const getIncentivePhrase = () => {
      if (overallProgress <= 25) return { emoji: '👀', text: t('Estou começando a te conhecer!') };
      if (overallProgress <= 50) return { emoji: '📝', text: t('Adicione mais alguns gastos!') };
      if (overallProgress <= 75) return { emoji: '🔥', text: t('Tá quase lá! Continue assim!') };
      return { emoji: '🎉', text: t('Falta pouquinho!') };
    };
    
    const incentive = getIncentivePhrase();
    
    return (
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl p-4 shadow-glass">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">{t('Ainda estou aprendendo...')}</span>
        </div>
        
        <div className="space-y-3">
          {/* Barra de progresso única */}
          <div className="space-y-1.5">
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <div className="flex justify-end">
              <span className="text-xs font-medium text-muted-foreground">{overallProgress}%</span>
            </div>
          </div>
          
          {/* Frase de incentivo */}
          <div className="flex items-center gap-2 p-3 bg-background/50 rounded-2xl">
            <span className="text-xl">{incentive.emoji}</span>
            <p className="text-sm text-muted-foreground">{incentive.text}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl p-4 shadow-glass">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">{t('Insights')}</span>
        </div>
        <button 
          onClick={fetchInsights}
          className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
          disabled={loading}
        >
          <RefreshCw className={cn("w-4 h-4 text-primary", loading && "animate-spin")} />
        </button>
      </div>

      {insights.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          {t('Nenhum insight disponível no momento')}
        </p>
      ) : (
        <div className="space-y-2">
          {insights
            .sort((a, b) => b.priority - a.priority)
            .slice(0, 3)
            .map((insight, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-start gap-2 p-2.5 rounded-xl border text-xs',
                  getInsightStyle(insight.type)
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getInsightIcon(insight.type)}
                </div>
                <p className="leading-relaxed">{insight.message}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
