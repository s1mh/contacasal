import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSlotMasked } from '@/components/ui/input-otp';
import { cn, isConfiguredProfile } from '@/lib/utils';
import { CAT_AVATARS, PERSON_COLORS } from '@/lib/constants';
import { Profile } from '@/contexts/CoupleContext';
import { Check, Heart, Sparkles, Lock, ArrowRight, ArrowLeft, Mail, SkipForward, AtSign, Loader2, Eye, EyeOff, PartyPopper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

// List of cute compliments for valid names
const NAME_COMPLIMENTS = [
  "Que nome lindo! 💕",
  "Adorável! ✨",
  "Amei esse nome! 🌟",
  "Combina com você! 💫",
  "Muito fofo! 🥰",
  "Perfeito! 💝",
];

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

// Validate email format
const isValidEmail = (email: string): boolean => {
  if (!email.trim()) return true; // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// Check if PIN is weak
const isWeakPin = (pin: string): { weak: boolean; reason?: string } => {
  if (pin.length !== 4) return { weak: false };
  
  // Check for repeated digits (1111, 0000, etc.)
  if (/^(\d)\1{3}$/.test(pin)) {
    return { weak: true, reason: 'Não use 4 dígitos iguais' };
  }
  
  // Check for common weak PINs
  const commonPins = ['1234', '4321', '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1212', '2121', '1010', '0101', '1122', '2211'];
  if (commonPins.includes(pin)) {
    return { weak: true, reason: 'Esse código é muito comum' };
  }
  
  // Check for ascending sequence (1234, 2345, 3456, etc.)
  const digits = pin.split('').map(Number);
  const isAscending = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
  if (isAscending) {
    return { weak: true, reason: 'Evite sequências simples' };
  }
  
  // Check for descending sequence (4321, 5432, etc.)
  const isDescending = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
  if (isDescending) {
    return { weak: true, reason: 'Evite sequências simples' };
  }
  
  return { weak: false };
};

export function OnboardingModal({ open, onClose, onComplete, profiles, shareCode, isNewMember = false, hostName, isJoining = false }: OnboardingModalProps) {
  const [step, setStep] = useState<'welcome' | 'profile' | 'pin' | 'email'>(isNewMember ? 'welcome' : 'profile');
  const [name, setName] = useState('');
  const [avatarIndex, setAvatarIndex] = useState(1);
  const [color, setColor] = useState(PERSON_COLORS[0].value);
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailExists, setEmailExists] = useState(false);
  const [emailExistsInfo, setEmailExistsInfo] = useState<{ masked_space?: string; profile_name?: string } | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [username, setUsername] = useState('');
  const [generatingUsername, setGeneratingUsername] = useState(false);
  const [compliment, setCompliment] = useState('');
  const [showCompliment, setShowCompliment] = useState(false);
  const [hoveredAvatar, setHoveredAvatar] = useState<number | null>(null);
  const [complimentTimeout, setComplimentTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

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
        const randomCompliment = NAME_COMPLIMENTS[Math.floor(Math.random() * NAME_COMPLIMENTS.length)];
        setCompliment(randomCompliment);
        setShowCompliment(true);
      }, 1000);
      
      setComplimentTimeout(timeout);
      return () => clearTimeout(timeout);
    } else {
      setShowCompliment(false);
    }
  }, [name]);

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
    } catch (err) {
      console.error('Error generating username:', err);
    } finally {
      setGeneratingUsername(false);
    }
  };

  const handleNextStep = () => {
    if (name.trim() && isValidName(name) && !isTransitioning) {
      setIsTransitioning(true);
      setStep('pin'); // Immediate transition
      // Generate username in background
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
        setPinError(weakCheck.reason || 'Código muito fraco');
      }
    }
  };

  const handlePinComplete = () => {
    if (pinCode.length === 4) {
      const weakCheck = isWeakPin(pinCode);
      if (weakCheck.weak) {
        setPinError(weakCheck.reason || 'Código muito fraco');
        return;
      }
      setStep('email');
    }
  };

  // Check if email already exists
  const checkEmailExists = async (emailToCheck: string) => {
    if (!emailToCheck.trim() || !isValidEmail(emailToCheck)) {
      setEmailExists(false);
      setEmailExistsInfo(null);
      return;
    }

    setCheckingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-email', {
        body: { 
          email: emailToCheck.trim().toLowerCase(),
          couple_id: profiles[0]?.couple_id
        }
      });

      if (data?.exists) {
        setEmailExists(true);
        setEmailExistsInfo({
          masked_space: data.masked_space,
          profile_name: data.profile_name
        });
        setEmailError(`Este e-mail já está cadastrado${data.masked_space ? ` no espaço ${data.masked_space}` : ''}`);
      } else {
        setEmailExists(false);
        setEmailExistsInfo(null);
        setEmailError('');
      }
    } catch (err) {
      console.error('Error checking email:', err);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailError('');
    setEmailExists(false);
    setEmailExistsInfo(null);
  };

  // Check email on blur
  const handleEmailBlur = () => {
    if (email.trim()) {
      checkEmailExists(email);
    }
  };

  const handleComplete = () => {
    // Validate email if provided
    if (email.trim() && !isValidEmail(email)) {
      setEmailError('E-mail inválido');
      return;
    }

    if (emailExists) {
      setEmailError('Este e-mail já está em uso');
      return;
    }

    const position = getAvailablePosition();
    // Format name - capitalize first letter of each word
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
    
    onComplete(position, formattedName, avatarIndex, color, pinCode, email.trim().toLowerCase() || undefined, username || undefined);
  };

  const handleSkipEmail = () => {
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
  };

  const handleSendRecoveryLink = async () => {
    if (!email.trim()) return;
    
    try {
      await supabase.functions.invoke('request-pin-recovery', {
        body: { email: email.trim().toLowerCase() }
      });
      setEmailError('');
      setEmailExists(false);
      // Show success message
      setEmailExistsInfo({ profile_name: 'Link enviado! Verifique seu e-mail.' });
    } catch (err) {
      console.error('Error sending recovery:', err);
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
        className="sm:max-w-md overflow-hidden" 
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
              ? 'Bem-vindo!' 
              : step === 'profile' 
              ? 'Olá! Crie seu perfil' 
              : step === 'pin' 
              ? 'Crie seu código' 
              : 'Adicione seu e-mail'}
          </DialogTitle>
          <DialogDescription className="text-center animate-fade-in">
            {step === 'welcome'
              ? `${displayHostName || 'Alguém'} convidou você para compartilhar despesas`
              : step === 'profile'
              ? 'Personalize como você aparecerá no app'
              : step === 'pin'
              ? 'Código de 4 dígitos para entrar em outros dispositivos'
              : 'Para recuperar seu código se esquecer (opcional)'
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
                          <img 
                            src={CAT_AVATARS[hostProfile.avatar_index - 1]} 
                            alt={hostProfile.name}
                            className="w-full h-full object-cover"
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
                    Vocês poderão dividir gastos, acompanhar despesas e manter tudo organizado juntos! 💕
                  </p>
                </div>

                <Button 
                  onClick={() => setStep('profile')}
                  className="w-full"
                  size="lg"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Criar meu perfil
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </>
          ) : step === 'profile' ? (
            <>
              {/* Name Input */}
              <div className="space-y-2 animate-fade-in" style={{ animationDelay: '100ms' }}>
                <label className="text-sm font-medium text-muted-foreground">Seu nome</label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Como você quer ser chamado(a)?"
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

              {/* Username - Editable field */}
              <div className="space-y-2 animate-fade-in" style={{ animationDelay: '150ms' }}>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AtSign className="w-4 h-4" />
                  Seu @ <span className="text-xs font-normal">(você pode personalizar)</span>
                </label>
                <div className="flex items-center gap-2 bg-muted/30 rounded-xl p-3 border-2 border-dashed border-border/50 hover:border-primary/30 transition-colors">
                  <span className="text-muted-foreground">@</span>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/[@\s]/g, '').toLowerCase())}
                    placeholder={generatingUsername ? "gerando..." : "seu_username"}
                    className="border-0 bg-transparent p-0 focus-visible:ring-0 h-auto"
                    maxLength={20}
                  />
                  {generatingUsername && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  Use para fazer login de qualquer dispositivo
                </p>
              </div>

              {/* Avatar Selection */}
              <div className="space-y-2 animate-fade-in" style={{ animationDelay: '200ms' }}>
                <label className="text-sm font-medium text-muted-foreground">Escolha seu gatinho</label>
                <div className="grid grid-cols-4 gap-3">
                  {CAT_AVATARS.map((avatar, index) => {
                    const isSelected = avatarIndex === index + 1;
                    const isHovered = hoveredAvatar === index;
                    
                    return (
                      <button
                        key={index}
                        onClick={() => setAvatarIndex(index + 1)}
                        onMouseEnter={() => setHoveredAvatar(index)}
                        onMouseLeave={() => setHoveredAvatar(null)}
                        className={cn(
                          "relative w-14 h-14 rounded-full overflow-hidden ring-2 transition-all duration-300",
                          isSelected 
                            ? "ring-primary ring-offset-2 shadow-lg" 
                            : "ring-border hover:ring-primary/50"
                        )}
                      >
                        <img 
                          src={avatar} 
                          alt={`Avatar ${index + 1}`} 
                          className={cn(
                            "w-full h-full object-cover",
                            isSelected && "animate-cat-idle",
                            isHovered && !isSelected && "animate-wiggle"
                          )}
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Check className="w-6 h-6 text-primary drop-shadow-md animate-scale-in" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Selection */}
              <div className="space-y-2 animate-fade-in" style={{ animationDelay: '300ms' }}>
                <label className="text-sm font-medium text-muted-foreground">Sua cor</label>
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
                style={{ animationDelay: '400ms' }}
              >
                <div 
                  className="w-14 h-14 rounded-full overflow-hidden ring-4 transition-all duration-500"
                  style={{ 
                    boxShadow: `0 0 0 4px ${color}`,
                    transition: 'box-shadow 0.3s ease'
                  }}
                >
                  <img 
                    src={CAT_AVATARS[avatarIndex - 1]} 
                    alt="Preview"
                    className={cn(
                      "w-full h-full object-cover",
                      name.trim() && "animate-cat-idle"
                    )}
                  />
                </div>
                <div className="text-left">
                  <span className="font-semibold text-lg block transition-all duration-300">
                    {name.trim() || 'Seu nome'}
                  </span>
                  {showCompliment && (
                    <span className="text-xs text-primary animate-fade-in">Pronto para dividir! 💕</span>
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
                    Carregando...
                  </>
                ) : (
                  <>
                    Continuar
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
                  <img 
                    src={CAT_AVATARS[avatarIndex - 1]} 
                    alt="Preview"
                    className="w-full h-full object-cover"
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
                      Gerando seu @...
                    </span>
                  )}
                </div>

                {/* PIN Input */}
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Lock className="w-4 h-4" />
                    <span>Crie um código pessoal</span>
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
                  <div className="w-2 h-2 rounded-full bg-muted" />
                </div>

                <div className="flex gap-2 w-full">
                  <Button 
                    variant="ghost"
                    onClick={() => setStep('profile')}
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                  <Button 
                    onClick={handlePinComplete} 
                    disabled={pinCode.length !== 4 || !!pinError} 
                    className="flex-1"
                  >
                    Continuar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Email Step */}
              <div className="flex flex-col items-center gap-6 animate-fade-in">
                {/* Profile Preview */}
                <div 
                  className="w-20 h-20 rounded-full overflow-hidden ring-4 transition-all animate-cat-idle"
                  style={{ boxShadow: `0 0 0 4px ${color}` }}
                >
                  <img 
                    src={CAT_AVATARS[avatarIndex - 1]} 
                    alt="Preview"
                    className="w-full h-full object-cover"
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
                </div>

                {/* Email Input */}
                <div className="flex flex-col items-center gap-2 w-full">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Mail className="w-4 h-4" />
                    <span>E-mail para recuperação</span>
                  </div>
                  
                  <div className="relative w-full">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      onBlur={handleEmailBlur}
                      placeholder="seu@email.com"
                      className={cn(
                        "text-center",
                        emailExists && "border-destructive"
                      )}
                    />
                    {checkingEmail && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {emailError && !emailExists && (
                    <p className="text-sm text-destructive animate-fade-in">
                      {emailError}
                    </p>
                  )}

                  {emailExists && (
                    <div className="text-center animate-fade-in">
                      <p className="text-sm text-destructive mb-2">
                        {emailError}
                      </p>
                      <Button 
                        variant="link" 
                        size="sm"
                        onClick={handleSendRecoveryLink}
                        className="text-primary"
                      >
                        <Mail className="w-3 h-3 mr-1" />
                        Enviar link de recuperação
                      </Button>
                    </div>
                  )}
                  
                  {!emailExists && !emailError && (
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      Se esquecer seu código, enviaremos um link de recuperação
                    </p>
                  )}
                </div>

                {/* Step indicator */}
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>

                <div className="flex gap-2 w-full">
                  <Button 
                    variant="ghost"
                    onClick={() => setStep('pin')}
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                  <Button 
                    onClick={handleComplete} 
                    className="flex-1"
                    disabled={emailExists || checkingEmail || isJoining}
                  >
                    {isJoining ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Heart className="w-4 h-4 mr-2" />
                    )}
                    {isJoining ? 'Criando...' : 'Criar perfil'}
                  </Button>
                </div>

                <Button 
                  variant="link" 
                  onClick={handleSkipEmail}
                  className="text-muted-foreground"
                  disabled={emailExists || isJoining}
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  Pular esta etapa
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}