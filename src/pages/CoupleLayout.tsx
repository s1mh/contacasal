import { useState, useEffect, useRef } from 'react';
import { Outlet, useParams, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { OnboardingModal } from '@/components/OnboardingModal';
import { ReconnectModal } from '@/components/ReconnectModal';
import { SyncIndicator } from '@/components/SyncIndicator';
import { OnboardingGuide } from '@/components/OnboardingGuide';
import { WaitingForPartner } from '@/components/WaitingForPartner';
import { CoupleProvider, useCoupleContext, Profile } from '@/contexts/CoupleContext';
import { I18nProvider } from '@/contexts/I18nContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2, AlertCircle, RefreshCw, Trash2, UserX, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar } from '@/components/Avatar';
import { isConfiguredProfile } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SpaceInfo {
  coupleId: string;
  hasVacancy: boolean;
  currentMembers: number;
  maxMembers: number;
  hostName: string | null;
}

function CoupleLayoutContent() {
  const { shareCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const inviterFromUrl = searchParams.get('from');
  const { couple, loading, error, isSyncing, refetch } = useCoupleContext();
  const { loading: authLoading, isValidated, coupleId } = useAuthContext();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showReconnect, setShowReconnect] = useState(false);
  const [myPosition, setMyPosition] = useState<number | null>(null);
  const [validating, setValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isNewMember, setIsNewMember] = useState(false);
  const [profileNotFound, setProfileNotFound] = useState(false);
  const [storedProfileInfo, setStoredProfileInfo] = useState<{ name: string; position: number } | null>(null);
  const [spaceInfo, setSpaceInfo] = useState<SpaceInfo | null>(null);
  const [joiningSpace, setJoiningSpace] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [guideName, setGuideName] = useState('');
  const hasValidatedRef = useRef(false);
  const timestampUpdatedRef = useRef(false);

  // Step 1: Validate share code publicly (no auth required)
  useEffect(() => {
    const validatePublic = async () => {
      if (!shareCode || hasValidatedRef.current) return;
      
      hasValidatedRef.current = true;
      setValidating(true);
      setValidationError(null);
      
      try {
        const { data, error: fnError } = await supabase.functions.invoke('validate-share-code-public', {
          body: { share_code: shareCode },
        });
        
        if (fnError || !data?.success) {
          setValidationError(data?.error || 'Código inválido');
          setValidating(false);
          return;
        }
        
        setSpaceInfo({
          coupleId: data.couple_id,
          hasVacancy: data.has_vacancy,
          currentMembers: data.current_members,
          maxMembers: data.max_members,
          hostName: data.host_name
        });
        
        // Check if user has local access to this space
        const stored = localStorage.getItem(`couple_${shareCode}`);
        if (stored) {
          try {
            const localData = JSON.parse(stored);
            setMyPosition(localData.position);
            setValidating(false);
            return;
          } catch {
            // Invalid stored data
            localStorage.removeItem(`couple_${shareCode}`);
          }
        }
        
        // No local access - check if space has vacancy for new member
        if (data.has_vacancy) {
          setIsNewMember(true);
          setShowOnboarding(true);
        } else {
          setShowReconnect(true);
        }
        
        setValidating(false);
        
      } catch {
        setValidationError('Erro ao validar código');
        setValidating(false);
      }
    };
    
    validatePublic();
  }, [shareCode]);

  // Step 2: Check if stored profile still exists when couple data loads
  useEffect(() => {
    if (couple && shareCode && myPosition && !showOnboarding && !showReconnect) {
      const profileExists = couple.profiles.find(p =>
        p.position === myPosition && isConfiguredProfile(p)
      );
      
      if (!profileExists) {
        const stored = localStorage.getItem(`couple_${shareCode}`);
        if (stored) {
          try {
            const data = JSON.parse(stored);
            setStoredProfileInfo({ name: data.name, position: data.position });
            setProfileNotFound(true);
          } catch {
            localStorage.removeItem(`couple_${shareCode}`);
            setShowReconnect(true);
          }
        } else {
          setShowReconnect(true);
        }
      }
    }
  }, [couple, shareCode, myPosition, showOnboarding, showReconnect]);

  // Step 3: Update timestamp when accessing space (for "last accessed" feature)
  useEffect(() => {
    if (couple && shareCode && myPosition && !timestampUpdatedRef.current) {
      const stored = localStorage.getItem(`couple_${shareCode}`);
      if (stored) {
        try {
          const data = JSON.parse(stored);
          const now = Date.now();

          // Only update if more than 1 minute has passed
          if (!data.timestamp || now - data.timestamp > 60000) {
            localStorage.setItem(`couple_${shareCode}`, JSON.stringify({
              ...data,
              timestamp: now
            }));
          }
          timestampUpdatedRef.current = true;
        } catch {
          // Ignore
        }
      }
    }
  }, [couple, shareCode, myPosition]);

  // Show onboarding guide when space becomes ready (2+ members) and user hasn't seen it
  const cfgProfilesCount = couple?.profiles?.filter(isConfiguredProfile).length ?? 0;
  useEffect(() => {
    if (!couple || !shareCode || cfgProfilesCount < 2) return;
    if (localStorage.getItem(`onboarding_complete_${shareCode}`)) return;

    const pendingName = localStorage.getItem(`onboarding_pending_${shareCode}`);
    if (pendingName) {
      localStorage.removeItem(`onboarding_pending_${shareCode}`);
      setGuideName(pendingName);
      setShowGuide(true);
    }
  }, [couple, shareCode, cfgProfilesCount]);

  // Handler: Complete onboarding (sign in + join space)
  const handleOnboardingComplete = async (
    position: number, 
    name: string, 
    avatarIndex: number, 
    color: string, 
    pinCode: string, 
    email?: string, 
    username?: string
  ) => {
    if (!shareCode) return;
    
    setJoiningSpace(true);
    
    try {
      // Step 1: Ensure we have a session
      let session = (await supabase.auth.getSession()).data.session;
      
      if (!session) {
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
        if (authError) {
          throw new Error('Falha na autenticação: ' + authError.message);
        }
        session = authData.session;
      }
      
      if (!session) {
        throw new Error('Não foi possível criar sessão');
      }
      
      // Step 2: Call join-and-activate with all data
      const { data: joinResult, error: joinError } = await supabase.functions.invoke('join-and-activate', {
        body: {
          share_code: shareCode,
          name,
          avatar_index: avatarIndex,
          color,
          pin_code: pinCode,
          email: email || null,
          username: username || null,
        },
      });
      
      if (joinError || !joinResult?.success) {
        throw new Error(joinResult?.error || 'Falha ao entrar no espaço');
      }
      
      // Step 3: Refresh session to get updated JWT with couple_id
      await supabase.auth.refreshSession();
      
      // Step 4: Save to localStorage
      localStorage.setItem(`couple_${shareCode}`, JSON.stringify({
        position: joinResult.position,
        name,
        avatarIndex,
        color,
        username,
        timestamp: Date.now()
      }));
      
      setMyPosition(joinResult.position);
      setShowOnboarding(false);
      await refetch();

      toast({
        title: 'Bem-vindo! 🎉',
        description: username ? `Seu @ é @${username}` : 'Seu perfil foi criado'
      });

      // Mark that this user just joined - guide will show when space is ready (2+ members)
      localStorage.setItem(`onboarding_pending_${shareCode}`, name);
      
    } catch (err) {
      toast({
        title: 'Ops! Algo deu errado 😕',
        description: err instanceof Error ? err.message : 'Não foi possível criar o perfil',
        variant: 'destructive'
      });
    } finally {
      setJoiningSpace(false);
    }
  };

  const handleReconnect = async (profile: Profile, pin: string): Promise<boolean> => {
    // PIN verification is done via edge function in ReconnectModal
    // This function just handles the localStorage and state update
    
    localStorage.setItem(`couple_${shareCode}`, JSON.stringify({
      position: profile.position,
      name: profile.name,
      avatarIndex: profile.avatar_index,
      color: profile.color,
      username: (profile as Profile & { username?: string }).username,
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

  const handleRemoveAccess = () => {
    if (shareCode) {
      localStorage.removeItem(`couple_${shareCode}`);
    }
    setProfileNotFound(false);
    navigate('/');
  };

  const handleReconnectFromNotFound = () => {
    if (shareCode) {
      localStorage.removeItem(`couple_${shareCode}`);
    }
    setProfileNotFound(false);
    setShowReconnect(true);
  };

  const handleCreateNewFromReconnect = () => {
    if (!spaceInfo?.hasVacancy) {
      toast({
        title: 'Espaço cheio',
        description: 'Não há vagas disponíveis',
        variant: 'destructive'
      });
      return;
    }
    setShowReconnect(false);
    setIsNewMember(true);
    setShowOnboarding(true);
  };

  const handleCloseOnboarding = () => {
    navigate('/');
  };

  if (!shareCode) {
    return <Navigate to="/" replace />;
  }

  // Loading states
  if (validating || (loading && myPosition)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="flex gap-2">
            <Avatar avatarIndex={1} size="md" shadow animated animateOnHover={false} />
            <Avatar avatarIndex={2} size="md" shadow animated animateOnHover={false} className="[animation-delay:200ms]" />
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
  if (validationError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Acesso negado
          </h1>
          <p className="text-muted-foreground mb-6">
            {validationError}
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('/')} className="w-full">
              Voltar ao início
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                hasValidatedRef.current = false;
                window.location.reload();
              }}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show onboarding or reconnect modals without couple data
  if (!couple && (showOnboarding || showReconnect)) {
    return (
      <div className="min-h-screen bg-background">
        <OnboardingModal
          open={showOnboarding}
          onClose={handleCloseOnboarding}
          onComplete={handleOnboardingComplete}
          profiles={[]}
          shareCode={shareCode}
          isNewMember={isNewMember}
          hostName={inviterFromUrl || spaceInfo?.hostName}
          isJoining={joiningSpace}
        />
        
        <ReconnectModal
          open={showReconnect}
          profiles={[]}
          onReconnect={handleReconnect}
          onCreateNew={handleCreateNewFromReconnect}
          shareCode={shareCode}
          hasVacancy={spaceInfo?.hasVacancy}
        />
      </div>
    );
  }

  // Waiting for couple data with position set
  if (!couple && myPosition) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando espaço...</p>
        </div>
      </div>
    );
  }

  // No couple and no modals to show
  if (!couple) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Espaço não encontrado
          </h1>
          <p className="text-muted-foreground mb-6">
            O código pode estar incorreto ou o espaço foi removido.
          </p>
          <Button onClick={() => navigate('/')} className="w-full">
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  // Check if space has at least 2 configured profiles before unlocking app
  const configuredProfiles = couple.profiles.filter(isConfiguredProfile);
  const myProfile = couple.profiles.find(p => p.position === myPosition);
  const spaceReady = configuredProfiles.length >= 2;

  if (!spaceReady && myProfile && isConfiguredProfile(myProfile)) {
    return (
      <div className="min-h-screen bg-background">
        <SyncIndicator isSyncing={isSyncing} />
        <WaitingForPartner
          shareCode={shareCode!}
          myProfile={myProfile}
        />

        {/* Onboarding Modal (still needed for new members joining) */}
        <OnboardingModal
          open={showOnboarding}
          onClose={handleCloseOnboarding}
          onComplete={handleOnboardingComplete}
          profiles={couple.profiles}
          shareCode={shareCode}
          isNewMember={isNewMember}
          hostName={inviterFromUrl || spaceInfo?.hostName}
          isJoining={joiningSpace}
        />

        <ReconnectModal
          open={showReconnect}
          profiles={couple.profiles}
          onReconnect={handleReconnect}
          onCreateNew={handleCreateNewFromReconnect}
          shareCode={shareCode}
          hasVacancy={spaceInfo?.hasVacancy}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <SyncIndicator isSyncing={isSyncing} />
      <Outlet context={{ couple, myPosition }} />
      <BottomNav />
      
      {/* Profile Not Found Modal */}
      <Dialog open={profileNotFound} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-destructive" />
              Perfil não encontrado
            </DialogTitle>
            <DialogDescription>
              O perfil <span className="font-semibold">"{storedProfileInfo?.name}"</span> foi removido deste espaço.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <Button 
              variant="destructive"
              onClick={handleRemoveAccess}
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remover acesso e voltar
            </Button>
            <Button 
              variant="outline" 
              onClick={handleReconnectFromNotFound}
              className="w-full"
            >
              Reconectar como outro perfil
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Onboarding Modal */}
      <OnboardingModal
        open={showOnboarding}
        onClose={handleCloseOnboarding}
        onComplete={handleOnboardingComplete}
        profiles={couple.profiles}
        shareCode={shareCode}
        isNewMember={isNewMember}
        hostName={inviterFromUrl || spaceInfo?.hostName}
        isJoining={joiningSpace}
      />

      {/* Reconnect Modal */}
      <ReconnectModal
        open={showReconnect}
        profiles={couple.profiles}
        onReconnect={handleReconnect}
        onCreateNew={handleCreateNewFromReconnect}
        shareCode={shareCode}
        hasVacancy={spaceInfo?.hasVacancy}
      />

      {/* Onboarding Guide */}
      {showGuide && shareCode && (
        <OnboardingGuide
          shareCode={shareCode}
          userName={guideName}
          onComplete={() => setShowGuide(false)}
        />
      )}
    </div>
  );
}

export default function CoupleLayout() {
  const { shareCode } = useParams();

  if (!shareCode) {
    return <Navigate to="/" replace />;
  }

  return (
    <I18nProvider shareCode={shareCode}>
      <CoupleProvider shareCode={shareCode}>
        <CoupleLayoutContent />
      </CoupleProvider>
    </I18nProvider>
  );
}
