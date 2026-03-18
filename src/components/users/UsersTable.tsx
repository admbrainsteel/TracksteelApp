
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Edit, Power, PowerOff, Trash2 } from 'lucide-react';
import { UserProfile, UserFunction, UserPrivilege, UserDependency } from '@/hooks/useUserManagement';
import { UserAvatar } from '@/components/ui/user-avatar';
import { UserDeleteDialog } from './UserDeleteDialog';
import { useState } from 'react';

interface UsersTableProps {
  users: UserProfile[];
  functions: UserFunction[];
  privileges: UserPrivilege[];
  onEditUser: (user: UserProfile) => void;
  onToggleStatus: (userId: string, currentStatus: string) => void;
  onDeleteUser?: (userId: string, replaceReferences: boolean) => Promise<boolean>;
  canDeleteUser?: (userId: string) => Promise<boolean>;
  getUserDependencies?: (userId: string) => Promise<UserDependency[]>;
}

export function UsersTable({ 
  users, 
  functions, 
  privileges, 
  onEditUser, 
  onToggleStatus,
  onDeleteUser,
  canDeleteUser,
  getUserDependencies
}: UsersTableProps) {
  const [selectedUserForDeletion, setSelectedUserForDeletion] = useState<UserProfile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const getFunctionName = (functionId: string | null) => {
    if (!functionId) return '-';
    const func = functions.find(f => f.id === functionId);
    return func?.name || '-';
  };

  const getPrivilegeName = (privilegeId: string | null) => {
    if (!privilegeId) return '-';
    const privilege = privileges.find(p => p.id === privilegeId);
    return privilege?.name || '-';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Ativo', className: 'bg-green-600 text-white' },
      inactive: { label: 'Inativo', className: 'bg-red-600 text-white' },
      rejected: { label: 'Rejeitado', className: 'bg-gray-600 text-white' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const handleDeleteClick = (user: UserProfile) => {
    setSelectedUserForDeletion(user);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setSelectedUserForDeletion(null);
    setIsDeleteDialogOpen(false);
  };

  const handleConfirmDelete = async (userId: string, replaceReferences: boolean = false) => {
    if (onDeleteUser) {
      return await onDeleteUser(userId, replaceReferences);
    }
    return false;
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        Nenhum usuário encontrado
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700">
              <TableHead className="text-slate-300">Usuário</TableHead>
              <TableHead className="text-slate-300 hidden sm:table-cell">Função</TableHead>
              <TableHead className="text-slate-300 hidden md:table-cell">Privilégio</TableHead>
              <TableHead className="text-slate-300">Status</TableHead>
              <TableHead className="text-slate-300 hidden lg:table-cell">Inclusão</TableHead>
              <TableHead className="text-slate-300">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className="border-slate-700">
                <TableCell className="min-w-0">
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      imageUrl={user.profile_image_url}
                      name={user.full_name}
                      email={user.email}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-medium truncate text-xs sm:text-sm">
                        {user.full_name || 'Nome não informado'}
                      </div>
                      <div className="text-slate-400 text-xs truncate">{user.email}</div>
                      {/* Mobile: Show function and privilege on small screens */}
                      <div className="sm:hidden space-y-1 mt-1">
                        <div className="text-xs text-slate-300">
                          Função: {getFunctionName(user.function_id)}
                        </div>
                        <div className="text-xs text-slate-300 md:hidden">
                          Privilégio: {getPrivilegeName(user.privilege_id)}
                        </div>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-slate-300 hidden sm:table-cell">
                  <span className="text-xs">{getFunctionName(user.function_id)}</span>
                </TableCell>
                <TableCell className="text-slate-300 hidden md:table-cell">
                  <span className="text-xs">{getPrivilegeName(user.privilege_id)}</span>
                </TableCell>
                <TableCell>
                  {getStatusBadge(user.status)}
                </TableCell>
                <TableCell className="text-slate-300 hidden lg:table-cell">
                  <span className="text-xs">{new Date(user.created_at).toLocaleDateString('pt-BR')}</span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEditUser(user)}
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/50 p-1 h-6 w-6"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onToggleStatus(user.id, user.status)}
                      className={`p-1 h-6 w-6 ${user.status === 'active' 
                        ? "text-red-400 hover:text-red-300 hover:bg-red-900/50"
                        : "text-green-400 hover:text-green-300 hover:bg-green-900/50"
                      }`}
                    >
                      {user.status === 'active' ? (
                        <PowerOff className="w-3 h-3" />
                      ) : (
                        <Power className="w-3 h-3" />
                      )}
                    </Button>
                    {onDeleteUser && canDeleteUser && getUserDependencies && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteClick(user)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/50 p-1 h-6 w-6"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <UserDeleteDialog
        user={selectedUserForDeletion}
        isOpen={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirmDelete={handleConfirmDelete}
        canDeleteUser={canDeleteUser || (async () => false)}
        getUserDependencies={getUserDependencies || (async () => [])}
      />
    </>
  );
}
