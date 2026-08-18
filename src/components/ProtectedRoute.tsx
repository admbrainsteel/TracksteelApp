import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

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

  // Logto já valida o usuário via JWT/OIDC.
  // Não precisa de profile separado no Supabase.
  return <>{children}</>;
};