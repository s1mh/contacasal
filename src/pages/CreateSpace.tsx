import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSlotMasked } from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';
import { CAT_AVATARS, PERSON_COLORS } from '@/lib/constants';
import { Check, Heart, Sparkles, Lock, ArrowRight, ArrowLeft, Mail, SkipForward, AtSign, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePreferences } from '@/contexts/PreferencesContext';
import { SupportedCurrency } from '@/lib/preferences';

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
  const { locale, currency, setLocale, setCurrency, t } = usePreferences();
  
  const [step, setStep] = useState<'profile' | 'preferences' | 'pin' | 'email'>('profile');
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
  const [preferredLocale, setPreferredLocale] = useState(locale);
  const [preferredCurrency, setPreferredCurrency] = useState<SupportedCurrency>(currency);
  const [isLocaleTransitioning, setIsLocaleTransitioning] = useState(false);
  const nameCompliments = [
    t('Que nome lindo! 💕'),
    t('Adorável! ✨'),
    t('Amei esse nome! 🌟'),
    t('Combina com você! 💫'),
    t('Muito fofo! 🥰'),
    t('Perfeito! 💝'),
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
    } catch (err) {
      console.error('Error generating username:', err);
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
        setUsernameError(t('Este username já está em uso'));
      }
    } catch (err) {
      console.error('Error checking username:', err);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleNextStep = () => {
    if (name.trim() && isValidName(name)) {
      setStep('preferences');
    }
  };

  const handleLocaleChange = (value: string) => {
    const newLocale = value as typeof locale;
    setIsLocaleTransitioning(true);
    setPreferredLocale(newLocale);
    setLocale(newLocale);
    setTimeout(() => setIsLocaleTransitioning(false), 200);
  };

  const handleCurrencyChange = (value: string) => {
    const newCurrency = value as SupportedCurrency;
    setPreferredCurrency(newCurrency);
    setCurrency(newCurrency);
  };

  const handlePreferencesNext = () => {
    setStep('pin');
    generateUsername();
  };

  const handlePinChange = (value: string) => {
    setPinCode(value);
    setPinError('');
    if (value.length === 4) {
      const weakCheck = isWeakPin(value);
      if (weakCheck.weak) {
        setPinError(weakCheck.reason ? t(weakCheck.reason) : t('Código muito fraco'));
      }
    }
  };

  const handlePinComplete = () => {
    if (pinCode.length === 4) {
      const weakCheck = isWeakPin(pinCode);
      if (weakCheck.weak) {
        setPinError(weakCheck.reason ? t(weakCheck.reason) : t('Código muito fraco'));
        return;
      }
      setStep('email');
    }
  };

  const handleComplete = async () => {
    if (email.trim() && !isValidEmail(email)) {
      setEmailError(t('E-mail inválido'));
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
      // Create the couple space
      const { data, error } = await supabase.functions.invoke('create-couple', {
        body: {}
      });

      if (error || !data?.success || !data?.share_code) {
        throw new Error(data?.error || t('Falha ao criar espaço'));
      }

      const shareCode = data.share_code;
      const coupleId = data.couple_id;

      // Refresh session to get new couple_id claim
      await supabase.auth.refreshSession();

      // Find the first profile and update it with user data
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('couple_id', coupleId)
        .order('position')
        .limit(1);

      if (profiles && profiles.length > 0) {
        const formattedName = name.trim()
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        const updateData: Record<string, unknown> = {
          name: formattedName,
          avatar_index: avatarIndex,
          color,
          pin_code: pinCode,
        };

        if (email.trim()) {
          updateData.email = email.trim().toLowerCase();
        }

        if (username) {
          updateData.username = username;
        }

        await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', profiles[0].id);

        // Save to localStorage
        localStorage.setItem(`couple_${shareCode}`, JSON.stringify({
          position: 1,
          name: formattedName,
          avatarIndex,
          color,
          username,
          timestamp: Date.now()
        }));
      }

      toast({
        title: t('Espaço criado! 🎉'),
        description: username
          ? t('Seu @ é @{username}', { username })
          : t('Seu cantinho está pronto')
      });

      navigate(`/c/${shareCode}`);
    } catch (err) {
      console.error('Error creating space:', err);
      toast({
        title: t('Erro ao criar espaço'),
        description: t('Tente novamente'),
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
                ? t('Crie seu perfil')
                : step === 'preferences'
                ? t('Escolha idioma e moeda')
                : step === 'pin'
                ? t('Crie seu código')
                : t('Adicione seu e-mail')}
            </DialogTitle>
            <DialogDescription className="text-center animate-fade-in">
              {step === 'profile' 
                ? t('Personalize como você aparecerá no app')
                : step === 'preferences'
                ? t('Defina como valores e datas serão exibidos')
                : step === 'pin'
                ? t('Código de 4 dígitos para entrar em outros dispositivos')
                : t('Para recuperar seu código se esquecer (opcional)')
              }
            </DialogDescription>
          </DialogHeader>

          <div
            className={cn(
              "space-y-6 py-4 transition-opacity duration-300",
              isLocaleTransitioning && "opacity-0"
            )}
          >
            {step === 'profile' ? (
              <>
                {/* Name Input */}
                <div className="space-y-2 animate-fade-in">
                  <label className="text-sm font-medium text-muted-foreground">{t('Seu nome')}</label>
                  <Input
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onBlur={handleNameBlur}
                    placeholder={t('Como você quer ser chamado(a)?')}
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
                <div className="space-y-2 animate-fade-in">
                  <label className="text-sm font-medium text-muted-foreground">{t('Escolha seu gatinho')}</label>
                  <div className="grid grid-cols-4 gap-3">
                    {CAT_AVATARS.map((avatar, index) => (
                      <button
                        key={index}
                        onClick={() => setAvatarIndex(index + 1)}
                        className={cn(
                          "relative w-14 h-14 rounded-full overflow-hidden ring-2 transition-all",
                          avatarIndex === index + 1 
                            ? "ring-primary ring-offset-2 shadow-lg" 
                            : "ring-border hover:ring-primary/50"
                        )}
                      >
                        <img src={avatar} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover" />
                        {avatarIndex === index + 1 && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Check className="w-6 h-6 text-primary" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Selection */}
                <div className="space-y-2 animate-fade-in">
                  <label className="text-sm font-medium text-muted-foreground">{t('Sua cor')}</label>
                  <div className="flex gap-2 justify-center flex-wrap">
                    {PERSON_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setColor(c.value)}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all",
                          color === c.value 
                            ? "ring-2 ring-offset-2 ring-primary scale-125" 
                            : "hover:scale-110"
                        )}
                        style={{ backgroundColor: c.value }}
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
                    <img src={CAT_AVATARS[avatarIndex - 1]} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <span className="font-semibold text-lg">{name.trim() || t('Seu nome')}</span>
                </div>

                <Button 
                  onClick={handleNextStep} 
                  disabled={!name.trim() || !isValidName(name)} 
                  className="w-full"
                >
                  {t('Continuar')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            ) : step === 'preferences' ? (
              <>
                <div className="flex flex-col gap-6 animate-fade-in">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">{t('Idioma')}</label>
                    <Select value={preferredLocale} onValueChange={handleLocaleChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt-BR">{t('Português (Brasil)')}</SelectItem>
                        <SelectItem value="en-US">{t('English (US)')}</SelectItem>
                        <SelectItem value="es-ES">{t('Español')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">{t('Moeda')}</label>
                    <Select value={preferredCurrency} onValueChange={handleCurrencyChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">{t('Real (R$)')}</SelectItem>
                        <SelectItem value="USD">{t('Dólar (US$)')}</SelectItem>
                        <SelectItem value="EUR">{t('Euro (€)')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 w-full">
                    <Button variant="ghost" onClick={() => setStep('profile')} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      {t('Voltar')}
                    </Button>
                    <Button onClick={handlePreferencesNext} className="flex-1">
                      {t('Continuar')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </>
            ) : step === 'pin' ? (
              <>
                {/* PIN Step */}
                <div className="flex flex-col items-center gap-6 animate-fade-in">
                  <div 
                    className="w-20 h-20 rounded-full overflow-hidden ring-4"
                    style={{ boxShadow: `0 0 0 4px ${color}` }}
                  >
                    <img src={CAT_AVATARS[avatarIndex - 1]} alt="Preview" className="w-full h-full object-cover" />
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
                      <button
                        onClick={() => setEditingUsername(true)}
                        className="text-sm text-muted-foreground flex items-center justify-center gap-1 hover:text-foreground transition-colors"
                      >
                        <AtSign className="w-3 h-3" />
                        {generatingUsername ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {t('Gerando seu @...')}
                          </span>
                        ) : (
                          <span>{username || t('Clique para definir')}</span>
                        )}
                      </button>
                    )}
                    {usernameError && (
                      <p className="text-xs text-destructive mt-1">{usernameError}</p>
                    )}
                  </div>

                  {/* PIN Input */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Lock className="w-4 h-4" />
                      <span>{t('Crie um código pessoal')}</span>
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
                    <Button variant="ghost" onClick={() => setStep('preferences')} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      {t('Voltar')}
                    </Button>
                    <Button 
                      onClick={handlePinComplete} 
                      disabled={pinCode.length !== 4 || !!pinError || !!usernameError} 
                      className="flex-1"
                    >
                      {t('Continuar')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Email Step */}
                <div className="flex flex-col items-center gap-6 animate-fade-in">
                  <div 
                    className="w-20 h-20 rounded-full overflow-hidden ring-4"
                    style={{ boxShadow: `0 0 0 4px ${color}` }}
                  >
                    <img src={CAT_AVATARS[avatarIndex - 1]} alt="Preview" className="w-full h-full object-cover" />
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
                      <span>{t('E-mail para recuperação')}</span>
                    </div>
                    
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError('');
                      }}
                      placeholder={t('seu@email.com')}
                      className="text-center"
                    />
                    
                    {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                    
                    {!emailError && (
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        {t('Se esquecer seu código, enviaremos um link de recuperação')}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 w-full">
                    <Button variant="ghost" onClick={() => setStep('pin')} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      {t('Voltar')}
                    </Button>
                    <Button 
                      onClick={handleComplete} 
                      className="flex-1"
                      disabled={creating}
                    >
                      {creating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('Criando...')}
                        </>
                      ) : (
                        <>
                          <Heart className="w-4 h-4 mr-2" />
                          {t('Criar espaço')}
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
                    {t('Pular esta etapa')}
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
