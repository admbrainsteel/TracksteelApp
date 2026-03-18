
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useProfileImage() {
  const [updating, setUpdating] = useState(false);

  const updateProfileImage = async (userId: string, imageUrl: string) => {
    try {
      setUpdating(true);

      const { error } = await supabase
        .from('profiles')
        .update({ profile_image_url: imageUrl })
        .eq('id', userId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error updating profile image:', error);
      toast.error('Erro ao atualizar foto de perfil');
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const removeProfileImage = async (userId: string) => {
    try {
      setUpdating(true);

      const { error } = await supabase
        .from('profiles')
        .update({ profile_image_url: null })
        .eq('id', userId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error removing profile image:', error);
      toast.error('Erro ao remover foto de perfil');
      return false;
    } finally {
      setUpdating(false);
    }
  };

  return {
    updating,
    updateProfileImage,
    removeProfileImage
  };
}
