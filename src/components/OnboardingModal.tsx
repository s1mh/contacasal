import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSlotMasked } from '@/components/ui/input-otp';
import { cn, isConfiguredProfile } from '@/lib/utils';
import { PERSON_COLORS } from '@/lib/constants';
import { Avatar } from '@/components/Avatar';
import { AvatarSelectionGrid } from '@/components/AvatarSelectionGrid';
import { Profile } from '@/contexts/CoupleContext';
import { Check, Heart, Sparkles, Lock, ArrowRight, ArrowLeft, AtSign, Loader2, Eye, EyeOff, PartyPopper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePreferences } from '@/contexts/PreferencesContext';

interface OnboardingModalProps {
  open: boolean;
  onClose?: () => void;
  onComplete: (position: number, name: string, avatarIndex: number, color: string, pinCode: string, email?: string, username?: string) => void | Promise<void>;
  profiles: Profile[];
  shareCode: string;
  isNewMember?: boolean;
  hostName?: string | null;
  isJoining?: boolean;
}

// Validate name - only letters and spaces, no special characters
const isValidName = (name: string): boolean => {
  if (!name.trim()) return false;
  // Allow only letters (including accented), spaces, and common name characters
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
  return nameRegex.test(name.trim()) && name.trim().length >= 2;
};

// Check if it looks like a real name (not random text)
const looksLikeName = (name: string): boolean => {
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  // Should start with uppercase or be all lowercase (will be formatted)
  // Should not have too many consonants in a row (like "xzpqw")
  const hasVowels = /[aeiouàáâãéêíóôõú]/i.test(trimmed);
  return hasVowels && trimmed.length <= 20;
};

// Check if PIN is weak - returns key for translation
const isWeakPin = (pin: string): { weak: boolean; reasonKey?: 'pinSameDigits' | 'pinCommon' | 'pinSequence' } => {
  if (pin.length !== 4) return { weak: false };
  
  // Check for repeated digits (1111, 0000, etc.)
  if (/^(\d)\1{3}$/.test(pin)) {
    return { weak: true, reasonKey: 'pinSameDigits' };
  }
  
  // Check for common weak PINs
  const commonPins = ['1234', '4321', '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1212', '2121', '1010', '0101', '1122', '2211'];
  if (commonPins.includes(pin)) {
    return { weak: true, reasonKey: 'pinCommon' };
  }
  
  // Check for ascending sequence (1234, 2345, 3456, etc.)
  const digits = pin.split('').map(Number);
  const isAscending = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
  if (isAscending) {
    return { weak: true, reasonKey: 'pinSequence' };
  }
  
  // Check for descending sequence (4321, 5432, etc.)
  const isDescending = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
  if (isDescending) {
    return { weak: true, reasonKey: 'pinSequence' };
  }
  
  return { weak: false };
};

