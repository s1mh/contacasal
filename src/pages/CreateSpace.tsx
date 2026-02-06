import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSlotMasked } from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';
import { PERSON_COLORS } from '@/lib/constants';
import { Avatar } from '@/components/Avatar';
import { AvatarSelectionGrid } from '@/components/AvatarSelectionGrid';
import { Check, Heart, Sparkles, Lock, ArrowRight, ArrowLeft, Mail, SkipForward, AtSign, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePreferences } from '@/contexts/PreferencesContext';

// Validation functions
const isValidName = (name: string): boolean => {
  if (!name.trim()) return false;
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
  return nameRegex.test(name.trim()) && name.trim().length >= 2;
};

const looksLikeName = (name: string): boolean => {
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  const hasVowels = /[aeiouàáâãéêíóôõú]/i.test(trimmed);
  return hasVowels && trimmed.length <= 20;
};

const isValidEmail = (email: string): boolean => {
  if (!email.trim()) return true;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

const isWeakPin = (pin: string): { weak: boolean; reason?: string } => {
  if (pin.length !== 4) return { weak: false };
  if (/^(\d)\1{3}$/.test(pin)) {
    return { weak: true, reason: 'Não use 4 dígitos iguais' };
  }
  const commonPins = ['1234', '4321', '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1212', '2121', '1010', '0101', '1122', '2211'];
  if (commonPins.includes(pin)) {
    return { weak: true, reason: 'Esse código é muito comum' };
  }
  const digits = pin.split('').map(Number);
  const isAscending = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
  if (isAscending) {
    return { weak: true, reason: 'Evite sequências simples' };
  }
  const isDescending = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
  if (isDescending) {
    return { weak: true, reason: 'Evite sequências simples' };
  }
  return { weak: false };
};

export default function CreateSpace() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t: prefT } = usePreferences();

  const [step, setStep] = useState<'profile' | 'pin' | 'email'>('profile');
  const [name, setName] = useState('');
  const [avatarIndex, setAvatarIndex] = useState(1);
  const [color, setColor] = useState(PERSON_COLORS[0].value);
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [username, setUsername] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [generatingUsername, setGeneratingUsername] = useState(false);
  const [compliment, setCompliment] = useState('');
  const [showCompliment, setShowCompliment] = useState(false);
  const [creating, setCreating] = useState(false);
  const nameCompliments = [
    prefT('Que nome lindo! 💕'),
    prefT('Adorável! ✨'),
    prefT('Amei esse nome! 🌟'),
    prefT('Combina com você! 💫'),
    prefT('Muito fofo! 🥰'),
    prefT('Perfeito! 💝'),
  ];

  const handleNameChange = (value: string) => {
    const cleanedValue = value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '');
    setName(cleanedValue);
    setShowCompliment(false);
  };

  // Show compliment after typing
  const handleNameBlur = () => {
    if (isValidName(name) && looksLikeName(name)) {
      const randomCompliment = nameCompliments[Math.floor(Math.random() * nameCompliments.length)];
      setCompliment(randomCompliment);
      setShowCompliment(true);
    }
  };

  const generateUsername = async () => {
    if (!name.trim()) return;
    setGeneratingUsername(true);
    try {
      const { data } = await supabase.functions.invoke('generate-username', {
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

  const checkUsernameAvailability = async (usernameToCheck: string) => {
    if (!usernameToCheck.trim()) return;
    setCheckingUsername(true);
    setUsernameError('');
    try {
      const { data } = await supabase.functions.invoke('check-username', {
        body: { username: usernameToCheck.trim() }
      });
      if (data?.exists) {
        setUsernameError(prefT('Este username já está em uso'));
      }
    } catch {
      // Error handled silently
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleNextStep = () => {
    if (name.trim() && isValidName(name)) {
      setStep('pin');
      generateUsername();
    }
  };

  const handlePinChange = (value: string) => {
    setPinCode(value);
    setPinError('');
    if (value.length === 4) {
      const weakCheck = isWeakPin(value);
      if (weakCheck.weak) {
        setPinError(weakCheck.reason ? prefT(weakCheck.reason) : prefT('Código muito fraco'));
      }
    }
  };

  const handlePinComplete = async () => {
    if (pinCode.length === 4) {
      const weakCheck = isWeakPin(pinCode);
      if (weakCheck.weak) {
        setPinError(weakCheck.reason ? prefT(weakCheck.reason) : prefT('Código muito fraco'));
        return;
      }
      // Skip email step - go directly to creating space
      await createSpaceWithProfile();
    }
  };

  const handleComplete = async () => {
    if (email.trim() && !isValidEmail(email)) {
      setEmailError(prefT('E-mail inválido'));
      return;
    }

    if (usernameError) return;

    await createSpaceWithProfile();
  };

  const handleSkipEmail = async () => {
    await createSpaceWithProfile();
  };

  const createSpaceWithProfile = async () => {
    setCreating(true);
    try {
      const formattedName = name.trim()
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      // Create the couple space with profile data (server-side, bypasses RLS timing issues)
      const { data, error } = await supabase.functions.invoke('create-couple', {
        body: {
          name: formattedName,
          avatar_index: avatarIndex,
          color,
          pin: pinCode,
          email: email.trim() || undefined,
          username: username || undefined,
        }
      });

      if (error || !data?.success || !data?.share_code) {
        throw new Error(data?.error || prefT('Falha ao criar espaço'));
      }

      const shareCode = data.share_code;

      // Refresh session to get new couple_id claim
      await supabase.auth.refreshSession();

      // Save to localStorage
      localStorage.setItem(`couple_${shareCode}`, JSON.stringify({
        position: 1,
        name: formattedName,
        avatarIndex,
        color,
        username,
        timestamp: Date.now()
      }));

      toast({
        title: prefT('Espaço criado! 🎉'),
        description: username
          ? prefT('Seu @ é @{username}', { username })
          : prefT('Seu cantinho está pronto')
      });

      navigate(`/c/${shareCode}`);
    } catch {
      toast({
        title: prefT('Erro ao criar espaço'),
        description: prefT('Tente novamente'),
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    navigate('/');
  };

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center gap-2 animate-fade-in">
              <Heart className="w-5 h-5 text-primary animate-pulse" />
              {step === 'profile'
                ? prefT('Crie seu perfil')
                : prefT('Crie seu código')}
            </DialogTitle>
            <DialogDescription className="text-center animate-fade-in">
              {step === 'profile'
                ? prefT('Personalize como você aparecerá no app')
                : prefT('Código de 4 dígitos para entrar em outros dispositivos')
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {step === 'profile' ? (
              <>
                {/* Name Input */}
                <div className="space-y-2 animate-fade-in">
                  <label className="text-sm font-medium text-muted-foreground">{prefT('Seu nome')}</label>
                  <Input
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onBlur={handleNameBlur}
                    placeholder={prefT('Como você quer ser chamado(a)?')}
                    className="text-center text-lg"
                    autoFocus
                    maxLength={20}
                  />
                  {showCompliment && (
                    <div className="h-6 flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary animate-spin-slow" />
                      <span className="text-sm text-primary font-medium">{compliment}</span>
                    </div>
                  )}
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
                <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-muted/50">
                  <div 
                    className="w-14 h-14 rounded-full overflow-hidden ring-4"
                    style={{ boxShadow: `0 0 0 4px ${color}` }}
                  >
                    <Avatar
                      avatarIndex={avatarIndex}
                      size="md"
                      className="w-14 h-14"
                      selected
                      animateOnHover={false}
                      showBackground={false}
                    />
                  </div>
                  <span className="font-semibold text-lg">{name.trim() || prefT('Seu nome')}</span>
                </div>

                <Button 
                  onClick={handleNextStep} 
                  disabled={!name.trim() || !isValidName(name)} 
                  className="w-full"
                >
                  {prefT('Continuar')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            ) : step === 'pin' ? (
              <>
                {/* PIN Step */}
                <div className="flex flex-col items-center gap-6 animate-fade-in">
                  <div 
                    className="w-20 h-20 rounded-full overflow-hidden ring-4 animate-cat-idle"
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
                    {/* Editable Username */}
                    {editingUsername ? (
                      <div className="mt-2 flex items-center gap-2 justify-center">
                        <span className="text-muted-foreground">@</span>
                        <Input
                          value={username}
                          onChange={(e) => {
                            setUsername(e.target.value.replace(/[@\s]/g, '').toLowerCase());
                            setUsernameError('');
                          }}
                          onBlur={() => {
                            setEditingUsername(false);
                            checkUsernameAvailability(username);
                          }}
                          className="w-32 h-8 text-sm"
                          autoFocus
                          maxLength={20}
                        />
                        {checkingUsername && <Loader2 className="w-4 h-4 animate-spin" />}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => setEditingUsername(true)}
                          className="text-sm text-muted-foreground flex items-center justify-center gap-1 hover:text-foreground transition-colors"
                        >
                          <AtSign className="w-3 h-3" />
                          {generatingUsername ? (
                            <span className="flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              {prefT('Gerando seu @...')}
                            </span>
                          ) : (
                            <span>{username || prefT('Clique para definir')}</span>
                          )}
                        </button>
                        <span className="text-xs text-muted-foreground/60">{prefT('Toque para personalizar')}</span>
                      </div>
                    )}
                    {usernameError && (
                      <p className="text-xs text-destructive mt-1">{usernameError}</p>
                    )}
                  </div>

                  {/* PIN Input */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Lock className="w-4 h-4" />
                      <span>{prefT('Crie um código pessoal')}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <InputOTP maxLength={4} value={pinCode} onChange={handlePinChange}>
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
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    
                    {pinError && <p className="text-sm text-destructive">{pinError}</p>}
                  </div>

                  <div className="flex gap-2 w-full">
                    <Button variant="ghost" onClick={() => setStep('profile')} className="flex-1" disabled={creating}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      {prefT('Voltar')}
                    </Button>
                    <Button
                      onClick={handlePinComplete}
                      disabled={pinCode.length !== 4 || !!pinError || !!usernameError || creating}
                      className="flex-1"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {prefT('Criando...')}
                        </>
                      ) : (
                        <>
                          <Heart className="w-4 h-4 mr-2" />
                          {prefT('Criar espaço')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : null}

            {/* Email Step - DISABLED but kept for future use */}
            {false && (
              <>
                {/* Email Step */}
                <div className="flex flex-col items-center gap-6 animate-fade-in">
                  <div 
                    className="w-20 h-20 rounded-full overflow-hidden ring-4"
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
                  </div>

                  {/* Email Input */}
                  <div className="flex flex-col items-center gap-2 w-full">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Mail className="w-4 h-4" />
                      <span>{prefT('E-mail para recuperação')}</span>
                    </div>
                    
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError('');
                      }}
                      placeholder={prefT('seu@email.com')}
                      className="text-center"
                    />
                    
                    {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                    
                    {!emailError && (
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        {prefT('Se esquecer seu código, enviaremos um link de recuperação')}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 w-full">
                    <Button variant="ghost" onClick={() => setStep('pin')} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      {prefT('Voltar')}
                    </Button>
                    <Button 
                      onClick={handleComplete} 
                      className="flex-1"
                      disabled={creating}
                    >
                      {creating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {prefT('Criando...')}
                        </>
                      ) : (
                        <>
                          <Heart className="w-4 h-4 mr-2" />
                          {prefT('Criar espaço')}
                        </>
                      )}
                    </Button>
                  </div>

                  <Button
                    variant="link"
                    onClick={handleSkipEmail}
                    className="text-muted-foreground"
                    disabled={creating}
                  >
                    <SkipForward className="w-4 h-4 mr-2" />
                    {prefT('Pular esta etapa')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
