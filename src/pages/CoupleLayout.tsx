import { useState, useEffect } from 'react';
import { Outlet, useParams, Navigate, useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { OnboardingModal } from '@/components/OnboardingModal';
import { useCouple } from '@/hooks/useCouple';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CAT_AVATARS } from '@/lib/constants';

export default function CoupleLayout() {
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const { couple, loading, error, updateProfile, refetch } = useCouple();
  const { loading: authLoading, isValidated, coupleId, validateShareCode } = useAuthContext();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [myPosition, setMyPosition] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate share code when accessing a couple space
  useEffect(() => {
    const doValidation = async () => {
      if (!shareCode || authLoading) return;
      
      // Check if we need validation
      const needsValidation = !isValidated || !coupleId;
      
      if (needsValidation) {
        setValidating(true);
        setValidationError(null);
        
        const result = await validateShareCode(shareCode);
        
        if (!result.success) {
          setValidationError(result.error || 'Falha na validação');
        }
        
        setValidating(false);
      }
    };
    
    doValidation();
  }, [shareCode, authLoading, isValidated, coupleId, validateShareCode]);

  // Check for existing device recognition or show onboarding
  useEffect(() => {
    if (couple && shareCode && isValidated && coupleId === couple.id) {
      const stored = localStorage.getItem(`couple_${shareCode}`);
      if (stored) {
        try {
          const data = JSON.parse(stored);
          setMyPosition(data.position);
          setShowOnboarding(false);
        } catch {
          // Invalid stored data, show onboarding
          setShowOnboarding(true);
        }
      } else {
        // First time visiting - always show onboarding for new users
        setShowOnboarding(true);
      }
    }
  }, [couple, shareCode, isValidated, coupleId]);

  const handleOnboardingComplete = async (position: number, name: string, avatarIndex: number, color: string) => {
    const profile = couple?.profiles.find(p => p.position === position);
    if (profile) {
      await updateProfile(profile.id, { name, avatar_index: avatarIndex, color });
      await refetch();
    }
    setMyPosition(position);
    setShowOnboarding(false);
  };

  if (!shareCode) {
    return <Navigate to="/" replace />;
  }

  // Loading states with animated cats
  if (authLoading || loading || validating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="flex gap-2">
            <img 
              src={CAT_AVATARS[0]} 
              alt="" 
              className="w-12 h-12 rounded-full shadow-lg animate-bounce-gentle" 
            />
            <img 
              src={CAT_AVATARS[1]} 
              alt="" 
              className="w-12 h-12 rounded-full shadow-lg animate-bounce-gentle" 
              style={{ animationDelay: '200ms' }}
            />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {validating ? 'Validando acesso...' : 'Carregando...'}
          </p>
        </div>
      </div>
    );
  }

  // Error states
  if (validationError || error || !couple) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            {validationError ? 'Acesso negado' : 'Espaço não encontrado'}
          </h1>
          <p className="text-muted-foreground mb-6">
            {validationError || 'O código pode estar incorreto ou o espaço foi removido.'}
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('/')} className="w-full">
              Voltar ao início
            </Button>
            {validationError && (
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Don't show content until validated
  if (!isValidated || coupleId !== couple.id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="flex gap-2">
            <img 
              src={CAT_AVATARS[0]} 
              alt="" 
              className="w-12 h-12 rounded-full shadow-lg animate-bounce-gentle" 
            />
            <img 
              src={CAT_AVATARS[1]} 
              alt="" 
              className="w-12 h-12 rounded-full shadow-lg animate-bounce-gentle" 
              style={{ animationDelay: '200ms' }}
            />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Validando acesso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Outlet context={{ couple, myPosition }} />
      <BottomNav />
      
      {/* Onboarding Modal - Forces profile creation before accessing the space */}
      <OnboardingModal
        open={showOnboarding}
        onComplete={handleOnboardingComplete}
        profiles={couple.profiles}
        shareCode={shareCode}
      />
    </div>
  );
}
