import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { devLog } from '@/lib/validation';

interface AuthState {
  user: User | null;
  session: Session | null;
  coupleId: string | null;
  loading: boolean;
  isValidated: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    coupleId: null,
    loading: true,
    isValidated: false,
  });

  // Initialize auth and sign in anonymously if needed
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        devLog('Auth state changed:', event);
        
        const coupleId = session?.user?.app_metadata?.couple_id || null;
        
        setAuthState({
          user: session?.user ?? null,
          session,
          coupleId,
          loading: false,
          isValidated: !!coupleId,
        });
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const coupleId = session.user?.app_metadata?.couple_id || null;
        setAuthState({
          user: session.user,
          session,
          coupleId,
          loading: false,
          isValidated: !!coupleId,
        });
      } else {
        // Sign in anonymously
        supabase.auth.signInAnonymously().then(({ data, error }) => {
          if (error) {
            devLog('Anonymous sign-in failed:', error.message);
            setAuthState(prev => ({ ...prev, loading: false }));
          } else {
            devLog('Signed in anonymously');
            setAuthState({
              user: data.user,
              session: data.session,
              coupleId: null,
              loading: false,
              isValidated: false,
            });
          }
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Validate share code and set couple_id in JWT claims
  const validateShareCode = useCallback(async (shareCode: string): Promise<{ success: boolean; error?: string; coupleId?: string }> => {
    try {
      devLog('Validating share code:', shareCode);
      
      const { data, error } = await supabase.functions.invoke('validate-share-code', {
        body: { share_code: shareCode },
      });

      if (error) {
        devLog('Share code validation failed:', error.message);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        devLog('Share code validation returned error:', data.error);
        return { success: false, error: data.error || 'Validation failed' };
      }

      devLog('Share code validated, refreshing session...');

      // Refresh the session to get the updated JWT with couple_id
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        devLog('Session refresh failed:', refreshError.message);
        return { success: false, error: 'Failed to refresh session' };
      }

      // Update local state with the new session data
      if (refreshData.session) {
        const newCoupleId = refreshData.session.user?.app_metadata?.couple_id || null;
        devLog('Session refreshed, new couple_id:', newCoupleId);
        
        setAuthState({
          user: refreshData.session.user,
          session: refreshData.session,
          coupleId: newCoupleId,
          loading: false,
          isValidated: !!newCoupleId,
        });
      }

      devLog('Share code validated successfully');
      return { success: true, coupleId: data.couple_id };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      devLog('Share code validation error:', message);
      return { success: false, error: message };
    }
  }, []);

  // Check if the current session has access to a specific couple_id
  const hasAccessToCouple = useCallback((coupleId: string): boolean => {
    return authState.coupleId === coupleId;
  }, [authState.coupleId]);

  // Clear the couple validation (for switching spaces)
  const clearValidation = useCallback(async () => {
    // Sign out and sign in anonymously again to clear the couple_id claim
    await supabase.auth.signOut();
    const { data, error } = await supabase.auth.signInAnonymously();
    
    if (error) {
      devLog('Re-authentication failed:', error.message);
    } else {
      setAuthState({
        user: data.user,
        session: data.session,
        coupleId: null,
        loading: false,
        isValidated: false,
      });
    }
  }, []);

  return {
    ...authState,
    validateShareCode,
    hasAccessToCouple,
    clearValidation,
  };
}
