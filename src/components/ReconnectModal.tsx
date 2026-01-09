import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';
import { CAT_AVATARS } from '@/lib/constants';
import { Profile } from '@/contexts/CoupleContext';
import { Heart, ArrowLeft, UserPlus, Lock } from 'lucide-react';

interface ReconnectModalProps {
  open: boolean;
  profiles: Profile[];
  onReconnect: (profile: Profile, pin: string) => Promise<boolean>;
  onCreateNew: () => void;
  shareCode: string;
}

export function ReconnectModal({ open, profiles, onReconnect, onCreateNew, shareCode }: ReconnectModalProps) {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Filter only configured profiles (not default names)
  const configuredProfiles = profiles.filter(p => 
    p.name !== 'Pessoa 1' && p.name !== 'Pessoa 2' && p.name !== 'Pessoa'
  );

  const handleProfileSelect = (profile: Profile) => {
    setSelectedProfile(profile);
    setPin('');
    setError('');
  };

  const handleBack = () => {
    setSelectedProfile(null);
    setPin('');
    setError('');
  };

  const handleSubmitPin = async () => {
    if (!selectedProfile || pin.length !== 4) return;
    
    setLoading(true);
    setError('');
    
    const success = await onReconnect(selectedProfile, pin);
    
    if (!success) {
      setError('Código incorreto. Tente novamente.');
      setPin('');
    }
    
    setLoading(false);
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

  return (
    <Dialog open={open}>
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
                      "flex flex-col items-center gap-3 p-4 rounded-2xl",
                      "bg-muted/50 hover:bg-muted transition-all duration-300",
                      "hover:scale-105 hover:shadow-lg",
                      "border-2 border-transparent hover:border-primary/30"
                    )}
                  >
                    <div 
                      className="w-16 h-16 rounded-full overflow-hidden ring-4 transition-all"
                      style={{ boxShadow: `0 0 0 4px ${profile.color}` }}
                    >
                      <img 
                        src={CAT_AVATARS[profile.avatar_index - 1]} 
                        alt={profile.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="font-medium text-sm">{profile.name}</span>
                  </button>
                ))}
              </div>

              {/* Create New Profile Option */}
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
            </>
          ) : (
            <>
              {/* PIN Entry */}
              <div className="flex flex-col items-center gap-6 animate-fade-in">
                {/* Selected Profile Preview */}
                <div 
                  className="w-20 h-20 rounded-full overflow-hidden ring-4 transition-all animate-cat-idle"
                  style={{ boxShadow: `0 0 0 4px ${selectedProfile.color}` }}
                >
                  <img 
                    src={CAT_AVATARS[selectedProfile.avatar_index - 1]} 
                    alt={selectedProfile.name}
                    className="w-full h-full object-cover"
                  />
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
                    disabled={loading}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="w-12 h-12 text-xl" />
                      <InputOTPSlot index={1} className="w-12 h-12 text-xl" />
                      <InputOTPSlot index={2} className="w-12 h-12 text-xl" />
                      <InputOTPSlot index={3} className="w-12 h-12 text-xl" />
                    </InputOTPGroup>
                  </InputOTP>

                  {error && (
                    <p className="text-sm text-destructive animate-fade-in mt-2">
                      {error}
                    </p>
                  )}
                </div>

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
  );
}