export function OnboardingModal({ open, onClose, onComplete, profiles, shareCode, isNewMember = false, hostName, isJoining = false }: OnboardingModalProps) {
  const [step, setStep] = useState<'welcome' | 'profile' | 'pin'>(isNewMember ? 'welcome' : 'profile');
  const [name, setName] = useState('');
  const [avatarIndex, setAvatarIndex] = useState(1);
  const [color, setColor] = useState(PERSON_COLORS[0].value);
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [username, setUsername] = useState('');
  const [generatingUsername, setGeneratingUsername] = useState(false);
  const [compliment, setCompliment] = useState('');
  const [showCompliment, setShowCompliment] = useState(false);
  const [complimentTimeout, setComplimentTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { t: prefT } = usePreferences();
  const nameCompliments = [
    prefT('Que nome lindo! 💕'),
    prefT('Adorável! ✨'),
    prefT('Amei esse nome! 🌟'),
    prefT('Combina com você! 💫'),
    prefT('Muito fofo! 🥰'),
    prefT('Perfeito! 💝'),
  ];

  // Get the host profile name for welcome message (use prop or find from profiles)
  const hostProfile = profiles.find(isConfiguredProfile);
  const displayHostName = hostName || hostProfile?.name;

  // Update step when isNewMember changes
  useEffect(() => {
    if (isNewMember && step === 'profile') {
      setStep('welcome');
    }
  }, [isNewMember]);

  // Modal can always be closed - will navigate to home
  const canClose = true;

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && onClose) {
      onClose();
    }
  };

  // Find an available profile (one that hasn't been customized yet)
  const getAvailablePosition = (): number => {
    const unconfiguredProfile = profiles.find(p => 
      p.name === 'Pessoa 1' || p.name === 'Pessoa 2' || p.name === 'Pessoa'
    );
    if (unconfiguredProfile) {
      return unconfiguredProfile.position;
    }
    return 1;
  };

  // Handle name change with validation
  const handleNameChange = (value: string) => {
    // Remove special characters as user types
    const cleanedValue = value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '');
    setName(cleanedValue);
    
    // Hide compliment while typing and clear any pending timeout
    setShowCompliment(false);
    if (complimentTimeout) {
      clearTimeout(complimentTimeout);
    }
  };

  // Show compliment 1 second after user stops typing
  useEffect(() => {
    if (isValidName(name) && looksLikeName(name)) {
      const timeout = setTimeout(() => {
        const randomCompliment = nameCompliments[Math.floor(Math.random() * nameCompliments.length)];
        setCompliment(randomCompliment);
        setShowCompliment(true);
      }, 1000);
      
      setComplimentTimeout(timeout);
      return () => clearTimeout(timeout);
    } else {
      setShowCompliment(false);
    }
  }, [name, prefT]);

  // Generate username when moving to PIN step
  const generateUsername = async () => {
    if (!name.trim()) return;
    
    setGeneratingUsername(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-username', {
        body: { name: name.trim() }
      });
      
      if (data?.success && data?.username) {
        setUsername(data.username);
      }
    } catch {
      // Username generation is optional
    } finally {
      setGeneratingUsername(false);
    }
  };

  const handleNextStep = () => {
    if (name.trim() && isValidName(name) && !isTransitioning) {
      setIsTransitioning(true);
      setStep('pin');
      generateUsername().finally(() => {
        setIsTransitioning(false);
      });
    }
  };

  const handlePinChange = (value: string) => {
    setPinCode(value);
    setPinError('');
    
    // Check for weak PIN when complete
    if (value.length === 4) {
      const weakCheck = isWeakPin(value);
      if (weakCheck.weak) {
        setPinError(weakCheck.reasonKey ? prefT(weakCheck.reasonKey) : prefT('Código muito fraco'));
      }
    }
  };

  const handlePinComplete = () => {
    if (pinCode.length === 4) {
      const weakCheck = isWeakPin(pinCode);
      if (weakCheck.weak) {
        setPinError(weakCheck.reasonKey ? prefT(weakCheck.reasonKey) : prefT('Código muito fraco'));
        return;
      }
      // Skip email step - go directly to profile creation
      const position = getAvailablePosition();
      const formattedName = name.trim()
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      localStorage.setItem(`couple_${shareCode}`, JSON.stringify({
        position,
        name: formattedName,
        avatarIndex,
        color,
        username,
        timestamp: Date.now()
      }));

      onComplete(position, formattedName, avatarIndex, color, pinCode, undefined, username || undefined);
    }
  };


  // Render PIN slots based on visibility
  const renderPinSlots = () => {
    if (showPin) {
      return (
        <>
          <InputOTPSlot index={0} className="w-12 h-12 text-xl" />
          <InputOTPSlot index={1} className="w-12 h-12 text-xl" />
          <InputOTPSlot index={2} className="w-12 h-12 text-xl" />
          <InputOTPSlot index={3} className="w-12 h-12 text-xl" />
        </>
      );
    }
    return (
      <>
        <InputOTPSlotMasked index={0} className="w-12 h-12 text-xl" />
        <InputOTPSlotMasked index={1} className="w-12 h-12 text-xl" />
        <InputOTPSlotMasked index={2} className="w-12 h-12 text-xl" />
        <InputOTPSlotMasked index={3} className="w-12 h-12 text-xl" />
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-md" 
        onPointerDownOutside={(e) => !canClose && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2 animate-fade-in">
            {step === 'welcome' ? (
              <PartyPopper className="w-5 h-5 text-primary" />
            ) : (
              <Heart className="w-5 h-5 text-primary animate-pulse" />
            )}
            {step === 'welcome'
              ? prefT('Bem-vindo!')
              : step === 'profile'
              ? prefT('Crie seu perfil')
              : prefT('Crie seu código')}
          </DialogTitle>
          <DialogDescription className="text-center animate-fade-in">
            {step === 'welcome'
              ? prefT('{name} convidou você para compartilhar despesas', { name: displayHostName || prefT('Alguém') })
              : step === 'profile'
              ? prefT('Personalize como você aparecerá no app')
              : prefT('Código de 4 dígitos para entrar em outros dispositivos')
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {step === 'welcome' ? (
            <>
              {/* Welcome Step */}
              <div className="flex flex-col items-center gap-6 animate-fade-in">
                {/* Host info */}
                {(hostProfile || displayHostName) && (
                  <div className="flex flex-col items-center gap-3">
                    {hostProfile ? (
                      <>
                        <div 
                          className="w-24 h-24 rounded-full overflow-hidden ring-4 animate-bounce-gentle"
                          style={{ boxShadow: `0 0 0 4px ${hostProfile.color}` }}
                        >
                          <Avatar
                            avatarIndex={hostProfile.avatar_index}
                            size="xl"
                            className="w-24 h-24"
                            selected
                            animateOnHover={false}
                            showBackground={false}
                          />
                        </div>
                        <span className="font-semibold text-lg">{hostProfile.name}</span>
                      </>
                    ) : displayHostName ? (
                      <>
                        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center animate-bounce-gentle">
                          <Heart className="w-10 h-10 text-primary" />
                        </div>
                        <span className="font-semibold text-lg">{displayHostName}</span>
                      </>
                    ) : null}
                  </div>
                )}

                <div className="text-center px-4">
                  <p className="text-muted-foreground">
                    {prefT('Vocês poderão dividir gastos, acompanhar despesas e manter tudo organizado juntos! 💕')}
                  </p>
                </div>

                <Button 
                  onClick={() => setStep('profile')}
                  className="w-full"
                  size="lg"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {prefT('Criar meu perfil')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </>
          ) : step === 'profile' ? (
            <>
              {/* Name Input */}
              <div className="space-y-2 animate-fade-in" style={{ animationDelay: '100ms' }}>
                <label className="text-sm font-medium text-muted-foreground">{prefT('Seu nome')}</label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={prefT('Como você quer ser chamado(a)?')}
                  className="text-center text-lg transition-all duration-300 focus:ring-2 focus:ring-primary/50"
                  autoFocus
                  maxLength={20}
                />
                {/* Compliment message with AI sparkle */}
                <div className={cn(
                  "h-6 flex items-center justify-center gap-2 transition-all duration-300",
                  showCompliment ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
                )}>
                  <Sparkles className="w-4 h-4 text-primary animate-spin-slow" />
                  <span className="text-sm text-primary font-medium">{compliment}</span>
                </div>
              </div>

              {/* Avatar Selection */}
              <div className="space-y-2 animate-fade-in" style={{ animationDelay: '150ms' }}>
                <label className="text-sm font-medium text-muted-foreground">{prefT('Escolha seu gatinho')}</label>
                <AvatarSelectionGrid value={avatarIndex} onChange={setAvatarIndex} />
              </div>

              {/* Color Selection */}
              <div className="space-y-2 animate-fade-in" style={{ animationDelay: '250ms' }}>
                <label className="text-sm font-medium text-muted-foreground">{prefT('Sua cor')}</label>
                <div className="flex gap-2 justify-center flex-wrap">
                  {PERSON_COLORS.map((c, index) => (
                    <button
                      key={c.value}
                      onClick={() => setColor(c.value)}
                      className={cn(
                        "w-8 h-8 rounded-full transition-all duration-300",
                        color === c.value 
                          ? "ring-2 ring-offset-2 ring-primary scale-125 shadow-lg" 
                          : "hover:scale-110"
                      )}
                      style={{ 
                        backgroundColor: c.value,
                        animationDelay: `${index * 50}ms`
                      }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div
                className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-muted/50 animate-fade-in transition-all duration-500"
                style={{ animationDelay: '350ms' }}
              >
                <div 
                  className="w-14 h-14 rounded-full overflow-hidden ring-4 transition-all duration-500"
                  style={{ 
                    boxShadow: `0 0 0 4px ${color}`,
                    transition: 'box-shadow 0.3s ease'
                  }}
                >
                  <Avatar
                    avatarIndex={avatarIndex}
                    size="md"
                    className="w-14 h-14"
                    selected={!!name.trim()}
                    animateOnHover={false}
                    showBackground={false}
                  />
                </div>
                <div className="text-left">
                  <span className="font-semibold text-lg block transition-all duration-300">
                    {name.trim() || prefT('Seu nome')}
                  </span>
                  {showCompliment && (
                    <span className="text-xs text-primary animate-fade-in">{prefT('Pronto para dividir! 💕')}</span>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleNextStep} 
                disabled={!name.trim() || !isValidName(name) || isTransitioning} 
                className={cn(
                  "w-full transition-all duration-300",
                  isValidName(name) && looksLikeName(name) && !isTransitioning && "animate-pulse-subtle",
                  isTransitioning && "opacity-70 cursor-not-allowed"
                )}
              >
                {isTransitioning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {prefT('Carregando...')}
                  </>
                ) : (
                  <>
                    {prefT('Continuar')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </>
          ) : step === 'pin' ? (
            <>
              {/* PIN Creation Step */}
              <div className="flex flex-col items-center gap-6 animate-fade-in">
                {/* Profile Preview */}
                <div 
                  className="w-20 h-20 rounded-full overflow-hidden ring-4 transition-all animate-cat-idle"
                  style={{ boxShadow: `0 0 0 4px ${color}` }}
                >
                  <Avatar
                    avatarIndex={avatarIndex}
                    size="xl"
                    className="w-20 h-20"
                    selected
                    animateOnHover={false}
                    showBackground={false}
                  />
                </div>
                <div className="text-center">
                  <span className="font-semibold text-lg block">{name}</span>
                  {username && (
                    <span className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <AtSign className="w-3 h-3" />
                      {username}
                    </span>
                  )}
                  {generatingUsername && (
                    <span className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {prefT('Gerando seu @...')}
                    </span>
                  )}
                </div>

                {/* PIN Input */}
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Lock className="w-4 h-4" />
                    <span>{prefT('Crie um código pessoal')}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <InputOTP 
                      maxLength={4} 
                      value={pinCode} 
                      onChange={handlePinChange}
                    >
                      <InputOTPGroup>
                        {renderPinSlots()}
                      </InputOTPGroup>
                    </InputOTP>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPin(!showPin)}
                      className="h-10 w-10"
                    >
                      {showPin ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  
                  {pinError && (
                    <p className="text-sm text-destructive animate-fade-in">
                      {pinError}
                    </p>
                  )}
                </div>

                {/* Step indicator */}
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>

                <div className="flex gap-2 w-full">
                  <Button
                    variant="ghost"
                    onClick={() => setStep('profile')}
                    className="flex-1"
                    disabled={isJoining}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {prefT('Voltar')}
                  </Button>
                  <Button
                    onClick={handlePinComplete}
                    disabled={pinCode.length !== 4 || !!pinError || isJoining}
                    className="flex-1"
                  >
                    {isJoining ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Heart className="w-4 h-4 mr-2" />
                    )}
                    {isJoining ? prefT('Criando...') : prefT('Criar perfil')}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
