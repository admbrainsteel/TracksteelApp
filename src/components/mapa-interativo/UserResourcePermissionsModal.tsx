
import React from 'react';
import { ResponsiveModal } from '@/components/responsive/ResponsiveModal';
import { UserResourcePermissions } from '@/components/mapa-interativo/UserResourcePermissions';
import { Button } from '@/components/ui/button';

interface UserResourcePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceKey: string;
  resourceName: string;
}

export function UserResourcePermissionsModal({ 
  isOpen, 
  onClose, 
  resourceKey, 
  resourceName 
}: UserResourcePermissionsModalProps) {
  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Controle de Acesso - ${resourceName}`}
      description={`Gerenciar permissões de usuários para ${resourceName}`}
      size="lg"
      footer={
        <Button onClick={onClose} variant="outline">
          Fechar
        </Button>
      }
    >
      <UserResourcePermissions 
        resourceKey={resourceKey}
        resourceName={resourceName}
      />
    </ResponsiveModal>
  );
}
