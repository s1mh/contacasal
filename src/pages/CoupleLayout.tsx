import { useState, useEffect } from 'react';
import { Outlet, useParams, Navigate, useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { OnboardingModal } from '@/components/OnboardingModal';
import { ReconnectModal } from '@/components/ReconnectModal';
import { SyncIndicator } from '@/components/SyncIndicator';
import { CoupleProvider, useCoupleContext, Profile } from '@/contexts/CoupleContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CAT_AVATARS } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

function CoupleLayoutContent() {
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { couple, loading, error, isSyncing, updateProfile, refetch } = useCoupleContext();
  const { loading: authLoading, isValidated, coupleId, validateShareCode, joinSpace } = useAuthContext();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showReconnect, setShowReconnect] = useState(false);
  const [myPosition, setMyPosition] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [newProfileId, setNewProfileId] = useState<string | null>(null);
  const [isNewMember, setIsNewMember] = useState(false);

  // Validate share code when accessing a couple space
  useEffect(() => {
    const doValidation = async () => {
      if (!shareCode || authLoading) return;
      
      setValidating(true);
      setValidationError(null);
      
      // Always validate the share code to check membership for THIS specific space
      const validateResult = await validateShareCode(shareCode);
      
      if (!validateResult.success) {
        // Validation failed completely
        setValidationError(validateResult.error || 'Código inválido');
        setValidating(false);
        return;
      }
      
      if (validateResult.isMember) {
        // User is already a member of this space - just proceed
        console.log('User is already a member of this space');
        setValidating(false);
        return;
      }
      
      // Valid code but user is not a member yet - join as new member
      console.log('User is not a member - joining space');
      const joinResult = await joinSpace(shareCode);
      
      if (!joinResult.success) {
        setValidationError(joinResult.error || 'Falha ao entrar no espaço');
      } else if (joinResult.profileId) {
        // New member joined - store profile ID to show onboarding with welcome
        setNewProfileId(joinResult.profileId);
        setIsNewMember(true);
        console.log('New member joined with profile:', joinResult.profileId);
      }
      
      setValidating(false);
    };
    
    doValidation();
  }, [shareCode, authLoading, validateShareCode, joinSpace]);

  // Check for existing device recognition or show appropriate modal
  useEffect(() => {
    if (couple && shareCode && isValidated && coupleId === couple.id) {
      const stored = localStorage.getItem(`couple_${shareCode}`);
      if (stored) {
        try {
          const data = JSON.parse(stored);
          setMyPosition(data.position);
          setShowOnboarding(false);
          setShowReconnect(false);
        } catch {
          // Invalid stored data, check for configured profiles
          checkProfilesAndShowModal();
        }
      } else {
        // No local storage - check if there are configured profiles or if user just joined
        checkProfilesAndShowModal();
      }
    }
  }, [couple, shareCode, isValidated, coupleId, newProfileId]);

  const checkProfilesAndShowModal = () => {
    if (!couple) return;
    
    // If user just joined (has newProfileId), show onboarding for their new profile
    if (newProfileId) {
      const myProfile = couple.profiles.find(p => p.id === newProfileId);
      if (myProfile && (myProfile.name === 'Pessoa 1' || myProfile.name === 'Pessoa 2' || myProfile.name === 'Pessoa')) {
        setShowOnboarding(true);
        setShowReconnect(false);
        return;
      }
    }
    
    const configuredProfiles = couple.profiles.filter(p => 
      p.name !== 'Pessoa 1' && p.name !== 'Pessoa 2' && p.name !== 'Pessoa'
    );
    
    const unconfiguredProfiles = couple.profiles.filter(p => 
      p.name === 'Pessoa 1' || p.name === 'Pessoa 2' || p.name === 'Pessoa'
    );
    
    if (configuredProfiles.length > 0 && unconfiguredProfiles.length === 0) {
      // All profiles configured - show reconnect modal
      setShowReconnect(true);
      setShowOnboarding(false);
    } else if (unconfiguredProfiles.length > 0) {
      // Has unconfigured profiles - show onboarding
      setShowOnboarding(true);
      setShowReconnect(false);
    } else {
      // Fallback to reconnect
      setShowReconnect(true);
      setShowOnboarding(false);
    }
  };

  const handleOnboardingComplete = async (position: number, name: string, avatarIndex: number, color: string, pinCode: string, email?: string, username?: string) => {
    const profile = couple?.profiles.find(p => p.position === position);
    if (profile) {
      // Hash PIN on server - for now store plain, will be hashed on first verify
      const updateData: Record<string, unknown> = { 
        name, 
        avatar_index: avatarIndex, 
        color,
        pin_code: pinCode 
      };
      
      if (email) {
        updateData.email = email;
      }

      if (username) {
        updateData.username = username;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id);
      
      if (error) {
        console.error('Error updating profile:', error);
        toast({ 
          title: 'Ops! Algo deu errado 😕',
          description: 'Não foi possível criar o perfil',
          variant: 'destructive'
        });
        return;
      }
      
      await refetch();
    }
    setMyPosition(position);
    setShowOnboarding(false);
    
    // Show success toast after profile creation
    toast({ 
      title: 'Espaço criado! 🎉',
      description: username ? `Seu @ é @${username}` : 'Seu cantinho do casal está pronto'
    });
  };

  const handleReconnect = async (profile: Profile, pin: string): Promise<boolean> => {
    // PIN verification is now done via edge function in ReconnectModal
    // This function just handles the localStorage and state update
    
    // PIN correct - save to localStorage and proceed
    localStorage.setItem(`couple_${shareCode}`, JSON.stringify({
      position: profile.position,
      name: profile.name,
      avatarIndex: profile.avatar_index,
      color: profile.color,
      timestamp: Date.now()
    }));
    
    setMyPosition(profile.position);
    setShowReconnect(false);
    
    toast({ 
      title: `Bem-vindo de volta, ${profile.name}! 🎉`,
      description: 'Bom te ver novamente'
    });
    
    return true;
  };

  const handleCreateNewFromReconnect = () => {
    setShowReconnect(false);
    setShowOnboarding(true);
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

  const handleCloseOnboarding = () => {
    // Only allow closing if there are configured profiles (user can reconnect instead)
    const configuredProfiles = couple.profiles.filter(p => 
      p.name !== 'Pessoa 1' && p.name !== 'Pessoa 2' && p.name !== 'Pessoa'
    );
    
    if (configuredProfiles.length > 0) {
      setShowOnboarding(false);
      setShowReconnect(true);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <SyncIndicator isSyncing={isSyncing} />
      <Outlet context={{ couple, myPosition }} />
      <BottomNav />
      
      {/* Onboarding Modal - For first time profile creation */}
      <OnboardingModal
        open={showOnboarding}
        onClose={handleCloseOnboarding}
        onComplete={handleOnboardingComplete}
        profiles={couple.profiles}
        shareCode={shareCode}
        isNewMember={isNewMember}
      />

      {/* Reconnect Modal - For returning users on new devices */}
      <ReconnectModal
        open={showReconnect}
        profiles={couple.profiles}
        onReconnect={handleReconnect}
        onCreateNew={handleCreateNewFromReconnect}
        shareCode={shareCode}
      />
    </div>
  );
}

export default function CoupleLayout() {
  const { shareCode } = useParams();

  if (!shareCode) {
    return <Navigate to="/" replace />;
  }

  return (
    <CoupleProvider shareCode={shareCode}>
      <CoupleLayoutContent />
    </CoupleProvider>
  );
}