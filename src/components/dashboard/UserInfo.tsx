
import { useState, useEffect, useRef } from 'react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatInTimeZone } from 'date-fns-tz';

interface UserProfile {
  full_name: string | null;
  email: string | null;
  profile_image_url: string | null;
}

const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

export function UserInfo() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loginTime, setLoginTime] = useState<string>('00:00:00');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const loginStartTimeRef = useRef<number>(0);

  // Inicializar tempo de login baseado no localStorage (preserva tempo entre navegações)
  function initializeLoginTime() {
    const savedLoginTime = localStorage.getItem('userLoginTime');
    
    if (savedLoginTime) {
      // Usar tempo salvo do localStorage
      loginStartTimeRef.current = parseInt(savedLoginTime);
    } else {
      // Se não há tempo salvo, definir tempo atual (primeira vez)
      const currentTime = Date.now();
      loginStartTimeRef.current = currentTime;
      localStorage.setItem('userLoginTime', currentTime.toString());
    }
    
    // Limpar interval anterior se existir
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Iniciar cronômetro
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - loginStartTimeRef.current;
      const hours = Math.floor(elapsed / (1000 * 60 * 60));
      const minutes = Math.floor(elapsed % (1000 * 60 * 60) / (1000 * 60));
      const seconds = Math.floor(elapsed % (1000 * 60) / 1000);
      setLoginTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);
  }

  // Resetar tempo de login apenas em eventos reais de login
  function resetLoginTime() {
    // Limpar interval anterior se existir
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Definir novo tempo de início
    const currentTime = Date.now();
    loginStartTimeRef.current = currentTime;
    localStorage.setItem('userLoginTime', currentTime.toString());
    
    // Iniciar novo cronômetro
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - loginStartTimeRef.current;
      const hours = Math.floor(elapsed / (1000 * 60 * 60));
      const minutes = Math.floor(elapsed % (1000 * 60 * 60) / (1000 * 60));
      const seconds = Math.floor(elapsed % (1000 * 60) / 1000);
      setLoginTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);
  }

  async function fetchUserProfile() {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, email, profile_image_url')
      .eq('id', user.id)
      .single();

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
  }

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      initializeLoginTime(); // Inicializar timer baseado no localStorage
    } else {
      // Limpar timer quando não há usuário
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Listener para eventos de autenticação do Supabase
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Reset timer apenas em login real
        resetLoginTime();
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Limpe o interval quando desmontado
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  if (!user || !profile) return null;

  return (
    <div className="space-y-3 p-3 rounded-lg bg-green-100 text-gray-800 dark:bg-teal-900 dark:text-white">
      <div className="flex items-center space-x-3">
        <UserAvatar 
          imageUrl={profile.profile_image_url || undefined} 
          name={profile.full_name || profile.email || 'Usuário'} 
          email={profile.email || ''} 
          size="sm" 
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800 dark:text-white truncate text-sm">
            {profile.full_name || 'TrackSteel User'}
          </p>
          <p className="text-xs text-gray-600 dark:text-white/80 truncate">
            {profile.email}
          </p>
        </div>
      </div>
      
      <div className="space-y-2 text-xs text-gray-600 dark:text-white/80">
        <p>
          <span>Logado há:</span> {loginTime}
        </p>
        <LogoutButton 
          variant="ghost" 
          size="sm" 
          showText={true}
          className="w-full text-xs hover:bg-sidebar-accent p-1 h-auto justify-start"
        />
      </div>
    </div>
  );
}
