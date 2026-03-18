
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Check, X } from 'lucide-react';
import { UserProfile } from '@/hooks/useUserManagement';
import { UserAvatar } from '@/components/ui/user-avatar';

interface PendingUsersTableProps {
  users: UserProfile[];
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
}

export function PendingUsersTable({ users, onApprove, onReject }: PendingUsersTableProps) {
  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        Nenhuma solicitação pendente
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-700">
            <TableHead className="text-slate-300">Usuário</TableHead>
            <TableHead className="text-slate-300 hidden sm:table-cell">Data da Solicitação</TableHead>
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
                    {/* Mobile: Show date on small screens */}
                    <div className="sm:hidden text-xs text-slate-300 mt-1">
                      Solicitação: {new Date(user.requested_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-slate-300 hidden sm:table-cell">
                <span className="text-xs">{new Date(user.requested_at).toLocaleDateString('pt-BR')}</span>
              </TableCell>
              <TableCell>
                <div className="flex gap-1 flex-col sm:flex-row">
                  <Button
                    size="sm"
                    onClick={() => onApprove(user.id)}
                    className="bg-green-600 hover:bg-green-700 text-white h-6 text-xs px-2"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Aprovar</span>
                    <span className="sm:hidden">✓</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onReject(user.id)}
                    className="bg-red-600 hover:bg-red-700 h-6 text-xs px-2"
                  >
                    <X className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Rejeitar</span>
                    <span className="sm:hidden">✗</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
