import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';
import { CAT_AVATARS, PERSON_COLORS } from '@/lib/constants';
import { Profile } from '@/contexts/CoupleContext';
import { Check, Heart, Sparkles, Lock, ArrowRight, ArrowLeft, Mail, SkipForward } from 'lucide-react';

interface OnboardingModalProps {
  open: boolean;
  onComplete: (position: number, name: string, avatarIndex: number, color: string, pinCode: string, email?: string) => void;
  profiles: Profile[];
  shareCode: string;
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

export function OnboardingModal({ open, onComplete, profiles, shareCode }: OnboardingModalProps) {
  const [step, setStep] = useState<'profile' | 'pin' | 'email'>('profile');
  const [name, setName] = useState('');
  const [avatarIndex, setAvatarIndex] = useState(1);
  const [color, setColor] = useState(PERSON_COLORS[0].value);
  const [pinCode, setPinCode] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [compliment, setCompliment] = useState('');
  const [showCompliment, setShowCompliment] = useState(false);
  const [hoveredAvatar, setHoveredAvatar] = useState<number | null>(null);
  const [complimentTimeout, setComplimentTimeout] = useState<NodeJS.Timeout | null>(null);

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

  const handleNextStep = () => {
    if (name.trim() && isValidName(name)) {
      setStep('pin');
    }
  };

  const handlePinComplete = () => {
    if (pinCode.length === 4) {
      setStep('email');
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailError('');
  };

  const handleComplete = () => {
    // Validate email if provided
    if (email.trim() && !isValidEmail(email)) {
      setEmailError('E-mail inválido');
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
      timestamp: Date.now()
    }));
    
    onComplete(position, formattedName, avatarIndex, color, pinCode, email.trim().toLowerCase() || undefined);
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
      timestamp: Date.now()
    }));
    
    onComplete(position, formattedName, avatarIndex, color, pinCode, undefined);
  };

  const handlePinChange = (value: string) => {
    setPinCode(value);
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
            {step === 'profile' ? 'Olá! Crie seu perfil' : step === 'pin' ? 'Crie seu código' : 'Adicione seu e-mail'}
          </DialogTitle>
          <DialogDescription className="text-center animate-fade-in">
            {step === 'profile' 
              ? 'Personalize como você aparecerá no app'
              : step === 'pin'
              ? 'Código de 4 dígitos para entrar em outros dispositivos'
              : 'Para recuperar seu código se esquecer (opcional)'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {step === 'profile' ? (
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
                disabled={!name.trim() || !isValidName(name)} 
                className={cn(
                  "w-full transition-all duration-300",
                  isValidName(name) && looksLikeName(name) && "animate-pulse-subtle"
                )}
              >
                Continuar
                <ArrowRight className="w-4 h-4 ml-2" />
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
                <span className="font-semibold text-lg">{name}</span>

                {/* PIN Input */}
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Lock className="w-4 h-4" />
                    <span>Crie um código pessoal</span>
                  </div>
                  
                  <InputOTP 
                    maxLength={4} 
                    value={pinCode} 
                    onChange={handlePinChange}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="w-12 h-12 text-xl" />
                      <InputOTPSlot index={1} className="w-12 h-12 text-xl" />
                      <InputOTPSlot index={2} className="w-12 h-12 text-xl" />
                      <InputOTPSlot index={3} className="w-12 h-12 text-xl" />
                    </InputOTPGroup>
                  </InputOTP>
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
                    disabled={pinCode.length !== 4} 
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
                <span className="font-semibold text-lg">{name}</span>

                {/* Email Input */}
                <div className="flex flex-col items-center gap-2 w-full">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Mail className="w-4 h-4" />
                    <span>E-mail para recuperação</span>
                  </div>
                  
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="seu@email.com"
                    className="text-center"
                  />
                  
                  {emailError && (
                    <p className="text-sm text-destructive animate-fade-in">
                      {emailError}
                    </p>
                  )}
                  
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Se esquecer seu código, enviaremos um link de recuperação
                  </p>
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
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Criar perfil
                  </Button>
                </div>

                <Button 
                  variant="link" 
                  onClick={handleSkipEmail}
                  className="text-muted-foreground"
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
