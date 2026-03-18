
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  // Buscar o perfil do usuário para verificar o status
  const { data: profile, isLoading: profileLoading, error } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Erro ao verificar perfil do usuário:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!user?.id,
    retry: 1, // Limitar tentativas de retry
    staleTime: 30000, // Cache por 30 segundos
  });

  // Mostrar loading enquanto carrega autenticação ou perfil
  if (loading || (user && profileLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // Se não há usuário, redirecionar para auth
  if (!user) {
    console.log('🚫 ProtectedRoute: Usuário não autenticado, redirecionando para /auth');
    return <Navigate to="/auth" replace />;
  }

  // Se há erro ao carregar perfil, permitir acesso (para evitar loop)
  if (error) {
    console.warn('⚠️ ProtectedRoute: Erro ao carregar perfil, permitindo acesso');
    return <>{children}</>;
  }

  // Se há usuário mas não conseguiu carregar o perfil ainda, mostrar loading
  if (!profile && !error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-muted-foreground">Verificando permissões...</div>
      </div>
    );
  }

  // SEGURANÇA: Verificar se o usuário tem status 'active'
  if (profile && profile.status !== 'active') {
    console.log('🚫 ProtectedRoute: Usuário com status inválido:', profile.status);
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4 p-8 max-w-md mx-auto">
          <div className="text-6xl">⏳</div>
          <h2 className="text-2xl font-semibold text-foreground">
            Aguardando Aprovação
          </h2>
          <p className="text-muted-foreground">
            Sua conta foi criada com sucesso, mas ainda precisa ser aprovada por um administrador. 
            Você receberá acesso assim que sua solicitação for analisada.
          </p>
          <div className="mt-6">
            <button 
              onClick={() => {
                supabase.auth.signOut();
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Fazer Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log('✅ ProtectedRoute: Usuário ativo autorizado, renderizando conteúdo');
  return <>{children}</>;
};
