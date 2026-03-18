
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePasswordManagement() {
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const changeUserPassword = async (userId: string, newPassword: string): Promise<boolean> => {
    if (!newPassword || newPassword.trim().length === 0) {
      toast.error('A senha não pode estar vazia');
      return false;
    }

    if (newPassword.length < 3) {
      toast.error('A senha deve ter pelo menos 3 caracteres');
      return false;
    }

    setIsChangingPassword(true);
    
    try {
      const { data, error } = await supabase.rpc('admin_change_user_password', {
        user_id_param: userId,
        new_password: newPassword
      });

      if (error) {
        console.error('Error changing password:', error);
        toast.error('Erro ao alterar senha: ' + error.message);
        return false;
      }

      toast.success('Senha alterada com sucesso');
      return true;
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Erro ao alterar senha');
      return false;
    } finally {
      setIsChangingPassword(false);
    }
  };

  return {
    changeUserPassword,
    isChangingPassword
  };
}
