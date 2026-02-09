import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlotMasked } from '@/components/ui/input-otp';
import { cn, isConfiguredProfile } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import { Profile } from '@/contexts/CoupleContext';
import { Heart, ArrowLeft, UserPlus, Lock, HelpCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { RecoveryModal } from './RecoveryModal';

interface ReconnectModalProps {
  open: boolean;
  profiles: Profile[];
  onReconnect: (profile: Profile, pin: string) => Promise<boolean>;
  onCreateNew: () => void;
  shareCode: string;
  hasVacancy?: boolean;
}

export function ReconnectModal({ open, profiles, onReconnect, onCreateNew, shareCode, hasVacancy = true }: ReconnectModalProps) {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);

  const configuredProfiles = profiles.filter(isConfiguredProfile);

  const handleProfileSelect = (profile: Profile) => {
    setSelectedProfile(profile);
    setPin('');
    setError('');
    setAttemptsRemaining(null);
    setLockedUntil(null);
  };

  const handleBack = () => {
    setSelectedProfile(null);
    setPin('');
    setError('');
    setAttemptsRemaining(null);
    setLockedUntil(null);
  };

  const handleSubmitPin = async () => {
    if (!selectedProfile || pin.length !== 4) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Call the secure verify-pin edge function
      const { data, error: funcError } = await supabase.functions.invoke('verify-pin', {
        body: { 
          profile_id: selectedProfile.id, 
          pin: pin 
        },
      });

      if (funcError) {
        throw new Error(funcError.message);
      }

      if (!data.success) {
        setError(data.error || 'Código incorreto');
        setPin('');
        
        if (data.attempts_remaining !== undefined) {
          setAttemptsRemaining(data.attempts_remaining);
        }
        
        if (data.locked) {
          setLockedUntil(data.locked_until);
        }
        
        setLoading(false);
        return;
      }

      // PIN verified successfully - call the original onReconnect for localStorage handling
      const success = await onReconnect(selectedProfile, pin);
      
      if (!success) {
        setError('Erro ao reconectar. Tente novamente.');
        setPin('');
      }
    } catch {
      setError('Erro ao verificar. Tente novamente.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (value: string) => {
    setPin(value);
    setError('');
    
    // Auto-submit when 4 digits entered
    if (value.length === 4) {
      setTimeout(() => {
        handleSubmitPin();
      }, 100);
    }
  };

  const formatLockedTime = (isoDate: string): string => {
    const lockDate = new Date(isoDate);
    const now = new Date();
    const diffMs = lockDate.getTime() - now.getTime();
    const diffMins = Math.ceil(diffMs / 60000);
    
    if (diffMins <= 0) return 'agora';
    if (diffMins === 1) return '1 minuto';
    return `${diffMins} minutos`;
  };

  // Check if profile has email for recovery
  const hasEmail = selectedProfile && 'email' in selectedProfile && selectedProfile.email;

  return (
    <>
      <Dialog open={open && !showRecovery}>
        <DialogContent 
          className="sm:max-w-md overflow-hidden" 
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center gap-2 animate-fade-in">
              <Heart className="w-5 h-5 text-primary animate-pulse" />
              {selectedProfile ? `Olá, ${selectedProfile.name}!` : 'Bem-vindo de volta!'}
            </DialogTitle>
            <DialogDescription className="text-center animate-fade-in">
              {selectedProfile 
                ? 'Digite seu código pessoal para entrar' 
                : 'Quem é você?'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {!selectedProfile ? (
              <>
                {/* Profile Selection */}
                <div className="grid grid-cols-2 gap-4 animate-fade-in">
                {configuredProfiles.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => handleProfileSelect(profile)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl",
                        "bg-muted/50 hover:bg-muted transition-all duration-300",
                        "hover:scale-105 hover:shadow-lg",
                        "border-2 border-transparent hover:border-primary/30"
                      )}
                    >
                      <Avatar
                        avatarIndex={profile.avatar_index}
                        size="xl"
                        className="w-16 h-16"
                        ringColor={profile.color}
                        animateOnHover
                        showBackground={false}
                      />
                      <span className="font-medium text-sm">{profile.name}</span>
                      {profile.username && (
                        <span className="text-xs text-muted-foreground">@{profile.username}</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Create New Profile Option - only if vacancy available */}
                {hasVacancy && (
                  <div className="pt-4 border-t border-border/50">
                    <Button
                      variant="ghost"
                      onClick={onCreateNew}
                      className="w-full text-muted-foreground hover:text-foreground"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Criar novo perfil
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* PIN Entry */}
                <div className="flex flex-col items-center gap-6 animate-fade-in">
                  {/* Selected Profile Preview */}
                  <div className="flex flex-col items-center gap-1">
                    <Avatar
                      avatarIndex={selectedProfile.avatar_index}
                      size="xl"
                      className="w-20 h-20"
                      ringColor={selectedProfile.color}
                      selected
                      animateOnHover={false}
                      showBackground={false}
                    />
                    {selectedProfile.username && (
                      <span className="text-sm text-muted-foreground">@{selectedProfile.username}</span>
                    )}
                  </div>

                  {/* PIN Input */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Lock className="w-4 h-4" />
                      <span>Código pessoal</span>
                    </div>
                    
                    <InputOTP 
                      maxLength={4} 
                      value={pin} 
                      onChange={handlePinChange}
                      disabled={loading || !!lockedUntil}
                    >
                      <InputOTPGroup>
                        <InputOTPSlotMasked index={0} className="w-12 h-12 text-xl" />
                        <InputOTPSlotMasked index={1} className="w-12 h-12 text-xl" />
                        <InputOTPSlotMasked index={2} className="w-12 h-12 text-xl" />
                        <InputOTPSlotMasked index={3} className="w-12 h-12 text-xl" />
                      </InputOTPGroup>
                    </InputOTP>

                    {loading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verificando...</span>
                      </div>
                    )}

                    {error && (
                      <p className="text-sm text-destructive animate-fade-in mt-2 text-center">
                        {error}
                      </p>
                    )}

                    {attemptsRemaining !== null && attemptsRemaining > 0 && attemptsRemaining <= 3 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 animate-fade-in">
                        {attemptsRemaining} tentativa{attemptsRemaining > 1 ? 's' : ''} restante{attemptsRemaining > 1 ? 's' : ''}
                      </p>
                    )}

                    {lockedUntil && (
                      <p className="text-xs text-destructive animate-fade-in">
                        Conta bloqueada por {formatLockedTime(lockedUntil)}
                      </p>
                    )}
                  </div>

                  {/* Forgot PIN Link */}
                  <Button
                    variant="link"
                    onClick={() => setShowRecovery(true)}
                    className="text-muted-foreground text-sm"
                    disabled={loading}
                  >
                    <HelpCircle className="w-4 h-4 mr-1" />
                    Esqueci meu código
                  </Button>

                  {/* Back Button */}
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    disabled={loading}
                    className="text-muted-foreground"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Recovery Modal */}
      <RecoveryModal
        open={showRecovery}
        onClose={() => setShowRecovery(false)}
        shareCode={shareCode}
      />
    </>
  );
}
