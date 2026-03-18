
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

export interface Atribuicao {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_abbrev: string;
  user_photo?: string;
  attribution: string;
  frequency: 'horaria' | '2xdia' | 'diaria' | '2xsemanal' | 'semanal' | 'quinzenal' | 'mensal';
  method: 'impresso' | 'sistema' | 'sistema-impresso' | 'email' | 'verbal';
  client: 'interno' | 'processo' | 'obra' | 'contrato' | 'geral';
  importance: 'essencial' | 'estrategico' | 'suporte' | 'informativo';
  duration: '<=1 hora' | '2 horas' | '4 horas' | '8 horas';
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  profile_image_url?: string;
}

export function useAtribuicoes() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [atribuicoes, setAtribuicoes] = useState<Atribuicao[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) {
        console.log('❌ Sem usuário autenticado');
        setCanManage(false);
        return;
      }

      console.log('🔍 Verificando permissões do usuário:', { userId: user.id, isAdmin });

      if (isAdmin) {
        console.log('✅ Usuário é admin - acesso total');
        setCanManage(true);
        return;
      }

      try {
        // Verificar se tem função de diretoria
        const { data: profile, error } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            functions!inner(name)
          `)
          .eq('id', user.id)
          .maybeSingle();

        console.log('👤 Perfil do usuário:', profile);

        if (error) {
          console.error('❌ Erro ao buscar perfil:', error);
          setCanManage(false);
        } else if (profile?.functions?.name === 'Diretoria') {
          console.log('✅ Usuário tem função de Diretoria - acesso de gerenciamento');
          setCanManage(true);
        } else {
          console.log('👀 Usuário tem acesso apenas de visualização');
          setCanManage(false);
        }
      } catch (error) {
        console.error('❌ Erro ao verificar permissões:', error);
        setCanManage(false);
      }
    };

    checkPermissions();
  }, [user, isAdmin]);

  const fetchAtribuicoes = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      console.log('📋 Buscando atribuições...');
      
      // Primeiro, buscar as atribuições
      const { data: atribuicoesData, error: atribuicoesError } = await supabase
        .from('atribuicoes')
        .select('*')
        .order('created_at', { ascending: false });

      if (atribuicoesError) {
        console.error('❌ Erro na query de atribuições:', atribuicoesError);
        toast.error('Erro ao carregar atribuições');
        return;
      }

      console.log('✅ Atribuições carregadas:', atribuicoesData?.length || 0);

      if (!atribuicoesData || atribuicoesData.length === 0) {
        console.log('📝 Nenhuma atribuição encontrada');
        setAtribuicoes([]);
        return;
      }

      // Depois, buscar os dados dos usuários
      const userIds = [...new Set(atribuicoesData.map(attr => attr.user_id))];
      console.log('👥 Buscando dados dos usuários:', userIds);

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, profile_image_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('❌ Erro ao buscar profiles:', profilesError);
        toast.error('Erro ao carregar dados dos usuários');
        return;
      }

      console.log('✅ Profiles carregados:', profilesData?.length || 0);

      // Criar um mapa de profiles para lookup rápido
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Transformar dados para o formato esperado
      const transformedData: Atribuicao[] = atribuicoesData.map(item => {
        const profile = profilesMap.get(item.user_id);
        return {
          id: item.id,
          user_id: item.user_id,
          user_name: profile?.full_name || 'Usuário não encontrado',
          user_email: profile?.email || '',
          user_abbrev: item.user_abbrev,
          user_photo: profile?.profile_image_url,
          attribution: item.attribution,
          frequency: item.frequency as any,
          method: item.method as any,
          client: item.client as any,
          importance: item.importance as any,
          duration: item.duration as any,
          created_at: item.created_at,
          updated_at: item.updated_at
        };
      });

      console.log('✅ Dados transformados:', transformedData.length);
      setAtribuicoes(transformedData);
    } catch (error) {
      console.error('❌ Erro ao buscar atribuições:', error);
      toast.error('Erro ao carregar atribuições');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!canManage) return;
    
    try {
      console.log('👥 Buscando usuários...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, profile_image_url')
        .eq('status', 'active')
        .order('full_name');

      if (error) {
        console.error('❌ Erro ao buscar usuários:', error);
        setUsers([]);
        return;
      }
      
      console.log('✅ Usuários carregados:', data?.length || 0);
      setUsers(data || []);
    } catch (error) {
      console.error('❌ Erro ao buscar usuários:', error);
      setUsers([]);
    }
  };

  const createAtribuicao = async (atribuicaoData: Omit<Atribuicao, 'id' | 'created_at' | 'updated_at' | 'user_name' | 'user_email' | 'user_photo'>) => {
    try {
      const { error } = await supabase
        .from('atribuicoes')
        .insert({
          user_id: atribuicaoData.user_id,
          user_abbrev: atribuicaoData.user_abbrev,
          attribution: atribuicaoData.attribution,
          frequency: atribuicaoData.frequency,
          method: atribuicaoData.method,
          client: atribuicaoData.client,
          importance: atribuicaoData.importance,
          duration: atribuicaoData.duration,
          created_by: user?.id
        });

      if (error) throw error;
      
      toast.success('Atribuição criada com sucesso');
      fetchAtribuicoes();
    } catch (error) {
      console.error('Erro ao criar atribuição:', error);
      toast.error('Erro ao criar atribuição');
    }
  };

  const updateAtribuicao = async (id: string, atribuicaoData: Partial<Omit<Atribuicao, 'id' | 'created_at' | 'updated_at' | 'user_name' | 'user_email' | 'user_photo'>>) => {
    try {
      const updateData: any = {};
      
      if (atribuicaoData.attribution !== undefined) updateData.attribution = atribuicaoData.attribution;
      if (atribuicaoData.frequency !== undefined) updateData.frequency = atribuicaoData.frequency;
      if (atribuicaoData.method !== undefined) updateData.method = atribuicaoData.method;
      if (atribuicaoData.client !== undefined) updateData.client = atribuicaoData.client;
      if (atribuicaoData.importance !== undefined) updateData.importance = atribuicaoData.importance;
      if (atribuicaoData.duration !== undefined) updateData.duration = atribuicaoData.duration;
      if (atribuicaoData.user_abbrev !== undefined) updateData.user_abbrev = atribuicaoData.user_abbrev;

      const { error } = await supabase
        .from('atribuicoes')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Atribuição atualizada com sucesso');
      fetchAtribuicoes();
    } catch (error) {
      console.error('Erro ao atualizar atribuição:', error);
      toast.error('Erro ao atualizar atribuição');
    }
  };

  const deleteAtribuicao = async (id: string) => {
    try {
      const { error } = await supabase
        .from('atribuicoes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Atribuição removida com sucesso');
      fetchAtribuicoes();
    } catch (error) {
      console.error('Erro ao remover atribuição:', error);
      toast.error('Erro ao remover atribuição');
    }
  };

  const updateUserAbbrev = async (userId: string, newAbbrev: string) => {
    try {
      const { error } = await supabase
        .from('atribuicoes')
        .update({ user_abbrev: newAbbrev.toUpperCase().substring(0, 3) })
        .eq('user_id', userId);

      if (error) throw error;
      
      toast.success('Identificação atualizada com sucesso');
      fetchAtribuicoes();
    } catch (error) {
      console.error('Erro ao atualizar identificação:', error);
      toast.error('Erro ao atualizar identificação');
    }
  };

  // Effect separado para buscar dados apenas quando necessário
  useEffect(() => {
    console.log('🔄 useEffect fetchAtribuicoes:', { user: !!user, loading });
    
    if (user && !loading) {
      fetchAtribuicoes();
    }
  }, [user]);

  // Effect separado para buscar usuários
  useEffect(() => {
    console.log('🔄 useEffect fetchUsers:', { canManage });
    
    if (canManage) {
      fetchUsers();
    }
  }, [canManage]);

  console.log('🏠 Hook state:', { 
    user: !!user, 
    isAdmin, 
    canManage, 
    loading, 
    atribuicoesCount: atribuicoes.length,
    usersCount: users.length 
  });

  return {
    atribuicoes,
    users,
    loading,
    canManage,
    createAtribuicao,
    updateAtribuicao,
    deleteAtribuicao,
    updateUserAbbrev,
    fetchAtribuicoes,
    fetchUsers
  };
}
