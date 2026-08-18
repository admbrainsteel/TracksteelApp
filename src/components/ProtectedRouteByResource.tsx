import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

interface ProtectedRouteByResourceProps {
  children: React.ReactNode;
  resourceKey: string;
}

export const ProtectedRouteByResource: React.FC<ProtectedRouteByResourceProps> = ({
  children,
}) => {
  const { user, loading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Migração pro Logto: todos usuários autenticados têm acesso aos recursos.
  // Sistema de permissões granulares fica pra depois.
  return <>{children}</>;
};