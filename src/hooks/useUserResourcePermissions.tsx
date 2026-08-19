
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { UserInterfacePermission, PermissionLevel } from '@/hooks/useUserPermissions/types';
import { toast } from 'sonner';

interface UserWithProfile {
  id: string;
  email: string;
  full_name: string | null;
}

export function useUserResourcePermissions(resourceKey: string) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [resourcePermissions, setResourcePermissions] = useState<UserInterfacePermission[]>([]);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);
  const mountedRef = useRef(true);

  // Load all users for the dropdown
  const loadUsers = async () => {
    if (!mountedRef.current) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('status', 'active')
        .order('full_name');

      if (error) {
        console.error('Error loading users:', error);
        throw error;
      }

      if (mountedRef.current) {
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Erro ao carregar usuários');
    }
  };

  // Load resource permissions
  const loadResourcePermissions = async () => {
    if (!resourceKey || !mountedRef.current) return;

    try {
      const { data, error } = await supabase
        .from('user_interface_permissions')
        .select('*')
        .eq('resource_key', resourceKey);

      if (error) {
        console.error('Error loading resource permissions:', error);
        throw error;
      }

      if (!mountedRef.current) return;

      // Enriquecer com dados do usuário
      const enrichedData = await Promise.all(
        (data || []).map(async (permission) => {
          const { data: profileDataArr } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', permission.user_id)
            .limit(1);
          
          const profileData = profileDataArr && profileDataArr.length > 0 ? profileDataArr[0] : null;
          return {
            user_id: permission.user_id,
            resource_key: permission.resource_key,
            permission_level: permission.permission as PermissionLevel,
            created_at: permission.created_at,
            updated_at: permission.updated_at,
            profiles: profileData as any
          } as UserInterfacePermission;
        })
      );

      if (mountedRef.current) {
        setResourcePermissions(enrichedData);
      }
    } catch (error) {
      console.error('Error loading resource permissions:', error);
      toast.error('Erro ao carregar permissões do recurso');
    }
  };

  // Ensure resource exists in interface_resources table
  const ensureResourceExists = async (resourceKey: string): Promise<boolean> => {
    try {
      console.log('🔍 Verificando se o recurso existe:', resourceKey);
      
      // Check if resource exists
      const { data: existingResource, error: checkError } = await supabase
        .from('interface_resources')
        .select('resource_key')
        .eq('resource_key', resourceKey)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking resource:', checkError);
        return false;
      }

      if (existingResource) {
        console.log('✅ Recurso já existe:', existingResource);
        return true;
      }

      // Resource doesn't exist, create it
      console.log('📝 Criando recurso:', resourceKey);
      const { data: newResource, error: createError } = await supabase
        .from('interface_resources')
        .insert({
          resource_key: resourceKey,
          resource_name: resourceKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          parent_key: null,
          icon_name: 'Settings',
          route_path: null,
          is_submenu: false,
          order_index: 999
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating resource:', createError);
        return false;
      }

      console.log('✅ Recurso criado com sucesso:', newResource);
      return true;
    } catch (error) {
      console.error('Unexpected error ensuring resource exists:', error);
      return false;
    }
  };

  // Set permission for a user (simplified - just links user to resource)
  const setUserPermission = async (userId: string, permission: PermissionLevel): Promise<boolean> => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem gerenciar permissões');
      return false;
    }

    if (!userId || !resourceKey) {
      toast.error('Dados inválidos para vincular usuário');
      return false;
    }

    try {
      console.log('🚀 Vinculando usuário ao recurso:', { userId, resourceKey });

      // Ensure the resource exists first
      const resourceExists = await ensureResourceExists(resourceKey);
      if (!resourceExists) {
        toast.error('Erro ao criar/verificar recurso');
        return false;
      }

      // Verify user exists
      const { data: userExistsArr, error: userError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('id', userId)
        .limit(1);

      const userExists = userExistsArr && userExistsArr.length > 0 ? userExistsArr[0] : null;
      if (userError || !userExists) {
        console.error('User not found:', { userId, userError });
        toast.error('Usuário não encontrado');
        return false;
      }

      console.log('✅ Usuário verificado:', userExists);

      // Try to upsert the permission (always with default level, real permissions come from privileges)
      const { data, error } = await supabase
        .from('user_interface_permissions')
        .upsert({
          user_id: userId,
          resource_key: resourceKey,
          permission: 'can_view_only', // Default value, real permissions from privileges
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,resource_key'
        })
        .select();

      if (error) {
        console.error('❌ Erro ao vincular usuário:', {
          error,
          userId,
          resourceKey,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details
        });
        
        // Provide more specific error messages
        if (error.code === '23503') {
          toast.error('Erro de referência: Usuário ou recurso não encontrado');
        } else if (error.code === '23505') {
          toast.error('Usuário já vinculado a este recurso');
        } else {
          toast.error(`Erro ao vincular usuário: ${error.message}`);
        }
        return false;
      }

      console.log('✅ Usuário vinculado com sucesso:', data);
      toast.success('Usuário vinculado ao recurso com sucesso');
      
      if (mountedRef.current) {
        await loadResourcePermissions();
      }
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao vincular usuário:', error);
      toast.error('Erro inesperado ao vincular usuário ao recurso');
      return false;
    }
  };

  // Remove permission for a user (removes link to resource)
  const removeUserPermission = async (userId: string): Promise<boolean> => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem gerenciar permissões');
      return false;
    }

    if (!userId || !resourceKey) {
      toast.error('Dados inválidos para desvincular usuário');
      return false;
    }

    try {
      console.log('🗑️ Desvinculando usuário do recurso:', { userId, resourceKey });

      const { error } = await supabase
        .from('user_interface_permissions')
        .delete()
        .eq('user_id', userId)
        .eq('resource_key', resourceKey);

      if (error) {
        console.error('Error removing user permission:', error);
        toast.error(`Erro ao desvincular usuário: ${error.message}`);
        return false;
      }

      toast.success('Usuário desvinculado do recurso com sucesso');
      
      if (mountedRef.current) {
        await loadResourcePermissions();
      }
      return true;
    } catch (error) {
      console.error('Unexpected error removing user permission:', error);
      toast.error('Erro inesperado ao desvincular usuário do recurso');
      return false;
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    if (!user || !isAdmin || !resourceKey) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      if (!mountedRef.current) return;
      
      setLoading(true);
      try {
        await Promise.all([loadUsers(), loadResourcePermissions()]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    loadData();

    // Clean up existing channel first
    const cleanupChannel = () => {
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          console.warn('Error removing channel:', error);
        }
        channelRef.current = null;
      }
    };

    cleanupChannel();

    // Set up realtime subscription with unique channel name
    const channelName = `resource-permissions-${resourceKey}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      channelRef.current = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_interface_permissions',
            filter: `resource_key=eq.${resourceKey}`
          },
          (payload) => {
            console.log('Real-time permission change:', payload);
            if (mountedRef.current) {
              loadResourcePermissions();
            }
          }
        )
        .subscribe();

      if (import.meta.env.DEV) {
        console.log('📡 Real-time subscription created for resource:', resourceKey, channelName);
      }
    } catch (error) {
      console.error('Error setting up real-time subscription:', error);
    }

    return () => {
      mountedRef.current = false;
      cleanupChannel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin, resourceKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          console.warn('Error removing channel on unmount:', error);
        }
        channelRef.current = null;
      }
    };
  }, []);

  return {
    users,
    resourcePermissions,
    loading,
    setUserPermission,
    removeUserPermission,
    reload: () => {
      if (mountedRef.current) {
        return Promise.all([loadUsers(), loadResourcePermissions()]);
      }
      return Promise.resolve();
    }
  };
}
