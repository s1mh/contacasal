import React, { useMemo, useState, useEffect } from 'react';
import { Sparkles, Brain, TrendingUp, AlertTriangle, PartyPopper, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { usePreferences } from '@/contexts/PreferencesContext';
import { AIBackgroundBlob } from './AIBackgroundBlob';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  /** Passa o total de expenses para o card invalidar cache quando mudar */
  expenseCount?: number;
}

type AIDebugInfo = {
  requestId?: string;
  finishReason?: string;
  parseFailed?: boolean;
  retryUsed?: boolean;
  partsCount?: number;
  contentPreview?: string;
  isGenericFallbackOnly?: boolean;
  path?: string;
  status?: number;
  errorBodyPreview?: string;
};

const CACHE_KEY_PREFIX = 'ai_insights_';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const LEARNING_CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes — re-check often while user is adding data

function getCachedInsights(coupleId: string, opts?: { allowStale?: boolean }) {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + coupleId);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    const maxAge = cached.learning ? LEARNING_CACHE_DURATION_MS : CACHE_DURATION_MS;
    if (Date.now() - cached.timestamp < maxAge) {
      return cached;
    }
    if (opts?.allowStale) {
      return { ...cached, stale: true };
    }
    localStorage.removeItem(CACHE_KEY_PREFIX + coupleId);
  } catch { /* ignore */ }
  return null;
}

function setCachedInsights(coupleId: string, data: { learning: boolean; insights: AIInsight[]; progress?: LearningProgress | null }) {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + coupleId, JSON.stringify({ ...data, timestamp: Date.now() }));
  } catch { /* ignore */ }
}

