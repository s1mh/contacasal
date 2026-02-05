import { useState, useEffect } from 'react';
import { Sparkles, Brain, TrendingUp, AlertTriangle, PartyPopper, RefreshCw } from 'lucide-react';
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
    
    return (
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl p-4 shadow-glass">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">{t('Aprendendo...')}</span>
        </div>
        
        <p className="text-xs text-muted-foreground mb-3">
          {t('Preciso de mais dados para gerar insights personalizados')}
        </p>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t('Dias com gastos')}</span>
            <span className="font-medium">{progress.days}/{progress.minDays}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${daysProgress}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-xs mt-2">
            <span className="text-muted-foreground">{t('Gastos registrados')}</span>
            <span className="font-medium">{progress.expenses}/{progress.minExpenses}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${expensesProgress}%` }}
            />
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
