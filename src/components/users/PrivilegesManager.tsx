import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Privilege, FUNCTIONAL_PERMISSIONS } from './privileges/types';
import { PrivilegeForm } from './privileges/PrivilegeForm';
import { PrivilegeCard } from './privileges/PrivilegeCard';

interface PrivilegesManagerProps {
  privileges: Privilege[];
  onCreate: (data: { name: string; description?: string; permissions: Record<string, boolean> }) => Promise<void>;
  onUpdate: (id: string, data: { name: string; description?: string; permissions: Record<string, boolean> }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function PrivilegesManager({ privileges, onCreate, onUpdate, onDelete }: PrivilegesManagerProps) {
  const [editingPrivilege, setEditingPrivilege] = useState<Privilege | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: {} as Record<string, boolean>
  });
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permissions: {}
    });
    setEditingPrivilege(null);
    setShowForm(false);
  };

  // Function to clean permissions and keep only valid functional ones
  const cleanPermissions = (permissions: Record<string, boolean>): Record<string, boolean> => {
    const cleanedPermissions: Record<string, boolean> = {};
    
    // Keep only valid functional permissions
    FUNCTIONAL_PERMISSIONS.forEach(perm => {
      cleanedPermissions[perm.key] = permissions[perm.key] || false;
    });
    
    return cleanedPermissions;
  };

  const handleEdit = (privilege: Privilege) => {
    console.log('Editing privilege:', privilege.name);
    setEditingPrivilege(privilege);
    
    // Clean old permissions and keep only functional ones
    const cleanedPermissions = cleanPermissions(privilege.permissions || {});
    
    setFormData({
      name: privilege.name,
      description: privilege.description || '',
      permissions: cleanedPermissions
    });
    
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure only one functional permission is active
    const activePermissions = Object.entries(formData.permissions).filter(([, value]) => value);
    if (activePermissions.length > 1) {
      toast({ 
        title: "Erro de validação", 
        description: "Apenas uma permissão funcional pode ser selecionada por privilégio.",
        variant: "destructive" 
      });
      return;
    }
    
    if (activePermissions.length === 0) {
      toast({ 
        title: "Erro de validação", 
        description: "Pelo menos uma permissão funcional deve ser selecionada.",
        variant: "destructive" 
      });
      return;
    }
    
    console.log('Submitting privilege:', {
      name: formData.name,
      functionalPermissions: formData.permissions
    });
    
    try {
      if (editingPrivilege) {
        await onUpdate(editingPrivilege.id, formData);
        toast({ title: "Privilégio atualizado com sucesso!" });
      } else {
        await onCreate(formData);
        toast({ title: "Privilégio criado com sucesso!" });
      }
      resetForm();
    } catch (error) {
      console.error('Error saving privilege:', error);
      toast({ 
        title: "Erro ao salvar privilégio", 
        description: "Verifique os dados e tente novamente.",
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este privilégio?')) {
      try {
        await onDelete(id);
        toast({ title: "Privilégio excluído com sucesso!" });
      } catch (error) {
        console.error('Error deleting privilege:', error);
        toast({ 
          title: "Erro ao excluir privilégio", 
          variant: "destructive" 
        });
      }
    }
  };

  const handlePermissionChange = (permissionKey: string, checked: boolean) => {
    if (checked) {
      // Implement radio button behavior - only one functional permission at a time
      const newPermissions = FUNCTIONAL_PERMISSIONS.reduce((acc, perm) => {
        acc[perm.key] = perm.key === permissionKey;
        return acc;
      }, {} as Record<string, boolean>);
      
      setFormData(prev => ({
        ...prev,
        permissions: newPermissions
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        permissions: {
          ...prev.permissions,
          [permissionKey]: false
        }
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Privilégios do Sistema</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os privilégios funcionais dos usuários (sistema simplificado)
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Privilégio
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Privilégios</CardTitle>
          </CardHeader>
          <CardContent>
            <PrivilegeForm
              formData={formData}
              onFormDataChange={setFormData}
              onPermissionChange={handlePermissionChange}
              onSubmit={handleSubmit}
              onCancel={resetForm}
              isEditing={!!editingPrivilege}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {privileges.map((privilege) => (
          <PrivilegeCard
            key={privilege.id}
            privilege={privilege}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
