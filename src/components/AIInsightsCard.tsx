import { useState, useEffect } from 'react';
import { Sparkles, Brain, TrendingUp, AlertTriangle, PartyPopper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { usePreferences } from '@/contexts/PreferencesContext';
import { AIBackgroundBlob } from './AIBackgroundBlob';

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

  if (loading) {
    return (
      <div className="relative rounded-3xl p-4 shadow-lg overflow-hidden min-h-[120px]">
        <AIBackgroundBlob thinking />
        <div className="relative z-10 flex flex-col items-center justify-center h-full py-4">
          <Sparkles className="w-6 h-6 text-orange-600 mb-2" />
          <span className="text-sm font-medium text-orange-800">{t('Pensando...')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative rounded-3xl p-4 shadow-lg overflow-hidden">
        <AIBackgroundBlob className="opacity-50" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-orange-400" />
            <span className="font-semibold text-sm text-orange-700">{t('Insights')}</span>
          </div>
          <p className="text-xs text-orange-700/70 text-center py-2">{error}</p>
        </div>
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
      <div className="relative rounded-3xl p-4 shadow-lg overflow-hidden">
        <AIBackgroundBlob />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-orange-600" />
            <span className="font-semibold text-sm text-orange-900">{t('Ainda estou aprendendo...')}</span>
          </div>

          <div className="space-y-3">
            {/* Barra de progresso única */}
            <div className="space-y-1.5">
              <div className="h-2.5 bg-white/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <div className="flex justify-end">
                <span className="text-xs font-medium text-orange-700">{overallProgress}%</span>
              </div>
            </div>

            {/* Frase de incentivo */}
            <div className="flex items-center gap-2 p-3 bg-white/40 backdrop-blur-sm rounded-2xl">
              <span className="text-xl">{incentive.emoji}</span>
              <p className="text-sm text-orange-800">{incentive.text}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-3xl p-4 shadow-lg overflow-hidden">
      <AIBackgroundBlob />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-orange-600" />
          <span className="font-semibold text-sm text-orange-900">{t('Insights')}</span>
        </div>

        {insights.length === 0 ? (
          <p className="text-xs text-orange-700/70 text-center py-2">
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
                    'flex items-start gap-2 p-2.5 rounded-xl border text-xs backdrop-blur-sm',
                    insight.type === 'celebration' && 'bg-green-500/20 text-green-800 border-green-500/30',
                    insight.type === 'alert' && 'bg-amber-500/20 text-amber-800 border-amber-500/30',
                    insight.type === 'tip' && 'bg-white/40 text-orange-800 border-orange-300/30'
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
    </div>
  );
}
