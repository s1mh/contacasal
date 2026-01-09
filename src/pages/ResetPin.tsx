import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InputOTP, InputOTPGroup, InputOTPSlotMasked } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { Loader2, Lock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CAT_AVATARS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface ProfileData {
  name: string;
  avatar_index: number;
  color: string;
}

export default function ResetPin() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [success, setSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token || token.length !== 64) {
        setError('Link inválido');
        setLoading(false);
        return;
      }

      try {
        const { data, error: funcError } = await supabase.functions.invoke('reset-pin', {
          body: { token, validate_only: true },
        });

        if (funcError) {
          throw new Error(funcError.message);
        }

        if (!data.success) {
          setError(data.error || 'Token inválido');
          return;
        }

        setProfile(data.profile);
        setShareCode(data.share_code);
      } catch (err) {
        console.error('Token validation error:', err);
        setError('Link expirado ou inválido');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handlePinChange = (value: string) => {
    if (step === 'create') {
      setNewPin(value);
      if (value.length === 4) {
        setTimeout(() => setStep('confirm'), 300);
      }
    } else {
      setConfirmPin(value);
      if (value.length === 4) {
        setTimeout(() => handleSubmit(value), 300);
      }
    }
  };

  const handleSubmit = async (confirmedPin: string) => {
    if (newPin !== confirmedPin) {
      toast({
        title: 'Códigos não conferem',
        description: 'Digite o mesmo código nas duas etapas',
        variant: 'destructive',
      });
      setConfirmPin('');
      setNewPin('');
      setStep('create');
      return;
    }

    setValidating(true);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('reset-pin', {
        body: { token, new_pin: newPin },
      });

      if (funcError) {
        throw new Error(funcError.message);
      }

      if (!data.success) {
        toast({
          title: 'Erro',
          description: data.error || 'Não foi possível redefinir o código',
          variant: 'destructive',
        });
        return;
      }

      setSuccess(true);

      // Save to localStorage for auto-login
      if (shareCode && data.profile) {
        localStorage.setItem(`couple_${shareCode}`, JSON.stringify({
          position: data.profile.position,
          name: data.profile.name,
          avatarIndex: data.profile.avatar_index,
          color: data.profile.color,
          timestamp: Date.now(),
        }));
      }

      toast({
        title: 'Código redefinido! 🎉',
        description: 'Você já pode usar seu novo código',
      });

      // Redirect after a short delay
      setTimeout(() => {
        if (shareCode) {
          navigate(`/c/${shareCode}`);
        } else {
          navigate('/');
        }
      }, 2000);
    } catch (err) {
      console.error('Reset PIN error:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível redefinir o código. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setValidating(false);
    }
  };

  const handleBack = () => {
    setConfirmPin('');
    setStep('create');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Validando link...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Link inválido
          </h1>
          <p className="text-muted-foreground mb-6">
            {error}
          </p>
          <Button onClick={() => navigate('/')} className="w-full">
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Código redefinido!
          </h1>
          <p className="text-muted-foreground mb-4">
            Redirecionando para seu espaço...
          </p>
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-card rounded-3xl p-8 shadow-lg border border-border/50 animate-fade-in">
          {/* Profile Header */}
          {profile && (
            <div className="flex flex-col items-center gap-4 mb-8">
              <div 
                className="w-20 h-20 rounded-full overflow-hidden ring-4 animate-cat-idle"
                style={{ boxShadow: `0 0 0 4px ${profile.color}` }}
              >
                <img 
                  src={CAT_AVATARS[profile.avatar_index - 1]} 
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-center">
                <h1 className="text-xl font-semibold">{profile.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {step === 'create' ? 'Crie um novo código' : 'Confirme seu código'}
                </p>
              </div>
            </div>
          )}

          {/* PIN Input */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span>
                {step === 'create' ? 'Novo código (4 dígitos)' : 'Digite novamente'}
              </span>
            </div>

            <InputOTP 
              maxLength={4} 
              value={step === 'create' ? newPin : confirmPin} 
              onChange={handlePinChange}
              disabled={validating}
            >
              <InputOTPGroup>
                <InputOTPSlotMasked index={0} className="w-14 h-14 text-xl" />
                <InputOTPSlotMasked index={1} className="w-14 h-14 text-xl" />
                <InputOTPSlotMasked index={2} className="w-14 h-14 text-xl" />
                <InputOTPSlotMasked index={3} className="w-14 h-14 text-xl" />
              </InputOTPGroup>
            </InputOTP>

            {validating && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </div>
            )}

            {/* Step indicator */}
            <div className="flex gap-2 mt-2">
              <div className={cn(
                "w-2 h-2 rounded-full transition-colors",
                step === 'create' ? "bg-primary" : "bg-muted"
              )} />
              <div className={cn(
                "w-2 h-2 rounded-full transition-colors",
                step === 'confirm' ? "bg-primary" : "bg-muted"
              )} />
            </div>

            {step === 'confirm' && (
              <Button 
                variant="ghost" 
                onClick={handleBack}
                disabled={validating}
                className="text-muted-foreground"
              >
                Voltar
              </Button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-muted-foreground">
            Conta de Casal
          </p>
        </div>
      </div>
    </div>
  );
}
