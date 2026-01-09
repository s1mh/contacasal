import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';
import { CAT_AVATARS } from '@/lib/constants';
import { devLog } from '@/lib/validation';

interface LastSpace {
  shareCode: string;
  position: number;
  name: string;
  avatarIndex: number;
}

export default function Index() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loading: authLoading, validateShareCode, clearValidation } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [existingCode, setExistingCode] = useState('');
  const [lastSpace, setLastSpace] = useState<LastSpace | null>(null);

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

  const handleCreateSpace = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('couples')
        .insert({})
        .select('share_code')
        .single();

      if (error) throw error;

      // Validate the new share code to set it in JWT
      const result = await validateShareCode(data.share_code);
      if (!result.success) {
        devLog('Failed to validate new share code:', result.error);
      }

      navigate(`/c/${data.share_code}`);
    } catch (err: unknown) {
      devLog('Error creating space:', err);
      toast({
        title: 'Erro ao criar espaço',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSpace = async () => {
    if (existingCode.trim()) {
      // Clear any existing validation before joining a new space
      await clearValidation();
      navigate(`/c/${existingCode.trim()}`);
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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <img src={CAT_AVATARS[0]} alt="" className="w-16 h-16 rounded-full shadow-lg" />
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary fill-primary" />
            </div>
            <img src={CAT_AVATARS[1]} alt="" className="w-16 h-16 rounded-full shadow-lg" />
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
            className="w-full mb-4 p-4 bg-card rounded-3xl border-2 border-primary/30 hover:border-primary shadow-lg transition-all flex items-center justify-between group animate-fade-in"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-primary">
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
        <div className="bg-card rounded-3xl p-6 shadow-lg border border-border/50 mb-4">
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
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12"
          >
            {loading ? 'Criando...' : 'Criar espaço do casal'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Join Existing Space */}
        <div className="bg-card rounded-3xl p-6 shadow-lg border border-border/50">
          <h2 className="font-semibold text-foreground mb-3">Já tem um código?</h2>
          <div className="flex gap-2">
            <Input
              value={existingCode}
              onChange={(e) => setExistingCode(e.target.value)}
              placeholder="Cole o código aqui"
              className="flex-1 rounded-xl h-12 bg-muted border-0"
              onKeyDown={(e) => e.key === 'Enter' && handleJoinSpace()}
            />
            <Button
              onClick={handleJoinSpace}
              disabled={!existingCode.trim()}
              variant="outline"
              className="rounded-xl h-12 px-4"
            >
              Entrar
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Feito com 💕 para casais
        </p>
      </div>
    </div>
  );
}
