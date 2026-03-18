
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserProfile, UserFunction, UserPrivilege } from '@/hooks/useUserManagement';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import { useProfileImage } from '@/hooks/useProfileImage';
import { usePasswordManagement } from '@/hooks/usePasswordManagement';
import { Eye, EyeOff } from 'lucide-react';

interface UserModalProps {
  user: UserProfile | null;
  functions: UserFunction[];
  privileges: UserPrivilege[];
  onSave?: (userId: string, data: Partial<UserProfile>) => void;
  onCreate?: (data: { email: string; full_name?: string; function_id?: string; privilege_id?: string }) => void;
  onClose: () => void;
  readOnly?: boolean;
}

export function UserModal({ user, functions, privileges, onSave, onCreate, onClose, readOnly = false }: UserModalProps) {
  const { updateProfileImage, removeProfileImage, updating } = useProfileImage();
  const { changeUserPassword, isChangingPassword } = usePasswordManagement();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    function_id: '',
    privilege_id: '',
    status: 'active' as 'pending' | 'active' | 'inactive' | 'rejected',
    profile_image_url: null as string | null,
    password: ''
  });

  const isCreateMode = !user;
  const isReadOnly = readOnly || (!onSave && !onCreate);

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        full_name: user.full_name || '',
        function_id: user.function_id || '',
        privilege_id: user.privilege_id || '',
        status: user.status,
        profile_image_url: user.profile_image_url,
        password: '' // Não mostramos a senha atual por segurança
      });
    } else {
      // Reset form for create mode
      setFormData({
        email: '',
        full_name: '',
        function_id: '',
        privilege_id: '',
        status: 'active',
        profile_image_url: null,
        password: 'usuario' // Senha padrão para novos usuários
      });
    }
  }, [user]);

  const handleImageUpload = async (imageUrl: string) => {
    if (!user || isReadOnly) return;
    
    const success = await updateProfileImage(user.id, imageUrl);
    if (success) {
      setFormData(prev => ({ ...prev, profile_image_url: imageUrl }));
    }
  };

  const handleImageRemove = async () => {
    if (!user || isReadOnly) return;
    
    const success = await removeProfileImage(user.id);
    if (success) {
      setFormData(prev => ({ ...prev, profile_image_url: null }));
    }
  };

  const handlePasswordChange = async () => {
    if (!user || isReadOnly || !formData.password.trim()) return;
    
    await changeUserPassword(user.id, formData.password);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isReadOnly) return;
    
    if (isCreateMode && onCreate) {
      // Create new user
      onCreate({
        email: formData.email,
        full_name: formData.full_name || undefined,
        function_id: formData.function_id || undefined,
        privilege_id: formData.privilege_id || undefined
      });
    } else if (user && onSave) {
      // Update existing user
      const updateData: Partial<UserProfile> = {
        full_name: formData.full_name,
        function_id: formData.function_id || null,
        privilege_id: formData.privilege_id || null,
        status: formData.status,
        profile_image_url: formData.profile_image_url
      };

      onSave(user.id, updateData);
    }
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isReadOnly ? 'Visualizar Usuário' : isCreateMode ? 'Novo Usuário' : 'Editar Usuário'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Image Upload - Only for edit mode */}
          {user && (
            <div>
              <Label className="text-slate-300 text-sm font-medium">Foto de Perfil</Label>
              <div className="mt-2">
                <AvatarUpload
                  currentImageUrl={formData.profile_image_url}
                  onImageUpload={isReadOnly ? undefined : handleImageUpload}
                  onImageRemove={isReadOnly ? undefined : handleImageRemove}
                />
              </div>
            </div>
          )}

          <div>
            <Label className="text-slate-300">Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              disabled={!isCreateMode || isReadOnly}
              className="bg-slate-700 border-slate-600 text-white mt-1"
              placeholder="Digite o email"
              required={!isReadOnly}
              readOnly={isReadOnly}
            />
          </div>

          {/* Campo de Senha */}
          <div>
            <Label className="text-slate-300">Senha</Label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-slate-400 pr-10"
                placeholder={isCreateMode ? "usuario" : "Digite a nova senha"}
                disabled={isReadOnly}
                readOnly={isReadOnly}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isReadOnly}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </Button>
            </div>
            {!isCreateMode && !isReadOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 text-xs"
                onClick={handlePasswordChange}
                disabled={isChangingPassword || !formData.password.trim()}
              >
                {isChangingPassword ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            )}
          </div>

          <div>
            <Label className="text-slate-300">Nome Completo</Label>
            <Input
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white mt-1"
              placeholder="Digite o nome completo"
              disabled={isReadOnly}
              readOnly={isReadOnly}
            />
          </div>

          <div>
            <Label className="text-slate-300">Função</Label>
            <Select
              value={formData.function_id}
              onValueChange={isReadOnly ? undefined : (value) => setFormData(prev => ({ ...prev, function_id: value }))}
              disabled={isReadOnly}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                <SelectValue placeholder="Selecione uma função" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {functions.map((func) => (
                  <SelectItem key={func.id} value={func.id} className="text-white hover:bg-slate-600">
                    {func.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300">Privilégio</Label>
            <Select
              value={formData.privilege_id}
              onValueChange={isReadOnly ? undefined : (value) => setFormData(prev => ({ ...prev, privilege_id: value }))}
              disabled={isReadOnly}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                <SelectValue placeholder="Selecione um privilégio" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {privileges.map((privilege) => (
                  <SelectItem key={privilege.id} value={privilege.id} className="text-white hover:bg-slate-600">
                    {privilege.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status - Only for edit mode */}
          {!isCreateMode && (
            <div>
              <Label className="text-slate-300">Status</Label>
              <Select
                value={formData.status}
                onValueChange={isReadOnly ? undefined : (value) => setFormData(prev => ({ ...prev, status: value as typeof formData.status }))}
                disabled={isReadOnly}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="active" className="text-white hover:bg-slate-600">Ativo</SelectItem>
                  <SelectItem value="inactive" className="text-white hover:bg-slate-600">Inativo</SelectItem>
                  <SelectItem value="pending" className="text-white hover:bg-slate-600">Pendente</SelectItem>
                  <SelectItem value="rejected" className="text-white hover:bg-slate-600">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Password info for create mode */}
          {isCreateMode && !isReadOnly && (
            <div className="bg-slate-700 p-3 rounded border border-slate-600">
              <p className="text-sm text-slate-300">
                <strong>Senha padrão:</strong> usuario
              </p>
              <p className="text-xs text-slate-400 mt-1">
                O usuário poderá alterar a senha após o primeiro login.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            {!isReadOnly && (
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={updating || (isCreateMode && !formData.email)}
              >
                {isCreateMode ? 'Criar Usuário' : 'Salvar'}
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onClose}>
              {isReadOnly ? 'Fechar' : 'Cancelar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
