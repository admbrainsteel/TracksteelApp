
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  full_name: string | null;
  email: string | null;
  profile_image_url: string | null;
}

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, profile_image_url')
        .eq('id', user.id)
        .maybeSingle();
      
      if (!error && data) {
        setProfile(data);
      } else {
        // Fallback para dados do usuário auth
        setProfile({
          full_name: user.user_metadata?.full_name || null,
          email: user.email || null,
          profile_image_url: null
        });
      }
    } catch (error) {
      console.error('Erro ao buscar perfil do usuário:', error);
      // Fallback para dados do usuário auth
      setProfile({
        full_name: user.user_metadata?.full_name || null,
        email: user.email || null,
        profile_image_url: null
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para extrair o primeiro nome
  const getFirstName = () => {
    if (!profile?.full_name) return null;
    return profile.full_name.split(' ')[0];
  };

  return {
    profile,
    loading,
    firstName: getFirstName(),
    refetch: fetchUserProfile
  };
}
