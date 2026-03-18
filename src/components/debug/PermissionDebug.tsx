
import React from 'react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PermissionDebug() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { 
    userPermissions, 
    resourcePermissions, 
    hasAccess, 
    getResourcePermission,
    loading 
  } = useUserPermissions();

  if (!import.meta.env.DEV) {
    return null;
  }

  const equipamentosAccess = hasAccess('equipamentos');
  const equipamentosPermission = getResourcePermission('equipamentos' as any);

  return (
    <Card className="fixed top-4 right-4 w-96 max-h-[80vh] overflow-y-auto z-50 bg-background border">
      <CardHeader>
        <CardTitle className="text-sm">Debug - Permissões</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div>
          <strong>Usuário:</strong> {user?.email || 'Não logado'}
        </div>
        
        <div>
          <strong>Loading:</strong> {loading ? 'Sim' : 'Não'}
        </div>
        
        <div>
          <strong>Is Admin:</strong> {isAdmin ? 'Sim' : 'Não'}
        </div>
        
        <div>
          <strong>Permissões Funcionais:</strong>
          <pre className="mt-1 p-2 bg-muted rounded text-xs">
            {JSON.stringify(userPermissions, null, 2)}
          </pre>
        </div>
        
        <div>
          <strong>Permissões de Recursos:</strong>
          <pre className="mt-1 p-2 bg-muted rounded text-xs">
            {JSON.stringify(resourcePermissions, null, 2)}
          </pre>
        </div>
        
        <div className="border-t pt-2">
          <strong>Teste Equipamentos:</strong>
          <div>Acesso: {equipamentosAccess ? '✅ Sim' : '❌ Não'}</div>
          <div>Permissão: {equipamentosPermission}</div>
        </div>

        <div className="border-t pt-2">
          <strong>Acesso Geral:</strong>
          <div>hasAccess(): {hasAccess() ? '✅ Sim' : '❌ Não'}</div>
        </div>
      </CardContent>
    </Card>
  );
}
