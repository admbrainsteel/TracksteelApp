
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield } from 'lucide-react';
import { FUNCTIONAL_PERMISSIONS } from './types';

interface PrivilegeFormProps {
  formData: {
    name: string;
    description: string;
    permissions: Record<string, boolean>;
  };
  onFormDataChange: (data: any) => void;
  onPermissionChange: (permissionKey: string, checked: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEditing: boolean;
}

export const PrivilegeForm: React.FC<PrivilegeFormProps> = ({
  formData,
  onFormDataChange,
  onPermissionChange,
  onSubmit,
  onCancel,
  isEditing
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5" />
        <h3 className="text-lg font-semibold">
          {isEditing ? 'Editar Privilégio' : 'Novo Privilégio'}
        </h3>
      </div>
      
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => onFormDataChange(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => onFormDataChange(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Permissões Funcionais</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Selecione o nível de acesso funcional (apenas uma opção por privilégio)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {FUNCTIONAL_PERMISSIONS.map((perm) => (
                <div key={perm.key} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={perm.key}
                    checked={formData.permissions[perm.key] || false}
                    onCheckedChange={(checked) => onPermissionChange(perm.key, checked as boolean)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor={perm.key} className="font-medium">
                      {perm.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {perm.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit">
            {isEditing ? 'Atualizar' : 'Criar'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
};
