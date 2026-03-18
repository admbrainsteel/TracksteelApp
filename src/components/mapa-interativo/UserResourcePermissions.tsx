
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Users, AlertCircle, Loader2 } from 'lucide-react';
import { useUserResourcePermissions } from '@/hooks/useUserResourcePermissions';

interface UserResourcePermissionsProps {
  resourceKey: string;
  resourceName: string;
}

export function UserResourcePermissions({ resourceKey, resourceName }: UserResourcePermissionsProps) {
  const {
    users,
    resourcePermissions,
    loading,
    setUserPermission,
    removeUserPermission
  } = useUserResourcePermissions(resourceKey);

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleAddPermission = async () => {
    if (!selectedUserId) {
      return;
    }

    setIsAdding(true);
    try {
      console.log('🎯 Adicionando usuário ao recurso:', {
        userId: selectedUserId,
        resourceKey,
        resourceName
      });

      // Usando 'can_view_only' como padrão, mas as permissões reais virão dos privilégios
      const success = await setUserPermission(selectedUserId, 'can_view_only');
      if (success) {
        setSelectedUserId('');
        console.log('✅ Usuário adicionado com sucesso');
      } else {
        console.log('❌ Falha ao adicionar usuário');
      }
    } catch (error) {
      console.error('❌ Erro ao adicionar usuário:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemovePermission = async (userId: string) => {
    setIsUpdating(userId);
    try {
      console.log('🗑️ Removendo usuário do recurso:', { userId, resourceKey });
      await removeUserPermission(userId);
    } catch (error) {
      console.error('Error removing permission:', error);
    } finally {
      setIsUpdating(null);
    }
  };

  // Get users that don't have explicit permissions set
  const availableUsers = users.filter(user => 
    !resourcePermissions.some(perm => perm.user_id === user.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin mr-3" />
        <div className="text-sm text-muted-foreground">Carregando usuários...</div>
      </div>
    );
  }

  if (!resourceKey) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-4 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span>Recurso não identificado</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resource Info */}
      <div className="p-4 bg-muted/30 rounded-lg">
        <div className="text-sm text-muted-foreground">
          Recurso: <code className="bg-muted px-2 py-1 rounded text-xs">{resourceKey}</code>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          As permissões específicas são definidas pelos privilégios de cada usuário
        </div>
      </div>

      {/* Add new user */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold">Adicionar Usuário</h4>
        <div className="flex gap-3 flex-wrap">
          <Select 
            value={selectedUserId} 
            onValueChange={setSelectedUserId}
            disabled={isAdding}
          >
            <SelectTrigger className="flex-1 min-w-[200px]">
              <SelectValue placeholder="Selecionar usuário..." />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">
                  Todos os usuários já estão vinculados a este recurso
                </div>
              ) : (
                availableUsers.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{user.full_name || user.email}</span>
                      <span className="text-xs text-muted-foreground">({user.email})</span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={handleAddPermission}
            disabled={!selectedUserId || isAdding || availableUsers.length === 0}
            size="default"
          >
            {isAdding ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Adicionar
          </Button>
        </div>
      </div>

      {/* Current permissions */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold">
          Usuários Vinculados ({resourcePermissions.length})
        </h4>
        {resourcePermissions.length === 0 ? (
          <div className="text-center p-8 bg-muted/20 rounded-lg border-2 border-dashed border-muted">
            <div className="text-muted-foreground">
              Nenhum usuário específico vinculado.<br />
              Usuários acessam baseado em seus privilégios funcionais.
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {resourcePermissions.map(permission => {
              const user = users.find(u => u.id === permission.user_id);
              if (!user) return null;

              return (
                <div key={permission.user_id} className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="font-medium text-card-foreground">
                        {user.full_name || user.email}
                      </span>
                      {user.full_name && (
                        <span className="text-sm text-muted-foreground">{user.email}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Permissões definidas pelo privilégio do usuário
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemovePermission(permission.user_id)}
                      disabled={isUpdating === permission.user_id}
                    >
                      {isUpdating === permission.user_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Information note */}
      <div className="space-y-3">
        <h4 className="text-base font-medium">Como Funciona</h4>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">Sistema Simplificado de Permissões:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Usuários são vinculados aos recursos que podem acessar</li>
              <li>As permissões específicas (criar, editar, excluir) são definidas pelos <strong>Privilégios</strong> de cada usuário</li>
              <li>Usuários não vinculados seguem as regras gerais do sistema</li>
              <li>Administradores sempre têm acesso total (exceto se explicitamente negado)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
