import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ArrowRight, Sparkles, Loader2, Users, AtSign, Lock, HelpCircle, Eye, EyeOff, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSlotMasked } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { CAT_AVATARS } from "@/lib/constants";
import { devLog } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { RecoveryModal } from "@/components/RecoveryModal";
import { usePreferences } from "@/contexts/PreferencesContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SupportedLocale } from "@/lib/i18n";

interface LastSpace {
  shareCode: string;
  position: number;
  name: string;
  avatarIndex: number;
  username?: string;
  timestamp?: number;
}

const LOCALE_LABELS: Record<SupportedLocale, { label: string; flag: string }> = {
  'pt-BR': { label: 'Português', flag: '🇧🇷' },
  'en-US': { label: 'English', flag: '🇺🇸' },
  'es-ES': { label: 'Español', flag: '🇪🇸' },
};

export default function Index() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loading: authLoading, clearValidation, validateShareCode } = useAuthContext();
  const { locale, setLocale, t } = usePreferences();
  const [loading, setLoading] = useState(false);
  const [existingCode, setExistingCode] = useState("");
  const [lastSpace, setLastSpace] = useState<LastSpace | null>(null);
  const [catsAnimating, setCatsAnimating] = useState(false);

  // Username login state
  const [showUsernameLogin, setShowUsernameLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [usernamePin, setUsernamePin] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showUsernamePin, setShowUsernamePin] = useState(false);

  // Check for saved space on mount - get the most recent one
  useEffect(() => {
    const spaces: LastSpace[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("couple_")) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || "{}");
          if (data.position && data.name) {
            spaces.push({
              shareCode: key.replace("couple_", ""),
              position: data.position,
              name: data.name,
              avatarIndex: data.avatarIndex || 1,
              username: data.username,
              timestamp: data.timestamp || 0,
            });
          }
        } catch (e) {
          // Ignore invalid data
        }
      }
    }
    
    // Sort by timestamp descending (most recent first)
    spaces.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    if (spaces.length > 0) {
      setLastSpace(spaces[0]);
    }
  }, []);

  // Animate cats on mount
  useEffect(() => {
    setCatsAnimating(true);
    const timer = setTimeout(() => setCatsAnimating(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleCreateSpace = () => {
    // Navigate to create page - space is created after profile is configured
    navigate("/create");
  };

  const handleJoinSpace = async () => {
    const code = existingCode.trim().toLowerCase();
    if (code) {
      setLoading(true);
      try {
        // Clear any existing validation before joining a new space
        await clearValidation();
        navigate(`/c/${code}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleContinue = async () => {
    if (lastSpace) {
      navigate(`/c/${lastSpace.shareCode}`);
    }
  };

  const handleUsernameLogin = async () => {
    if (!username.trim() || usernamePin.length !== 4) return;

    setUsernameLoading(true);
    setUsernameError("");

    try {
      const { data, error } = await supabase.functions.invoke("login-with-username", {
        body: {
          username: username.trim(),
          pin: usernamePin,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        setUsernameError(data.error || "Credenciais inválidas");
        setUsernamePin("");

        if (data.attempts_remaining !== undefined) {
          setAttemptsRemaining(data.attempts_remaining);
        }

        if (data.locked) {
          setLockedUntil(data.locked_until);
        }

        return;
      }

      // Success! Save to localStorage and navigate
      const shareCode = data.share_code;
      const profile = data.profile;

      localStorage.setItem(
        `couple_${shareCode}`,
        JSON.stringify({
          position: profile.position,
          name: profile.name,
          avatarIndex: profile.avatar_index,
          color: profile.color,
          username: username.trim().replace(/^@/, ""),
          timestamp: Date.now(),
        }),
      );

      // Validate the share code to set up the session
      await validateShareCode(shareCode);

      toast({
        title: `Bem-vindo de volta, ${profile.name}! 🎉`,
        description: "Bom te ver novamente",
      });

      navigate(`/c/${shareCode}`);
    } catch (err) {
      console.error("Username login error:", err);
      setUsernameError("Erro ao fazer login. Tente novamente.");
      setUsernamePin("");
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleUsernamePinChange = (value: string) => {
    setUsernamePin(value);
    setUsernameError("");

    // Auto-submit when 4 digits entered
    if (value.length === 4) {
      setTimeout(() => handleUsernameLogin(), 100);
    }
  };

  const formatLockedTime = (isoDate: string): string => {
    const lockDate = new Date(isoDate);
    const now = new Date();
    const diffMs = lockDate.getTime() - now.getTime();
    const diffMins = Math.ceil(diffMs / 60000);

    if (diffMins <= 0) return "agora";
    if (diffMins === 1) return "1 minuto";
    return `${diffMins} minutos`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="flex gap-2">
            <img
              src={CAT_AVATARS[0]}
              alt=""
              className="w-12 h-12 rounded-full shadow-lg animate-bounce-gentle"
              style={{ animationDelay: "0ms" }}
            />
            <img
              src={CAT_AVATARS[1]}
              alt=""
              className="w-12 h-12 rounded-full shadow-lg animate-bounce-gentle"
              style={{ animationDelay: "200ms" }}
            />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t('Preparando o amor...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative">
      {/* Language Selector - Top Right */}
      <div className="absolute top-4 right-4 animate-fade-in">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm">{LOCALE_LABELS[locale].flag}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.keys(LOCALE_LABELS) as SupportedLocale[]).map((loc) => (
              <DropdownMenuItem
                key={loc}
                onClick={() => setLocale(loc)}
                className={cn(
                  "gap-2 cursor-pointer",
                  locale === loc && "bg-accent"
                )}
              >
                <span>{LOCALE_LABELS[loc].flag}</span>
                <span>{LOCALE_LABELS[loc].label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="w-full max-w-sm">
        {/* Logo / Header */}
        <div className="text-center mb-8 animate-fade-slide-up">
          <div className="flex justify-center items-center gap-3 mb-4">
            <img
              src={CAT_AVATARS[0]}
              alt=""
              className={cn(
                "w-16 h-16 rounded-full shadow-lg transition-all duration-500",
                catsAnimating && "animate-jump",
              )}
            />
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Heart
                className={cn(
                  "w-5 h-5 text-primary fill-primary transition-transform",
                  catsAnimating && "animate-pulse",
                )}
              />
            </div>
            <img
              src={CAT_AVATARS[1]}
              alt=""
              className={cn(
                "w-16 h-16 rounded-full shadow-lg transition-all duration-500",
                catsAnimating && "animate-jump",
              )}
              style={{ animationDelay: "100ms" }}
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('Conta de Casal')}</h1>
          <p className="text-muted-foreground">{t('Dividam gastos com clareza')}</p>
        </div>

        {/* Continue as saved user - Vertical layout with avatar on top */}
        {lastSpace && !showUsernameLogin && (
          <button
            onClick={handleContinue}
            className="w-full mb-4 p-4 bg-card rounded-3xl border-2 border-primary/30 hover:border-primary shadow-lg transition-all duration-300 group animate-fade-slide-up hover:scale-[1.02]"
            style={{ animationDelay: "100ms" }}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-primary animate-bounce-gentle">
                <img
                  src={CAT_AVATARS[(lastSpace.avatarIndex || 1) - 1]}
                  alt={lastSpace.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('Continuar como')}</p>
                <p className="font-semibold text-lg">{lastSpace.name}</p>
                {lastSpace.username && (
                  <p className="text-sm text-muted-foreground">@{lastSpace.username}</p>
                )}
              </div>
            </div>
            <div className="flex justify-center mt-3">
              <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        )}

        {/* Username Login */}
        {showUsernameLogin ? (
          <div className="bg-card rounded-3xl p-6 shadow-lg border border-border/50 mb-4 animate-fade-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <AtSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">{t('Entrar com @')}</h2>
                <p className="text-xs text-muted-foreground">{t('Use seu username pessoal')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">@</span>
                <Input
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.replace(/[@\s]/g, "").toLowerCase());
                    setUsernameError("");
                  }}
                  placeholder="seu_username"
                  className="pl-8 text-left"
                  disabled={usernameLoading || !!lockedUntil}
                />
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span>{t('Código pessoal')}</span>
                </div>

                <div className="flex items-center gap-2">
                  <InputOTP
                    maxLength={4}
                    value={usernamePin}
                    onChange={handleUsernamePinChange}
                    disabled={usernameLoading || !!lockedUntil || !username.trim()}
                  >
                    <InputOTPGroup>
                      {showUsernamePin ? (
                        <>
                          <InputOTPSlot index={0} className="w-12 h-12 text-xl" />
                          <InputOTPSlot index={1} className="w-12 h-12 text-xl" />
                          <InputOTPSlot index={2} className="w-12 h-12 text-xl" />
                          <InputOTPSlot index={3} className="w-12 h-12 text-xl" />
                        </>
                      ) : (
                        <>
                          <InputOTPSlotMasked index={0} className="w-12 h-12 text-xl" />
                          <InputOTPSlotMasked index={1} className="w-12 h-12 text-xl" />
                          <InputOTPSlotMasked index={2} className="w-12 h-12 text-xl" />
                          <InputOTPSlotMasked index={3} className="w-12 h-12 text-xl" />
                        </>
                      )}
                    </InputOTPGroup>
                  </InputOTP>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowUsernamePin(!showUsernamePin)}
                    className="h-10 w-10"
                  >
                    {showUsernamePin ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>

                {usernameLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('Verificando...')}</span>
                  </div>
                )}

                {usernameError && (
                  <p className="text-sm text-destructive animate-fade-in text-center">{usernameError}</p>
                )}

                {attemptsRemaining !== null && attemptsRemaining > 0 && attemptsRemaining <= 3 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 animate-fade-in">
                    {attemptsRemaining} {attemptsRemaining > 1 ? t('tentativas restantes') : t('tentativa restante')}
                  </p>
                )}

                {lockedUntil && (
                  <p className="text-xs text-destructive animate-fade-in">
                    {t('Conta bloqueada por')} {formatLockedTime(lockedUntil)}
                  </p>
                )}
              </div>

              {/* Login Button */}
              <Button
                onClick={handleUsernameLogin}
                disabled={!username.trim() || usernamePin.length !== 4 || usernameLoading || !!lockedUntil}
                className="w-full"
              >
                {usernameLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('Entrando...')}
                  </>
                ) : (
                  <>
                    {t('Entrar')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              {/* Forgot PIN Link */}
              <Button
                variant="link"
                onClick={() => setShowRecovery(true)}
                className="text-muted-foreground text-sm"
                disabled={usernameLoading}
              >
                <HelpCircle className="w-4 h-4 mr-1" />
                {t('Esqueci meu código')}
              </Button>

              <Button
                variant="ghost"
                onClick={() => {
                  setShowUsernameLogin(false);
                  setUsername("");
                  setUsernamePin("");
                  setUsernameError("");
                  setAttemptsRemaining(null);
                  setLockedUntil(null);
                }}
                className="w-full"
              >
                {t('Voltar')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Create New Space */}
            <div
              className="bg-card rounded-3xl p-6 shadow-lg border border-border/50 mb-4 animate-fade-slide-up hover:shadow-xl transition-all duration-300"
              style={{ animationDelay: "200ms" }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">{t('Novo espaço')}</h2>
                  <p className="text-xs text-muted-foreground">{t('Crie um espaço para até 5 pessoas')}</p>
                </div>
              </div>
              <Button
                onClick={handleCreateSpace}
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12 transition-all duration-300 hover:scale-[1.02]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('Criando...')}
                  </>
                ) : (
                  <>
                    {t('Criar espaço')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>

            {/* Join Existing Space */}
            <div
              className="bg-card rounded-3xl p-6 shadow-lg border border-border/50 mb-4 animate-fade-slide-up hover:shadow-xl transition-all duration-300"
              style={{ animationDelay: "300ms" }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-secondary/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">{t('Entrar em espaço')}</h2>
                  <p className="text-xs text-muted-foreground">{t('Recebeu um código? Cole aqui')}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  value={existingCode}
                  onChange={(e) => setExistingCode(e.target.value.toLowerCase())}
                  placeholder={t('Cole o código aqui')}
                  className="flex-1 rounded-xl h-12 bg-muted border-0 transition-all duration-300 focus:ring-2 focus:ring-primary/50"
                  onKeyDown={(e) => e.key === "Enter" && handleJoinSpace()}
                />
                <Button
                  onClick={handleJoinSpace}
                  disabled={!existingCode.trim() || loading}
                  variant="outline"
                  className="rounded-xl h-12 px-4 transition-all duration-300 hover:scale-105"
                >
                  {t('Entrar')}
                </Button>
              </div>
            </div>

            {/* Login with Username */}
            <div className="animate-fade-slide-up" style={{ animationDelay: "400ms" }}>
              <Button
                variant="ghost"
                onClick={() => setShowUsernameLogin(true)}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                <AtSign className="w-4 h-4 mr-2" />
                {t('Entrar com seu @username')}
              </Button>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="text-center mt-8 animate-fade-in" style={{ animationDelay: "500ms" }}>
          <p className="text-xs text-muted-foreground">{t('Feito com 💕 para casais')}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">Feito por Samuel para o Juan</p>
        </div>
      </div>

      {/* Recovery Modal for username login */}
      <RecoveryModal open={showRecovery} onClose={() => setShowRecovery(false)} />
    </div>
  );
}
