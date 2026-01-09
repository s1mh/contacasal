import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  coupleId: string | null;
  loading: boolean;
  isValidated: boolean;
  validateShareCode: (shareCode: string) => Promise<{ success: boolean; error?: string; coupleId?: string }>;
  joinSpace: (shareCode: string) => Promise<{ success: boolean; error?: string; coupleId?: string; profileId?: string }>;
  hasAccessToCouple: (coupleId: string) => boolean;
  clearValidation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
