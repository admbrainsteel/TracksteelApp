
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

  useEffect(() => {
    async function fetchUserProfile() {
      if (!user) return;
      const { data: profileArr, error } = await supabase
        .from('profiles')
        .select('full_name, email, profile_image_url')
        .eq('id', user.id)
        .limit(1);

      if (!error && profileArr && profileArr.length > 0) {
        setProfile(profileArr[0]);
      } else {
        setProfile({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          full_name: (user as any).name || (user as any).username || null,
          email: user.email || null,
          profile_image_url: null
        });
      }
    }

    function initializeLoginTime() {
      const savedLoginTime = localStorage.getItem('userLoginTime');
      if (savedLoginTime) {
        loginStartTimeRef.current = parseInt(savedLoginTime);
      } else {
        const currentTime = Date.now();
        loginStartTimeRef.current = currentTime;
        localStorage.setItem('userLoginTime', currentTime.toString());
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - loginStartTimeRef.current;
        const hours = Math.floor(elapsed / (1000 * 60 * 60));
        const minutes = Math.floor(elapsed % (1000 * 60 * 60) / (1000 * 60));
        const seconds = Math.floor(elapsed % (1000 * 60) / 1000);
        setLoginTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
    }

    if (user) {
      fetchUserProfile();
      initializeLoginTime();
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
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
