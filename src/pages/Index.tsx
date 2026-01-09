import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowRight, Sparkles, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';
import { CAT_AVATARS } from '@/lib/constants';
import { devLog } from '@/lib/validation';
import { cn } from '@/lib/utils';

interface LastSpace {
  shareCode: string;
  position: number;
  name: string;
  avatarIndex: number;
}

export default function Index() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loading: authLoading, clearValidation } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [existingCode, setExistingCode] = useState('');
  const [lastSpace, setLastSpace] = useState<LastSpace | null>(null);
  const [catsAnimating, setCatsAnimating] = useState(false);

  // Check for saved space on mount
  useEffect(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('couple_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.position && data.name) {
            setLastSpace({
              shareCode: key.replace('couple_', ''),
              position: data.position,
              name: data.name,
              avatarIndex: data.avatarIndex || 1,
            });
            break;
          }
        } catch (e) {
          // Ignore invalid data
        }
      }
    }
  }, []);

  // Animate cats on mount
  useEffect(() => {
    setCatsAnimating(true);
    const timer = setTimeout(() => setCatsAnimating(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleCreateSpace = async () => {
    setLoading(true);
    setCatsAnimating(true);
    
    try {
      devLog('Creating new couple space...');
      
      const { data, error } = await supabase.functions.invoke('create-couple', {
        body: {},
      });

      if (error) {
        devLog('Error creating couple (function):', error.message);
        throw new Error(error.message || 'Erro ao criar espaço');
      }

      if (!data?.success || !data?.share_code) {
        devLog('Invalid response from create-couple:', data);
        throw new Error(data?.error || 'Falha ao criar espaço');
      }

      devLog('Couple created successfully:', data.share_code);

      // Refresh the session to pick up the new couple_id claim
      await supabase.auth.refreshSession();

      toast({
        title: 'Espaço criado! 🎉',
        description: 'Compartilhe o código com seu amor.',
      });

      navigate(`/c/${data.share_code}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Tente novamente.';
      devLog('Error creating space:', err);
      toast({
        title: 'Erro ao criar espaço',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setCatsAnimating(false);
    }
  };

  const handleJoinSpace = async () => {
    const code = existingCode.trim().toLowerCase();
    if (code) {
      setLoading(true);
      try {
        // Clear any existing validation before joining a new space
        await clearValidation();
        navigate(`/c/${code}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleContinue = async () => {
    if (lastSpace) {
      navigate(`/c/${lastSpace.shareCode}`);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="flex gap-2">
            <img 
              src={CAT_AVATARS[0]} 
              alt="" 
              className="w-12 h-12 rounded-full shadow-lg animate-bounce-gentle" 
              style={{ animationDelay: '0ms' }}
            />
            <img 
              src={CAT_AVATARS[1]} 
              alt="" 
              className="w-12 h-12 rounded-full shadow-lg animate-bounce-gentle" 
              style={{ animationDelay: '200ms' }}
            />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Preparando o amor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo / Header */}
        <div className="text-center mb-8 animate-fade-slide-up">
          <div className="flex justify-center items-center gap-3 mb-4">
            <img 
              src={CAT_AVATARS[0]} 
              alt="" 
              className={cn(
                "w-16 h-16 rounded-full shadow-lg transition-all duration-500",
                catsAnimating && "animate-jump"
              )} 
            />
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Heart className={cn(
                "w-5 h-5 text-primary fill-primary transition-transform",
                catsAnimating && "animate-pulse"
              )} />
            </div>
            <img 
              src={CAT_AVATARS[1]} 
              alt="" 
              className={cn(
                "w-16 h-16 rounded-full shadow-lg transition-all duration-500",
                catsAnimating && "animate-jump"
              )}
              style={{ animationDelay: '100ms' }}
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Conta de Casal
          </h1>
          <p className="text-muted-foreground">
            Dividam gastos com carinho e clareza
          </p>
        </div>

        {/* Continue as saved user */}
        {lastSpace && (
          <button
            onClick={handleContinue}
            className="w-full mb-4 p-4 bg-card rounded-3xl border-2 border-primary/30 hover:border-primary shadow-lg transition-all duration-300 flex items-center justify-between group animate-fade-slide-up hover:scale-[1.02]"
            style={{ animationDelay: '100ms' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-primary animate-bounce-gentle">
                <img 
                  src={CAT_AVATARS[(lastSpace.avatarIndex || 1) - 1]} 
                  alt={lastSpace.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Continuar como</p>
                <p className="font-semibold">{lastSpace.name}</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
          </button>
        )}

        {/* Create New Space */}
        <div 
          className="bg-card rounded-3xl p-6 shadow-lg border border-border/50 mb-4 animate-fade-slide-up hover:shadow-xl transition-all duration-300"
          style={{ animationDelay: '200ms' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Novo espaço</h2>
              <p className="text-xs text-muted-foreground">Crie um espaço compartilhado</p>
            </div>
          </div>
          <Button
            onClick={handleCreateSpace}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12 transition-all duration-300 hover:scale-[1.02]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                Criar espaço do casal
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        {/* Join Existing Space */}
        <div 
          className="bg-card rounded-3xl p-6 shadow-lg border border-border/50 animate-fade-slide-up hover:shadow-xl transition-all duration-300"
          style={{ animationDelay: '300ms' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-secondary/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Entrar em espaço</h2>
              <p className="text-xs text-muted-foreground">Recebeu um código? Cole aqui</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              value={existingCode}
              onChange={(e) => setExistingCode(e.target.value.toLowerCase())}
              placeholder="Cole o código aqui"
              className="flex-1 rounded-xl h-12 bg-muted border-0 transition-all duration-300 focus:ring-2 focus:ring-primary/50"
              onKeyDown={(e) => e.key === 'Enter' && handleJoinSpace()}
            />
            <Button
              onClick={handleJoinSpace}
              disabled={!existingCode.trim() || loading}
              variant="outline"
              className="rounded-xl h-12 px-4 transition-all duration-300 hover:scale-105"
            >
              Entrar
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 animate-fade-in" style={{ animationDelay: '500ms' }}>
          <p className="text-xs text-muted-foreground">
            Feito com 💕 para casais
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Feito por Samuel para o Juan
          </p>
        </div>
      </div>
    </div>
  );
}
