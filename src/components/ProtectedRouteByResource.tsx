import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

import { useUserProfile } from '@/hooks/useUserProfile';

interface ProtectedRouteByResourceProps {
  children: React.ReactNode;
  resourceKey: string;
}

export const ProtectedRouteByResource: React.FC<ProtectedRouteByResourceProps> = ({
  children,
}) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { profile, loading: profileLoading } = useUserProfile();

  const loading = authLoading || roleLoading || profileLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

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

  // Migração pro Logto: todos usuários autenticados têm acesso aos recursos.
  // Sistema de permissões granulares fica pra depois.
  return <>{children}</>;
};