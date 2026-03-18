
import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, User, Database } from 'lucide-react';
import { UserProfile, UserDependency } from '@/hooks/useUserManagement';

interface UserDeleteDialogProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (userId: string, replaceReferences: boolean) => Promise<boolean>;
  canDeleteUser: (userId: string) => Promise<boolean>;
  getUserDependencies: (userId: string) => Promise<UserDependency[]>;
}

export function UserDeleteDialog({ 
  user, 
  isOpen, 
  onClose, 
  onConfirmDelete, 
  canDeleteUser, 
  getUserDependencies 
}: UserDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [dependencies, setDependencies] = useState<UserDependency[]>([]);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadUserData();
    }
  }, [isOpen, user]);

  const loadUserData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [canDeleteResult, dependenciesResult] = await Promise.all([
        canDeleteUser(user.id),
        getUserDependencies(user.id)
      ]);
      
      setCanDelete(canDeleteResult);
      setDependencies(dependenciesResult.filter(dep => dep.count > 0));
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (replaceReferences: boolean = false) => {
    if (!user) return;
    
    setDeleting(true);
    try {
      const success = await onConfirmDelete(user.id, replaceReferences);
      if (success) {
        onClose();
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!deleting) {
      onClose();
    }
  };

  if (!user) return null;

  const criticalDependencies = dependencies.filter(dep => 
    ['ficha_tecnica_contratos', 'ordens_fabricacao', 'pecas', 'apontamentos_producao'].includes(dep.table_name)
  );

  const nonCriticalDependencies = dependencies.filter(dep => 
    !['ficha_tecnica_contratos', 'ordens_fabricacao', 'pecas', 'apontamentos_producao'].includes(dep.table_name)
  );

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Excluir usuário
          </AlertDialogTitle>
          <AlertDialogDescription>
            Análise dos vínculos do usuário <strong>{user.full_name || user.email}</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Verificando vínculos...</span>
            </div>
          ) : (
            <>
              {dependencies.length === 0 ? (
                <div className="text-center py-4 text-green-600">
                  <Database className="h-8 w-8 mx-auto mb-2" />
                  <p>Este usuário não possui vínculos no sistema e pode ser excluído com segurança.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-orange-600">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">Vínculos encontrados:</span>
                  </div>

                  {criticalDependencies.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-600">Vínculos críticos (impedem exclusão):</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {criticalDependencies.map((dep, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200">
                            <span className="text-sm">{dep.description}</span>
                            <Badge variant="destructive">{dep.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {nonCriticalDependencies.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-orange-600">Vínculos não críticos (podem ser transferidos):</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {nonCriticalDependencies.map((dep, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg border border-orange-200">
                            <span className="text-sm">{dep.description}</span>
                            <Badge variant="secondary">{dep.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!canDelete && nonCriticalDependencies.length > 0 && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>Opção disponível:</strong> Os vínculos não críticos podem ser transferidos para um usuário especial "UserDel" 
                        para preservar a integridade do banco de dados e permitir a exclusão do usuário.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <AlertDialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={deleting}
          >
            Cancelar
          </Button>
          
          {canDelete && (
            <Button
              variant="destructive"
              onClick={() => handleDelete(false)}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                'Excluir usuário'
              )}
            </Button>
          )}

          {!canDelete && nonCriticalDependencies.length > 0 && criticalDependencies.length === 0 && (
            <Button
              variant="destructive"
              onClick={() => handleDelete(true)}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                'Transferir vínculos e excluir'
              )}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
