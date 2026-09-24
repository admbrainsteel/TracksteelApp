import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useInterfaceResources } from './useInterfaceResources';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  profile_image_url: string | null;
  function_id: string | null;
  privilege_id: string | null;
  status: 'pending' | 'active' | 'inactive' | 'rejected';
  requested_at: string;
  created_at: string;
  updated_at: string;
  functions?: {
    name: string;
    description: string;
  };
  privileges?: {
    name: string;
    description: string;
    permissions: Record<string, unknown>;
  };
}

export interface UserFunction {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPrivilege {
  id: string;
  name: string;
  description: string | null;
  permissions: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserDependency {
  table_name: string;
  dependency_type: string;
  count: number;
  description: string;
}

export function useUserManagement() {
  const deleteUserAndLogtoAccount = async (userId: string, email: string) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // 1. Deleta do Logto primeiro
      const response = await fetch(`${supabaseUrl}/functions/v1/delete-logto-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        console.error("Failed to delete from Logto", await response.text());
        toast.error("Erro ao excluir do Logto. A exclusão no sistema continuará.");
      }

      // 2. Deleta do Supabase
      return await deleteUser(userId, true);
    } catch (err) {
      console.error(err);
      toast.error("Erro na comunicação com o servidor de autenticação");
      return false;
    }
  };

  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [functions, setFunctions] = useState<UserFunction[]>([]);
  const [privileges, setPrivileges] = useState<UserPrivilege[]>([]);
  const [loading, setLoading] = useState(true);

  const { updatePrivilegeResources } = useInterfaceResources();

  // Fetch all users
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          functions:function_id (name, description),
          privileges:privilege_id (name, description, permissions)
        `)
        .neq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data as any) || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    }
  };

  // Fetch pending users
  const fetchPendingUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setPendingUsers(data || []);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      toast.error('Erro ao carregar solicitações pendentes');
    }
  };

  // Fetch functions
  const fetchFunctions = async () => {
    try {
      const { data, error } = await supabase
        .from('functions')
        .select('*')
        .order('name');

      if (error) throw error;
      setFunctions(data || []);
    } catch (error) {
      console.error('Error fetching functions:', error);
      toast.error('Erro ao carregar funções');
    }
  };

  // Fetch privileges
  const fetchPrivileges = async () => {
    try {
      const { data, error } = await supabase
        .from('privileges')
        .select('*')
        .order('name');

      if (error) throw error;
      setPrivileges((data as any) || []);
    } catch (error) {
      console.error('Error fetching privileges:', error);
      toast.error('Erro ao carregar privilégios');
    }
  };

  // Get user dependencies
  const getUserDependencies = async (userId: string): Promise<UserDependency[]> => {
    try {
      const { data, error } = await supabase.rpc('get_user_dependencies', {
        _user_id: userId
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user dependencies:', error);
      return [];
    }
  };

  // Replace user with UserDel
  const replaceUserWithDeleted = async (userId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('replace_user_with_deleted', {
        _user_id: userId
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error replacing user with deleted:', error);
      toast.error('Erro ao substituir referências do usuário');
      return false;
    }
  };

  // Create new user (Admin only)
  const createUser = async (data: { 
    email: string; 
    full_name?: string; 
    function_id?: string; 
    privilege_id?: string; 
  }) => {
    try {
      const { data: result, error } = await supabase.rpc('admin_create_user', {
        user_email: data.email,
        _caller_id: user?.id,
        user_full_name: data.full_name || null,
        user_function_id: data.function_id || null,
        user_privilege_id: data.privilege_id || null
      });

      if (error) throw error;
      
      toast.success('Usuário criado com sucesso! Senha padrão: 1234');
      fetchUsers();
      return result;
    } catch (error: unknown) {
      console.error('Error creating user:', error);
      
      const err = error as Error;
      if (err.message?.includes('User with this email already exists')) {
        toast.error('Este e-mail já está em uso');
      } else if (err.message?.includes('Only admins can create new users')) {
        toast.error('Apenas administradores podem criar usuários');
      } else {
        toast.error('Erro ao criar usuário');
      }
      throw error;
    }
  };

  // Check if user can be deleted
  const canDeleteUser = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('can_delete_user', {
        _user_id: userId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking if user can be deleted:', error);
      return false;
    }
  };

  // Delete user (Admin only)
  const deleteUser = async (userId: string, replaceReferences: boolean = false) => {
    try {
      // If replaceReferences is true, replace user references first
      if (replaceReferences) {
        const replaced = await replaceUserWithDeleted(userId);
        if (!replaced) {
          return false;
        }
      }

      // First check if user can be deleted
      const canDelete = await canDeleteUser(userId);
      
      if (!canDelete) {
        toast.error('Este usuário não pode ser excluído pois possui dados vinculados no sistema');
        return false;
      }

      const { data, error } = await supabase.rpc('admin_delete_user', {
        _caller_id: user?.id,
        _user_id: userId
      });

      if (error) throw error;
      
      toast.success('Usuário excluído com sucesso!');
      fetchUsers();
      fetchPendingUsers();
      return true;
    } catch (error: unknown) {
      console.error('Error deleting user:', error);
      
      const err = error as Error;
      if (err.message?.includes('Only admins can delete users')) {
        toast.error('Apenas administradores podem excluir usuários');
      } else if (err.message?.includes('User cannot be deleted due to existing dependencies')) {
        toast.error('Este usuário não pode ser excluído pois possui dados vinculados no sistema');
      } else {
        toast.error('Erro ao excluir usuário');
      }
      return false;
    }
  };

  // Approve user
  const approveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success('Usuário aprovado com sucesso!');
      fetchUsers();
      fetchPendingUsers();
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Erro ao aprovar usuário');
    }
  };

  // Reject user
  const rejectUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success('Usuário rejeitado');
      fetchUsers();
      fetchPendingUsers();
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Erro ao rejeitar usuário');
    }
  };

  // Update user
  const updateUser = async (userId: string, data: Partial<UserProfile>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', userId);

      if (error) throw error;
      
      toast.success('Usuário atualizado com sucesso!');
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Erro ao atualizar usuário');
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await updateUser(userId, { status: newStatus as UserProfile['status'] });
  };

  // CRUD functions for Functions table
  const createFunction = async (data: { name: string; description?: string }) => {
    try {
      const { error } = await supabase
        .from('functions')
        .insert(data);

      if (error) throw error;
      
      toast.success('Função criada com sucesso!');
      fetchFunctions();
    } catch (error) {
      console.error('Error creating function:', error);
      toast.error('Erro ao criar função');
    }
  };

  const updateFunction = async (id: string, data: { name: string; description?: string }) => {
    try {
      const { error } = await supabase
        .from('functions')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Função atualizada com sucesso!');
      fetchFunctions();
    } catch (error) {
      console.error('Error updating function:', error);
      toast.error('Erro ao atualizar função');
    }
  };

  const deleteFunction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('functions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Função removida com sucesso!');
      fetchFunctions();
    } catch (error) {
      console.error('Error deleting function:', error);
      toast.error('Erro ao remover função');
    }
  };

  // CRUD functions for Privileges table - Updated to handle interface resources
  const createPrivilege = async (data: { name: string; description?: string; permissions?: Record<string, unknown> }, resourceKeys: string[] = []) => {
    try {
      const { data: newPrivilege, error } = await supabase
        .from('privileges')
        .insert({
          ...data,
          permissions: (data.permissions as any) || {}
        })
        .select()
        .single();

      if (error) throw error;

      // Update interface resources if provided
      if (resourceKeys.length > 0 && newPrivilege) {
        await updatePrivilegeResources(newPrivilege.id, resourceKeys);
      }
      
      toast.success('Privilégio criado com sucesso!');
      fetchPrivileges();
      return newPrivilege;
    } catch (error) {
      console.error('Error creating privilege:', error);
      toast.error('Erro ao criar privilégio');
      throw error;
    }
  };

  const updatePrivilege = async (id: string, data: { name: string; description?: string; permissions?: Record<string, unknown> }) => {
    try {
      const { error } = await supabase
        .from('privileges')
        .update(data as any)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Privilégio atualizado com sucesso!');
      fetchPrivileges();
    } catch (error) {
      console.error('Error updating privilege:', error);
      toast.error('Erro ao atualizar privilégio');
    }
  };

  const deletePrivilege = async (id: string) => {
    try {
      const { error } = await supabase
        .from('privileges')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Privilégio removido com sucesso!');
      fetchPrivileges();
    } catch (error) {
      console.error('Error deleting privilege:', error);
      toast.error('Erro ao remover privilégio');
    }
  };

  useEffect(() => {
    if (user) {
      const loadData = async () => {
        setLoading(true);
        await Promise.all([
          fetchUsers(),
          fetchPendingUsers(),
          fetchFunctions(),
          fetchPrivileges()
        ]);
        setLoading(false);
      };
      
      loadData();
    }
  }, [user]);

  return {
    users,
    pendingUsers,
    functions,
    privileges,
    loading,
    createUser,
    approveUser,
    rejectUser,
    updateUser,
    toggleUserStatus,
    deleteUser,
    deleteUserAndLogtoAccount,
    canDeleteUser,
    getUserDependencies,
    replaceUserWithDeleted,
    createFunction,
    updateFunction,
    deleteFunction,
    createPrivilege,
    updatePrivilege,
    deletePrivilege,
    refetchData: () => {
      fetchUsers();
      fetchPendingUsers();
      fetchFunctions();
      fetchPrivileges();
    }
  };
}
