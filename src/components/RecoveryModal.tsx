import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RecoveryModalProps {
  open: boolean;
  onClose: () => void;
  shareCode: string;
}

export function RecoveryModal({ open, onClose, shareCode }: RecoveryModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Digite seu e-mail');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('E-mail inválido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: funcError } = await supabase.functions.invoke('request-pin-recovery', {
        body: { 
          share_code: shareCode, 
          email: email.trim().toLowerCase() 
        },
      });

      if (funcError) {
        throw new Error(funcError.message);
      }

      if (!data.success && data.error) {
        setError(data.error);
        return;
      }

      setSent(true);
    } catch (err) {
      console.error('Recovery request error:', err);
      setError('Erro ao enviar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    setSent(false);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent 
        className="sm:max-w-md overflow-hidden" 
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2 animate-fade-in">
            <Mail className="w-5 h-5 text-primary" />
            Recuperar código
          </DialogTitle>
          <DialogDescription className="text-center animate-fade-in">
            {sent 
              ? 'Verifique seu e-mail' 
              : 'Digite o e-mail cadastrado no seu perfil'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {sent ? (
            <div className="flex flex-col items-center gap-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Se este e-mail estiver cadastrado, você receberá um link para redefinir seu código.
                </p>
                <p className="text-xs text-muted-foreground">
                  O link expira em 15 minutos.
                </p>
              </div>
              <Button onClick={handleClose} className="w-full">
                Voltar
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="seu@email.com"
                  className="text-center"
                  disabled={loading}
                  autoFocus
                />
                {error && (
                  <p className="text-sm text-destructive text-center animate-fade-in">
                    {error}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant="ghost" 
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button 
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Enviar link
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Um link de recuperação será enviado para seu e-mail.
              </p>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
