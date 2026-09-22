import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserPermissions } from '@/hooks/useUserPermissions/useUserPermissions';
import { ShieldAlert, Zap, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteByResourceProps {
  children: React.ReactNode;
  resourceKey: string;
}

export const ProtectedRouteByResource: React.FC<ProtectedRouteByResourceProps> = ({
  children,
  resourceKey,
}) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { profile, loading: profileLoading } = useUserProfile();
  const { hasAccess, loading: permsLoading, resourcePermissions } = useUserPermissions();

  const loading = authLoading || roleLoading || profileLoading || permsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-sm text-muted-foreground">Validando permissões de acesso...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // 1. Verificar se o usuário está ativo no sistema
  if (profile && profile.status !== 'active') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
        <h1 className="text-2xl font-bold mb-4">Acesso Bloqueado</h1>
        <p className="text-muted-foreground mb-2">
          Seu usuário existe, mas encontra-se com status: <strong>{profile.status || 'pendente'}</strong>.
        </p>
        <p className="text-muted-foreground">Por favor, contate o administrador para aprovar o seu acesso.</p>
      </div>
    );
  }

  // 2. Administradores têm acesso irrestrito
  if (isAdmin) {
    return <>{children}</>;
  }

  // 3. Validação real de permissão granular pelo resourceKey
  const podeAcessar = hasAccess(resourceKey);

  if (!podeAcessar) {
    // Se o usuário tem acesso ao Modo Smart, redirecionar para a experiência dele
    const temAcessoSmart =
      resourcePermissions['modo-smart'] &&
      resourcePermissions['modo-smart'] !== 'no_access';

    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] p-6 text-center">
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-4 shadow-sm">
          <ShieldAlert className="w-12 h-12 stroke-[1.5]" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Acesso Restrito a Este Módulo</h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Seu usuário não possui permissão concedida para acessar o recurso{' '}
          <code className="px-2 py-0.5 rounded bg-muted font-mono text-xs text-foreground">
            {resourceKey}
          </code>
          . Solicite liberação na Matriz de Acessos ao administrador do sistema.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {temAcessoSmart && (
            <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white font-medium">
              <Link to="/smart">
                <Zap className="w-4 h-4 mr-2" />
                Ir para o Modo Smart
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Início
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};