export function AIInsightsCard({ coupleId, expenseCount }: AIInsightsCardProps) {
  const { t } = usePreferences();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [learning, setLearning] = useState(true);
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<AIDebugInfo | null>(null);
  const [invokeError, setInvokeError] = useState<null | {
    name?: string;
    message?: string;
    status?: number;
    contextBodyPreview?: string;
  }>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [tapTimer, setTapTimer] = useState<number | null>(null);
  const [copiedAt, setCopiedAt] = useState<number | null>(null);

  const registerTap = () => {
    // “Easter egg”: 7 cliques/toques no CARD abre painel de diagnóstico.
    // Não depende de inspecionar elemento.
    if (tapTimer) window.clearTimeout(tapTimer);
    const next = tapCount + 1;
    setTapCount(next);
    const timer = window.setTimeout(() => setTapCount(0), 1200);
    setTapTimer(timer);
    if (next >= 7) {
      setTapCount(0);
      setDebugEnabled(true);
      setDebugOpen(true);
      // força uma nova tentativa com debug (sem depender do cache)
      void fetchInsights({ bypassCache: true, debug: true });
    }
  };

  const fetchInsights = async (opts?: { bypassCache?: boolean; debug?: boolean }) => {
    setLoading(true);
    setError(null);
    setDebugInfo(null);
    setInvokeError(null);

    // Check cache first
    if (!opts?.bypassCache) {
      const cached = getCachedInsights(coupleId);
      if (cached) {
        if (cached.learning) {
          setLearning(true);
          setProgress(cached.progress);
          setInsights([]);
        } else {
          setLearning(false);
          setInsights(cached.insights || []);
        }
        setLoading(false);
        return;
      }
    }

    try {
      // Evita header custom (pode causar preflight/CORS). O backend já suporta ?debug=1.
      const fnName = (opts?.debug || debugEnabled) ? 'generate-insights?debug=1' : 'generate-insights';
      const { data, error: fnError } = await supabase.functions.invoke(fnName, {
        body: { expenseCount: expenseCount ?? null },
      });

      if (fnError) {
        const stale = getCachedInsights(coupleId, { allowStale: true });
        if (stale && !stale.learning) {
          setLearning(false);
          setInsights(stale.insights || []);
          setError(null);
          return;
        }
        const status = (fnError as any)?.context?.status;
        const body = (fnError as any)?.context?.body;
        const bodyText = body ? String(body) : undefined;

        setError(t('Não foi possível gerar insights'));
        setInvokeError({
          name: (fnError as any)?.name,
          message: (fnError as any)?.message,
          status: typeof status === 'number' ? status : undefined,
          contextBodyPreview: bodyText ? bodyText.slice(0, 1200) : undefined,
        });

        // Se o body trouxer JSON com _debug, tenta extrair
        if (bodyText) {
          try {
            const parsed = JSON.parse(bodyText);
            if (parsed?._debug) setDebugInfo(parsed._debug as AIDebugInfo);
          } catch {
            // ignore
          }
        }
        return;
      }

      if (data?._debug) setDebugInfo(data._debug as AIDebugInfo);

      // Função pode retornar success=false (mas com 200), então trate como erro “rico”
      if (data && data.success === false) {
        setError(typeof data.error === 'string' ? data.error : t('Não foi possível gerar insights'));
      }

      if (data.learning) {
        setLearning(true);
        setProgress(data.progress);
        setInsights([]);
        setCachedInsights(coupleId, { learning: true, progress: data.progress, insights: [] });
      } else {
        setLearning(false);
        setInsights(data.insights || []);
        setCachedInsights(coupleId, { learning: false, insights: data.insights || [] });
      }
    } catch {
      const stale = getCachedInsights(coupleId, { allowStale: true });
      if (stale && !stale.learning) {
        setLearning(false);
        setInsights(stale.insights || []);
        setError(null);
        return;
      }
      setError(t('Erro ao conectar'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [coupleId]);

  // Quando a quantidade de gastos muda (realtime/navegação), limpa cache learning e re-busca
  const prevExpenseCount = React.useRef(expenseCount);
  useEffect(() => {
    if (expenseCount !== undefined && prevExpenseCount.current !== undefined && expenseCount !== prevExpenseCount.current) {
      // Novo gasto adicionado — invalida cache e re-busca
      try { localStorage.removeItem(CACHE_KEY_PREFIX + coupleId); } catch {}
      fetchInsights({ bypassCache: true });
    }
    prevExpenseCount.current = expenseCount;
  }, [expenseCount]);

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

  const copied = useMemo(() => {
    return copiedAt !== null && Date.now() - copiedAt < 2500;
  }, [copiedAt]);

  const diagnosticPayload = useMemo(() => {
    return {
      coupleId,
      hasInsights: insights.length > 0,
      learning,
      loading,
      error,
      debugInfo,
      invokeError,
    };
  }, [coupleId, insights.length, learning, loading, error, debugInfo, invokeError]);

  const copyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnosticPayload, null, 2));
      setCopiedAt(Date.now());
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative rounded-3xl p-4 shadow-lg overflow-hidden" onClick={registerTap}>
      <AIBackgroundBlob thinking={loading} className={error ? 'opacity-50' : undefined} />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3 select-none">
          {learning ? (
            <Brain className={cn("w-5 h-5", loading ? "text-orange-400" : "text-orange-600")} />
          ) : (
            <Sparkles className={cn("w-5 h-5", error ? "text-orange-400" : "text-orange-600")} />
          )}
          <span className={cn("font-semibold text-sm", error ? "text-orange-700" : "text-orange-900")}>
            {learning ? t('Insights') : t('Insights')}
          </span>
          {tapCount > 0 && (
            <span className="text-[10px] text-muted-foreground ml-auto">{tapCount}/7</span>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-full py-4">
            <Sparkles className="w-6 h-6 text-orange-600 mb-2" />
            <span className="text-sm font-medium text-orange-800">{t('Pensando...')}</span>
          </div>
        ) : error ? (
          <p className="text-xs text-orange-700/70 text-center py-2">{error}</p>
        ) : learning && progress ? (
          (() => {
            const daysProgress = Math.min((progress.days / progress.minDays) * 100, 100);
            const expensesProgress = Math.min((progress.expenses / progress.minExpenses) * 100, 100);
            const categoriesProgress = Math.min((progress.categories / progress.minCategories) * 100, 100);
            const overallProgress = Math.round((daysProgress + expensesProgress + categoriesProgress) / 3);

            const getIncentivePhrase = () => {
              if (overallProgress <= 25) return { emoji: '👀', text: t('Estou começando a te conhecer!') };
              if (overallProgress <= 50) return { emoji: '📝', text: t('Adicione mais alguns gastos!') };
              if (overallProgress <= 75) return { emoji: '🔥', text: t('Tá quase lá! Continue assim!') };
              return { emoji: '🎉', text: t('Falta pouquinho!') };
            };

            const incentive = getIncentivePhrase();

            return (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="h-2.5 bg-white/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-orange-700/70">
                      {progress.days}/{progress.minDays} {t('dias')} · {progress.expenses}/{progress.minExpenses} {t('gastos')} · {progress.categories}/{progress.minCategories} {t('categorias')}
                    </span>
                    <span className="text-xs font-medium text-orange-700">{overallProgress}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-white/40 backdrop-blur-sm rounded-2xl">
                  <span className="text-xl">{incentive.emoji}</span>
                  <p className="text-sm text-orange-800">{incentive.text}</p>
                </div>
              </div>
            );
          })()
        ) : insights.length === 0 ? (
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

      <Dialog open={debugOpen} onOpenChange={setDebugOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('Diagnóstico de Insights')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              {t('Clique/toque 7x no card de Insights para abrir este painel.')}
            </div>

            <div className="rounded-xl border bg-muted/40 p-3 text-xs font-mono whitespace-pre-wrap">
              {JSON.stringify(diagnosticPayload, null, 2)}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="text-xs underline"
                onClick={copyDiagnostics}
              >
                <span className="inline-flex items-center gap-1">
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? t('Copiado') : t('Copiar')}
                </span>
              </button>
              <button
                type="button"
                className="text-xs underline text-muted-foreground"
                onClick={() => setDebugOpen(false)}
              >
                {t('Fechar')}
              </button>
              <button
                type="button"
                className="text-xs underline"
                onClick={() => {
                  try { localStorage.removeItem(CACHE_KEY_PREFIX + coupleId); } catch {}
                  fetchInsights({ bypassCache: true, debug: debugEnabled });
                }}
              >
                {t('Limpar cache e tentar novamente')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
