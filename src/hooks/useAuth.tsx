import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  isRecoveryFlow: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Verifica se o usuário é admin ou desenvolvedor (excluídos dos logs de sessão)
  const isAdminOrDeveloper = async (userId: string): Promise<boolean> => {
    try {
      const { data: adminRoles, error: adminError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (!adminError && adminRoles) {
        return true;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('function_id, functions(name)')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        return false;
      }

      if (profile?.functions?.name === 'Desenvolvedor') {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  };

  // Processa tokens de recuperação de senha na URL
  const processRecoveryTokens = () => {
    try {
      const currentUrl = window.location.href;
      const urlObj = new URL(currentUrl);

      const recoveryType = urlObj.searchParams.get('type');
      const hashParams = new URLSearchParams(urlObj.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const tokenType = hashParams.get('type');

      const isRecovery = recoveryType === 'recovery' || tokenType === 'recovery' || (accessToken && refreshToken);

      if (isRecovery) {
        setIsRecoveryFlow(true);

        if (accessToken && refreshToken) {
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          }).then(({ data, error }) => {
            if (!error) {
              setSession(data.session);
              setUser(data.session?.user || null);
              setIsRecoveryFlow(true);
            }
            const cleanUrl = `${window.location.origin}/auth?type=recovery`;
            window.history.replaceState({}, '', cleanUrl);
          });
        }

        return true;
      }

      return false;
    } catch {
      return false;
    }
  };

  // Marca usuário como online no sistema
  const setUserOnline = async (userId: string) => {
    if (!authInitialized) return;

    try {
      const shouldSkipLogging = await isAdminOrDeveloper(userId);
      if (shouldSkipLogging) return;

      try {
        await supabase.rpc('set_user_online', { user_id_param: userId });
      } catch {
        // RPC não encontrada — continua sem erro
      }
    } catch (error) {
      logger.error('Erro ao marcar usuário como online:', error);
    }
  };

  const setUserOffline = async (userId: string) => {
    if (!authInitialized) return;

    try {
      const shouldSkipLogging = await isAdminOrDeveloper(userId);
      if (shouldSkipLogging) return;

      try {
        await supabase.rpc('set_user_offline', { user_id_param: userId });
      } catch {
        // RPC não encontrada — continua sem erro
      }
    } catch (error) {
      logger.error('Erro ao marcar usuário como offline:', error);
    }
  };

  const startSessionLog = async (userId: string) => {
    if (!authInitialized) return;

    try {
      const shouldSkipLogging = await isAdminOrDeveloper(userId);
      if (shouldSkipLogging) return;

      const { data, error } = await supabase
        .from('user_session_logs')
        .insert({
          user_id: userId,
          user_agent: navigator.userAgent,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        logger.error('Erro ao registrar início de sessão:', error);
      } else if (data) {
        localStorage.setItem('currentSessionId', data.id);
      }
    } catch (error) {
      logger.error('Erro inesperado ao registrar início de sessão:', error);
    }
  };

  const endSessionLog = async () => {
    if (!authInitialized) return;

    try {
      const sessionId = localStorage.getItem('currentSessionId');
      if (sessionId) {
        try {
          await supabase.rpc('end_user_session', { session_id: sessionId });
        } catch {
          // RPC não encontrada — continua sem erro
        }
        localStorage.removeItem('currentSessionId');
      }
    } catch (error) {
      logger.error('Erro ao finalizar sessão:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const hasRecoveryTokens = processRecoveryTokens();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (!mounted) return;

            setSession(session);
            setUser(session?.user ?? null);

            if (event === 'SIGNED_IN' && session?.user) {
              setTimeout(() => {
                if (mounted && authInitialized) {
                  setUserOnline(session.user.id);
                  startSessionLog(session.user.id);
                }
              }, 100);

            } else if (event === 'SIGNED_OUT') {
              setIsRecoveryFlow(false);

              const currentUser = user;
              if (currentUser && mounted && authInitialized) {
                setTimeout(() => {
                  setUserOffline(currentUser.id);
                  endSessionLog();
                }, 100);
              }
            }
          }
        );

        if (!hasRecoveryTokens) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted && session?.user) {
              setSession(session);
              setUser(session.user);

              setTimeout(() => {
                if (mounted) {
                  setAuthInitialized(true);
                  setUserOnline(session.user.id);
                  const existingSessionId = localStorage.getItem('currentSessionId');
                  if (!existingSessionId) {
                    startSessionLog(session.user.id);
                  }
                }
              }, 100);
            } else if (mounted) {
              setSession(null);
              setUser(null);
              setAuthInitialized(true);
            }
          } catch (sessionError) {
            logger.error('Erro ao verificar sessão:', sessionError);
            if (mounted) {
              setSession(null);
              setUser(null);
              setAuthInitialized(true);
            }
          }
        } else {
          setAuthInitialized(true);
        }

        if (mounted) {
          setLoading(false);
        }

        return () => {
          mounted = false;
          subscription.unsubscribe();
        };
      } catch (error) {
        logger.error('Erro na inicialização da autenticação:', error);
        if (mounted) {
          setLoading(false);
          setSession(null);
          setUser(null);
          setAuthInitialized(true);
        }
      }
    };

    const cleanup = initializeAuth();

    return () => {
      cleanup.then((cleanupFn) => {
        if (cleanupFn) cleanupFn();
      });
    };
  }, []);

  // Limpeza periódica de usuários offline e listener de fechamento de janela
  useEffect(() => {
    let cleanupInterval: NodeJS.Timeout;

    if (user && authInitialized) {
      cleanupInterval = setInterval(async () => {
        try {
          await supabase.rpc('cleanup_offline_users');
        } catch {
          // Ignora se RPC não existir
        }
      }, 60000);

      const handleBeforeUnload = () => {
        if (user) {
          const sessionId = localStorage.getItem('currentSessionId');
          if (sessionId) {
            try {
              supabase.rpc('end_user_session', { session_id: sessionId });
            } catch {
              // Ignora no unload
            }
            localStorage.removeItem('currentSessionId');
          }
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        if (cleanupInterval) {
          clearInterval(cleanupInterval);
        }
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [user?.id, authInitialized]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      logger.error('Erro crítico no login:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      return { error };
    } catch (error) {
      logger.error('Erro crítico no signup:', error);
      return { error };
    }
  };

  const signOut = async () => {
    const currentUser = user;
    if (currentUser && authInitialized) {
      setTimeout(() => {
        setUserOffline(currentUser.id);
        endSessionLog();
      }, 100);
    }

    setIsRecoveryFlow(false);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      logger.error('Erro no signOut:', error);
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (!error) {
        setIsRecoveryFlow(false);
      }

      return { error };
    } catch (error) {
      logger.error('Erro crítico ao atualizar senha:', error);
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updatePassword,
    isRecoveryFlow,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
