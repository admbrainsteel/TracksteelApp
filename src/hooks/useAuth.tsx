// Hook de autenticação usando Logto (sem Supabase Auth)
// Mantém a MESMA shape do useAuth original pra não quebrar consumers

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  LogtoUser,
  signIn as logtoSignIn,
  signOut as logtoSignOut,
  getUser as logtoGetUser,
  handleCallback,
  isAuthenticated,
  requestPasswordReset,
} from '@/lib/logto/client';

// Sincroniza user Logto com profiles Supabase e retorna o UUID real do Supabase
async function syncUserToProfile(user: LogtoUser): Promise<string> {
  if (!user?.sub) return user.sub;
  const email = user.email || `${user.username || 'user'}@logto.local`;

  try {
    // 1. Tenta buscar o perfil existente pelo email
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    let profileId = existing?.id;

    // 2. Se existe, atualizamos o nome e retornamos o UUID
    if (profileId) {
      const name = user.name || user.username;
      if (name) {
        await supabase.from('profiles').update({
          full_name: name,
        }).eq('id', profileId);
      }
      return profileId;
    }

    // 3. Se não existir, criamos um novo com um UUID gerado
    profileId = crypto.randomUUID();
    const { error: insertError } = await supabase.from('profiles').insert({
      id: profileId,
      email: email,
      full_name: user.name || user.username || 'Usuário Logto',
    });

    if (insertError) {
      console.warn('Erro ao inserir novo profile no Supabase:', insertError);
      return user.sub;
    }

    return profileId;
  } catch (err) {
    console.warn('Erro ao sincronizar profile Supabase:', err);
    return user.sub;
  }
}

export interface UseAuthReturn {
  user: LogtoUser | null;
  loading: boolean;
  authInitialized: boolean;
  isRecoveryFlow: boolean;
  signIn: (email?: string, password?: string) => Promise<{ error: unknown }>;
  signUp: (email: string, password: string) => Promise<{ error: unknown }>;
  signOut: () => Promise<void>;
  updatePassword: (password: string) => Promise<{ error: unknown }>;
  handleCallback: () => Promise<boolean>;
}

const AuthContext = createContext<UseAuthReturn | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LogtoUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);
  const callbackHandled = useRef(false);

  // Detecta callback URL e processa
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('code')) {
      if (callbackHandled.current) return;
      callbackHandled.current = true;
      
      setLoading(true);
      handleCallback().then((ok) => {
        if (ok) {
          logtoGetUser().then(async (u) => {
            if (u) {
              const profileId = await syncUserToProfile(u);
              u.id = profileId;
            }
            setUser(u);
          });
        }
        setAuthInitialized(true);
        setLoading(false);
      });
    } else {
      setAuthInitialized(true);
      if (isAuthenticated()) {
        logtoGetUser().then(async (u) => {
          if (u) {
            const profileId = await syncUserToProfile(u);
            u.id = profileId;
          }
          setUser(u);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }
  }, []);

  const signIn = useCallback(async (_email?: string, _password?: string) => {
    try {
      await logtoSignIn();
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }, []);

  const signUp = useCallback(async (_email: string, _password: string) => {
    // Logto tem tela própria de signup (botão na página de login)
    await logtoSignIn();
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem('userLoginTime');
    setIsRecoveryFlow(false);
    await logtoSignOut();
  }, []);

  const updatePassword = useCallback(async (_password: string) => {
    return {
      error: new Error(
        'Para alterar senha, acesse as configurações da conta no Logto (gerenciado pelo IdP)'
      ),
    };
  }, []);

  const handleCallbackFn = useCallback(async (): Promise<boolean> => {
    return await handleCallback();
  }, []);

  const value: UseAuthReturn = {
    user,
    loading,
    authInitialized,
    isRecoveryFlow,
    signIn,
    signUp,
    signOut,
    updatePassword,
    handleCallback: handleCallbackFn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): UseAuthReturn {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { requestPasswordReset };