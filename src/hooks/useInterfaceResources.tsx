import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InterfaceResource {
  id: string;
  resource_key: string;
  resource_name: string;
  parent_key: string | null;
  icon_name: string | null;
  route_path: string | null;
  is_submenu: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface PrivilegeInterfaceResource {
  id: string;
  privilege_id: string;
  resource_key: string;
  created_at: string;
}

export function useInterfaceResources() {
  const [resources, setResources] = useState<InterfaceResource[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all interface resources (garantindo unicidade)
  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('interface_resources')
        .select('*')
        .order('order_index');

      if (error) throw error;
      
      // Garantir que não há duplicatas por resource_key
      const uniqueResourcesMap = new Map();
      data?.forEach(resource => {
        if (!uniqueResourcesMap.has(resource.resource_key)) {
          uniqueResourcesMap.set(resource.resource_key, resource);
        }
      });
      
      const uniqueResources = Array.from(uniqueResourcesMap.values());
      setResources(uniqueResources);
      
      console.log(`Carregados ${uniqueResources.length} recursos únicos`);
    } catch (error) {
      console.error('Error fetching interface resources:', error);
      toast.error('Erro ao carregar recursos de interface');
    }
  };

  // Get privilege interface resources
  const getPrivilegeResources = async (privilegeId: string): Promise<string[]> => {
    try {
      console.log(`Loading resources for privilege ID: ${privilegeId}`);
      
      const { data, error } = await supabase
        .from('privilege_interface_resources')
        .select('resource_key')
        .eq('privilege_id', privilegeId);

      if (error) {
        console.error('Error fetching privilege resources:', error);
        throw error;
      }
      
      // Remover duplicatas dos recursos retornados
      const uniqueKeys = [...new Set(data?.map(item => item.resource_key) || [])];
      console.log(`Found ${uniqueKeys.length} unique resources for privilege:`, uniqueKeys);
      return uniqueKeys;
    } catch (error) {
      console.error('Error fetching privilege resources:', error);
      return [];
    }
  };

  // Update privilege interface resources
  const updatePrivilegeResources = async (privilegeId: string, resourceKeys: string[]) => {
    try {
      console.log(`Updating privilege ${privilegeId} with resources:`, resourceKeys);
      
      // First, delete existing associations
      const { error: deleteError } = await supabase
        .from('privilege_interface_resources')
        .delete()
        .eq('privilege_id', privilegeId);

      if (deleteError) {
        console.error('Error deleting existing resources:', deleteError);
        throw deleteError;
      }

      // Then, insert new associations (sem duplicatas)
      if (resourceKeys.length > 0) {
        const uniqueKeys = [...new Set(resourceKeys)]; // Remove duplicatas
        const insertData = uniqueKeys.map(resourceKey => ({
          privilege_id: privilegeId,
          resource_key: resourceKey
        }));

        console.log('Inserting privilege resources:', insertData);

        const { error: insertError } = await supabase
          .from('privilege_interface_resources')
          .insert(insertData);

        if (insertError) {
          console.error('Error inserting privilege resources:', insertError);
          throw insertError;
        }

        console.log(`Successfully updated ${uniqueKeys.length} resources for privilege ${privilegeId}`);
      } else {
        console.log(`No resources to insert for privilege ${privilegeId}`);
      }

      toast.success('Recursos de interface atualizados com sucesso!');
    } catch (error) {
      console.error('Error updating privilege resources:', error);
      toast.error('Erro ao atualizar recursos de interface');
      throw error;
    }
  };

  // Check if user has access to a specific resource
  const checkUserAccess = async (userId: string, resourceKey: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .rpc('user_has_interface_access', {
          _user_id: userId,
          _resource_key: resourceKey
        });

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error checking user access:', error);
      return false;
    }
  };

  // Get user accessible resources
  const getUserAccessibleResources = async (userId: string): Promise<string[]> => {
    try {
      // Primeiro verifica se o usuário é admin
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) throw rolesError;

      const roles = userRoles?.map(r => r.role) || [];
      
      // Se é admin, retorna todos os recursos únicos (lista fixa)
      if (roles.includes('admin')) {
        return [
          'dashboard',
          'cadastro',
          'cadastro-of',
          'cadastro-pecas',
          'equipamentos',
          'ferramentas',
          'ferramentas-conversores',
          'ferramentas-inconsistencias',
          'estoque',
          'estoque-solicitacao-compras',
          'ofs',
          'ofs-lista',
          'ofs-cronograma',
          'ofs-concluidas',
          'producao',
          'producao-visao',
          'diario-producao',
          'producao-apontamento',
          'producao-dashboard',
          'prioridades-fabricacao',
          'painel-industrial',
          'expedicao',
          'obra',
          'obra-dashboard',
          'obra-configuracoes',
          'tarefas',
          'tarefas-lista',
          'tarefas-historico',
          'biblioteca',
          'biblioteca-catalogos',
          'biblioteca-normas',
          'biblioteca-referencias',
          'sistema',
          'sugestoes',
          'atribuicoes',
          'mapa-interativo',
          'configuracoes',
          'configuracoes-gerais',
          'theme-customization',
          'admin',
          'user-management'
        ];
      }

      // Para usuários não-admin, busca os recursos baseados no privilégio
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('privilege_id')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (!profile?.privilege_id) return [];

      const { data, error } = await supabase
        .from('privilege_interface_resources')
        .select('resource_key')
        .eq('privilege_id', profile.privilege_id);

      if (error) throw error;
      
      // Remover duplicatas dos recursos retornados
      const uniqueKeys = [...new Set(data?.map(item => item.resource_key) || [])];
      return uniqueKeys;
    } catch (error) {
      console.error('Error getting user accessible resources:', error);
      return [];
    }
  };

  useEffect(() => {
    const loadResources = async () => {
      setLoading(true);
      await fetchResources();
      setLoading(false);
    };

    loadResources();
  }, []);

  return {
    resources,
    loading,
    fetchResources,
    getPrivilegeResources,
    updatePrivilegeResources,
    checkUserAccess,
    getUserAccessibleResources
  };
}
