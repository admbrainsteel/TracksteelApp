import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();

  const loading = authLoading || profileLoading;

  // Mostrar loading enquanto carrega autenticação
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // Se não há usuário, redirecionar para auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Verificar se o usuário está ativo no sistema
  if (profile && profile.status !== 'active') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
        <h1 className="text-2xl font-bold mb-4">Acesso Bloqueado</h1>
        <p className="text-muted-foreground mb-2">Seu usuário existe, mas encontra-se com status: <strong>{profile.status || 'pendente'}</strong>.</p>
        <p className="text-muted-foreground">Por favor, contate o administrador para aprovar o seu acesso.</p>
      </div>
    );
  }

  return <>{children}</>;
};