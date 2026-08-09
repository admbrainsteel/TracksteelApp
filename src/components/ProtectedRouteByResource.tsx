
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useUserRole } from '@/hooks/useUserRole';
import { logger } from '@/utils/logger';

interface ProtectedRouteByResourceProps {
  children: React.ReactNode;
  resourceKey: string;
}

export const ProtectedRouteByResource: React.FC<ProtectedRouteByResourceProps> = ({ 
  children, 
  resourceKey 
}) => {
  const { user, loading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();

  // Use a try-catch to prevent the hook from crashing the component
  let permissionsData;
  try {
    permissionsData = useUserPermissions();
  } catch (error) {
    console.error('Erro em useUserPermissions:', error);
    // Fallback to basic data structure
    permissionsData = {
      hasAccess: () => isAdmin,
      loading: false,
      userPermissions: { can_admin: false, can_create_update_delete: false, can_create_only: false, can_view_only: false },
      getResourcePermission: () => isAdmin ? 'can_admin' : 'no_access'
    };
  }

  const { hasAccess, loading: permissionsLoading, userPermissions, getResourcePermission } = permissionsData;

  // Aguardar carregamento
  if (loading || permissionsLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // Redirecionar para login se não autenticado
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Admin sempre tem acesso (exceto se explicitamente negado)
  if (isAdmin) {
    const resourcePermission = getResourcePermission(resourceKey);
    // Se admin tem negação explícita, negar acesso
      if (resourcePermission === 'no_access') {
        if (import.meta.env.DEV) {
          logger.debug('Admin: acesso negado por permissão explícita de recurso', resourceKey as any);
        }
      } else {
        return <>{children}</>;
      }
  }

  let finalAccess = false;
  
  try {
    // 1. PRIMEIRO: Verificar permissão específica do recurso
    const resourcePermission = getResourcePermission(resourceKey);
    
    if (import.meta.env.DEV) {
      logger.debug('Verificando acesso ao recurso', {
        resourceKey,
        user: user?.email,
        isAdmin,
        resourcePermission,
        userPermissions
      } as any);
    }

    // 2. Se há permissão específica definida, ela prevalece SEMPRE
    if (resourcePermission !== 'no_access') {
      finalAccess = true;
      if (import.meta.env.DEV) {
        logger.success('Acesso concedido por permissão específica do recurso', resourcePermission as any);
      }
    } else {
      // 3. Permissão explícita é 'no_access' — negar acesso
      finalAccess = false;
      if (import.meta.env.DEV) {
        logger.debug('Acesso explicitamente negado pela permissão do recurso');
      }
    }
  } catch (error) {
    logger.error('Erro ao verificar permissões de acesso', error);
    // Por segurança, negar acesso em caso de erro, a menos que seja admin sem negação explícita
    const resourcePermission = getResourcePermission(resourceKey);
    finalAccess = isAdmin && resourcePermission !== 'no_access';
  }

  if (!finalAccess) {
    logger.debug(`Acesso negado para recurso: ${resourceKey}`);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="text-6xl">🔒</div>
          <h2 className="text-2xl font-semibold text-muted-foreground">
            Acesso Restrito
          </h2>
          <p className="text-muted-foreground max-w-md">
            Você não tem permissão para acessar esta funcionalidade. Entre em contato com o administrador do sistema.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Recurso solicitado: <code className="bg-muted px-2 py-1 rounded">{resourceKey}</code>
          </p>
          {import.meta.env.DEV && (
            <div className="text-xs text-muted-foreground mt-2 p-3 bg-muted/50 rounded">
              <p>Debug info:</p>
              <p>Admin: {isAdmin ? 'Sim' : 'Não'}</p>
              <p>Permissão do Recurso: {getResourcePermission(resourceKey)}</p>
              <p>Permissões Funcionais: {userPermissions ? JSON.stringify(userPermissions) : 'Não carregadas'}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
