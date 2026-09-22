import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserPlus, Shield, Settings, Mail, Activity, LayoutGrid } from 'lucide-react';
import { UsersTable } from '@/components/users/UsersTable';
import { PendingUsersTable } from '@/components/users/PendingUsersTable';
import { FunctionsManager } from '@/components/users/FunctionsManager';
import { PrivilegesManager } from '@/components/users/PrivilegesManager';
import { PasswordResetRequests } from '@/components/users/PasswordResetRequests';
import { SessionLogsSimple } from '@/components/users/SessionLogsSimple';
import { UserModal } from '@/components/users/UserModal';
import { MatrizAcessosPainel } from '@/components/users/matriz/MatrizAcessosPainel';
import { useUserManagement, UserProfile } from '@/hooks/useUserManagement';
import { usePermissionControl } from '@/hooks/usePermissionControl';

const UserManagement = () => {
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('matriz');
  
  const { 
    canView, 
    canCreate, 
    canEdit, 
    canDelete, 
    canAdmin,
    isDisabled,
    canInteractWithSpecialMenus
  } = usePermissionControl();
  
  const { 
    users, 
    pendingUsers, 
    functions, 
    privileges,
    createUser,
    approveUser,
    rejectUser,
    createFunction,
    updateFunction,
    deleteFunction,
    createPrivilege: createPrivilegeBase,
    updatePrivilege: updatePrivilegeBase,
    deletePrivilege,
    updateUser,
    toggleUserStatus,
    deleteUser,
    canDeleteUser,
    getUserDependencies
  } = useUserManagement();

  // Verificar se pode acessar esta página - somente admins ou usuários com permissões especiais
  if (!canView() || !canInteractWithSpecialMenus()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="text-6xl">🔒</div>
          <h2 className="text-2xl font-semibold text-muted-foreground">
            Acesso Negado
          </h2>
          <p className="text-muted-foreground max-w-md">
            Você não tem permissão para acessar o gerenciamento de usuários.
          </p>
        </div>
      </div>
    );
  }

  // Wrapper functions to match expected signatures
  const createPrivilege = async (data: { name: string; description?: string; permissions: Record<string, boolean> }): Promise<void> => {
    await createPrivilegeBase(data);
  };

  const updatePrivilege = async (id: string, data: { name: string; description?: string; permissions: Record<string, boolean> }): Promise<void> => {
    await updatePrivilegeBase(id, data);
  };

  const handleEditUser = (user: UserProfile) => {
    if (!canEdit()) return;
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  const handleCreateUser = () => {
    if (!canCreate()) return;
    setSelectedUser(null);
    setIsUserModalOpen(true);
  };

  const handleToggleStatus = (userId: string) => {
    if (!canEdit()) return;
    const user = users.find(u => u.id === userId);
    if (user) {
      toggleUserStatus(userId, user.status);
    }
  };

  const handleDeleteUser = async (userId: string, replaceReferences: boolean = false) => {
    if (!canDelete()) return;
    return await deleteUser(userId, replaceReferences);
  };

  const handleApproveUser = (userId: string) => {
    if (!canEdit()) return;
    approveUser(userId);
  };

  const handleRejectUser = (userId: string) => {
    if (!canDelete()) return;
    rejectUser(userId);
  };

  const handleSaveUser = (userId: string, data: Partial<UserProfile>) => {
    if (!canEdit()) return;
    updateUser(userId, data);
    setSelectedUser(null);
    setIsUserModalOpen(false);
  };

  const handleCreateNewUser = async (data: { 
    email: string; 
    full_name?: string; 
    function_id?: string; 
    privilege_id?: string; 
  }) => {
    if (!canCreate()) return;
    try {
      await createUser(data);
      setIsUserModalOpen(false);
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setIsUserModalOpen(false);
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Usuários e Privilégios</h1>
          <p className="text-sm md:text-base text-muted-foreground">Gerenciamento de usuários, funções e privilégios do sistema</p>
        </div>
        {canCreate() && (
          <Button 
            onClick={handleCreateUser}
            className="mobile-full-width"
            disabled={isDisabled('create')}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            <span className="text-sm md:text-base">Novo Usuário</span>
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-7 bg-muted h-auto p-1">
          <TabsTrigger 
            value="matriz" 
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3 font-semibold text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <LayoutGrid className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Matriz de Acessos</span>
            <span className="sm:hidden">Matriz</span>
          </TabsTrigger>

          <TabsTrigger 
            value="users" 
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3"
          >
            <Users className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Usuários</span>
            <span className="sm:hidden">Users</span>
          </TabsTrigger>
          
          {canEdit() && (
            <TabsTrigger 
              value="pending" 
              className="flex items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3"
            >
              <UserPlus className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Pendentes</span>
              <span className="sm:hidden">Pend</span>
            </TabsTrigger>
          )}
          
          {canAdmin() && (
            <TabsTrigger 
              value="password-reset" 
              className="flex items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3"
            >
              <Mail className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Redefinições</span>
              <span className="sm:hidden">Reset</span>
            </TabsTrigger>
          )}
          
          {canEdit() && (
            <TabsTrigger 
              value="functions" 
              className="flex items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3"
            >
              <Settings className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Funções</span>
              <span className="sm:hidden">Func</span>
            </TabsTrigger>
          )}
          
          {canEdit() && (
            <TabsTrigger 
              value="privileges" 
              className="flex items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3"
            >
              <Shield className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Privilégios</span>
              <span className="sm:hidden">Priv</span>
            </TabsTrigger>
          )}
          
          {canView() && (
            <TabsTrigger 
              value="session-logs" 
              className="flex items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3"
            >
              <Activity className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Logs de Sessão</span>
              <span className="sm:hidden">Logs</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="matriz" className="space-y-4 mt-4">
          <MatrizAcessosPainel onOpenNovoUsuario={canCreate() ? handleCreateUser : undefined} />
        </TabsContent>

        <TabsContent value="users" className="space-y-4 mt-4">
          <Card className="card-mobile">
            <CardHeader className="card-header-mobile">
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <Users className="h-4 w-4 md:h-5 md:w-5" />
                Usuários Ativos
              </CardTitle>
            </CardHeader>
            <CardContent className="card-content-mobile">
              <div className="overflow-x-auto custom-scrollbar">
                <UsersTable 
                  users={users} 
                  functions={functions}
                  privileges={privileges}
                  onEditUser={canEdit() ? handleEditUser : undefined}
                  onToggleStatus={canEdit() ? handleToggleStatus : undefined}
                  onDeleteUser={canDelete() ? handleDeleteUser : undefined}
                  canDeleteUser={canDeleteUser}
                  getUserDependencies={getUserDependencies}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {canEdit() && (
          <TabsContent value="pending" className="space-y-4 mt-4">
            <Card className="card-mobile">
              <CardHeader className="card-header-mobile">
                <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                  <UserPlus className="h-4 w-4 md:h-5 md:w-5" />
                  Usuários Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent className="card-content-mobile">
                <div className="overflow-x-auto custom-scrollbar">
                  <PendingUsersTable 
                    users={pendingUsers}
                    onApprove={handleApproveUser}
                    onReject={handleRejectUser}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canAdmin() && (
          <TabsContent value="password-reset" className="space-y-4 mt-4">
            <PasswordResetRequests />
          </TabsContent>
        )}

        {canEdit() && (
          <TabsContent value="functions" className="space-y-4 mt-4">
            <Card className="card-mobile">
              <CardHeader className="card-header-mobile">
                <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                  <Settings className="h-4 w-4 md:h-5 md:w-5" />
                  Gerenciar Funções
                </CardTitle>
              </CardHeader>
              <CardContent className="card-content-mobile">
                <FunctionsManager
                  functions={functions}
                  onCreate={canCreate() ? createFunction : undefined}
                  onUpdate={canEdit() ? updateFunction : undefined}
                  onDelete={canDelete() ? deleteFunction : undefined}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canEdit() && (
          <TabsContent value="privileges" className="space-y-4 mt-4">
            <Card className="card-mobile">
              <CardHeader className="card-header-mobile">
                <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                  <Shield className="h-4 w-4 md:h-5 md:w-5" />
                  Gerenciar Privilégios
                </CardTitle>
              </CardHeader>
              <CardContent className="card-content-mobile">
                <PrivilegesManager
                  privileges={privileges as any}
                  onCreate={canCreate() ? createPrivilege : undefined}
                  onUpdate={canEdit() ? updatePrivilege : undefined}
                  onDelete={canDelete() ? deletePrivilege : undefined}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canView() && (
          <TabsContent value="session-logs" className="space-y-4 mt-4">
            <SessionLogsSimple users={users} />
          </TabsContent>
        )}
      </Tabs>

      {isUserModalOpen && (
        <UserModal
          user={selectedUser}
          functions={functions}
          privileges={privileges}
          onSave={canEdit() ? handleSaveUser : undefined}
          onCreate={canCreate() ? handleCreateNewUser : undefined}
          onClose={handleCloseModal}
          readOnly={!canEdit() && !canCreate()}
        />
      )}
    </div>
  );
};

export default UserManagement;
