import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import catAvatar1 from '@/assets/cat-avatar-1.png';
import catAvatar2 from '@/assets/cat-avatar-2.png';

export default function Index() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [existingCode, setExistingCode] = useState('');

  const handleCreateSpace = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('couples')
        .insert({})
        .select('share_code')
        .single();

      if (error) throw error;

      navigate(`/c/${data.share_code}`);
    } catch (err: any) {
      console.error('Error creating space:', err);
      toast({
        title: 'Erro ao criar espaço',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSpace = () => {
    if (existingCode.trim()) {
      navigate(`/c/${existingCode.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <img src={catAvatar1} alt="" className="w-16 h-16 rounded-full shadow-glass" />
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary fill-primary" />
            </div>
            <img src={catAvatar2} alt="" className="w-16 h-16 rounded-full shadow-glass" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Conta de Casal
          </h1>
          <p className="text-muted-foreground">
            Dividam gastos com carinho e clareza
          </p>
        </div>

        {/* Create New Space */}
        <div className="bg-card rounded-3xl p-6 shadow-glass mb-4">
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
        <div className="bg-card rounded-3xl p-6 shadow-glass">
          <h2 className="font-semibold text-foreground mb-3">Já tem um código?</h2>
          <div className="flex gap-2">
            <Input
              value={existingCode}
              onChange={(e) => setExistingCode(e.target.value)}
              placeholder="Cole o código aqui"
              className="flex-1 rounded-xl h-12 bg-muted border-0"
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
