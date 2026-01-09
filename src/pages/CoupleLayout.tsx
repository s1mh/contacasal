import { useState, useEffect } from 'react';
import { Outlet, useParams, Navigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { OnboardingModal } from '@/components/OnboardingModal';
import { useCouple } from '@/hooks/useCouple';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function CoupleLayout() {
  const { shareCode } = useParams();
  const { couple, loading, error, updateProfile } = useCouple();
  const { loading: authLoading, isValidated, coupleId, validateShareCode } = useAuthContext();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [myPosition, setMyPosition] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate share code when accessing a couple space
  useEffect(() => {
    const doValidation = async () => {
      if (!shareCode || authLoading) return;
      
      // Always validate if not validated, or if the couple_id doesn't match what we expect
      // This ensures each device/session gets proper validation
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

  // Check for existing device recognition
  useEffect(() => {
    if (couple && shareCode && isValidated && coupleId === couple.id) {
      const stored = localStorage.getItem(`couple_${shareCode}`);
      if (stored) {
        const data = JSON.parse(stored);
        setMyPosition(data.position);
        setShowOnboarding(false);
      } else {
        // First time visiting - show onboarding
        setShowOnboarding(true);
      }
    }
  }, [couple, shareCode, isValidated, coupleId]);

  const handleOnboardingComplete = async (position: number, name: string, avatarIndex: number, color: string) => {
    const profile = couple?.profiles.find(p => p.position === position);
    if (profile) {
      await updateProfile(profile.id, { name, avatar_index: avatarIndex, color });
    }
    setMyPosition(position);
    setShowOnboarding(false);
  };

  if (!shareCode) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || loading || validating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {validating ? 'Validando acesso...' : 'Carregando...'}
          </p>
        </div>
      </div>
    );
  }

  if (validationError || error || !couple) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground mb-2">
            {validationError ? 'Acesso negado' : 'Espaço não encontrado'}
          </h1>
          <p className="text-muted-foreground mb-4">
            {validationError || 'O código pode estar incorreto ou o espaço foi removido.'}
          </p>
          <a href="/" className="text-primary hover:underline">
            Voltar ao início
          </a>
        </div>
      </div>
    );
  }

  // Don't show content until validated
  if (!isValidated || coupleId !== couple.id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Validando acesso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Outlet context={{ couple, myPosition }} />
      <BottomNav />
      
      {/* Onboarding Modal */}
      <OnboardingModal
        open={showOnboarding}
        onComplete={handleOnboardingComplete}
        profiles={couple.profiles}
        shareCode={shareCode}
      />
    </div>
  );
}
