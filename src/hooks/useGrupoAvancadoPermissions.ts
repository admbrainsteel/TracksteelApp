import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GRUPOS_AVANCADOS_CONFIG, GrupoAvancadoConfig } from '@/types/grupoAvancadoTypes';

export interface UserGrupoAvancado {
  userId: string;
  email: string;
  fullName: string;
  functionName: string;
  privilegeName: string;
  profileImageUrl: string | null;
  regras: Record<string, boolean>; // regraKey -> true/false
}

export function useGrupoAvancadoPermissions(grupoKey: string | null) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserGrupoAvancado[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const config: GrupoAvancadoConfig | undefined = grupoKey
    ? GRUPOS_AVANCADOS_CONFIG[grupoKey]
    : undefined;

  const carregarDados = useCallback(async () => {
    if (!config) return;

    try {
      setLoading(true);

      // 1. Carregar profiles com cargo e privilégio
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          profile_image_url,
          privileges:privilege_id (
            id,
            name
          ),
          user_functions:function_id (
            id,
            name
          )
        `)
        .order('full_name', { ascending: true });

      if (profError) throw profError;

      // 2. Carregar permissões das regras deste grupo na tabela user_interface_permissions
      const chavesRegras = config.regras.map((r) => r.key);
      const { data: permsData, error: permsError } = await supabase
        .from('user_interface_permissions')
        .select('user_id, resource_key, permission')
        .in('resource_key', chavesRegras);

      if (permsError) {
        console.warn('Aviso ao carregar permissões avançadas:', permsError);
      }

      // Indexar permissões por user_id -> resource_key -> ativo
      const userPermsMap: Record<string, Record<string, boolean>> = {};
      (permsData || []).forEach((p: any) => {
        if (!userPermsMap[p.user_id]) userPermsMap[p.user_id] = {};
        userPermsMap[p.user_id][p.resource_key] =
          p.permission === 'can_create_update_delete' ||
          p.permission === 'can_admin' ||
          p.permission === 'can_create_only' ||
          p.permission === 'can_view_only';
      });

      // Mapear colaboradores
      const mapped: UserGrupoAvancado[] = (profiles || []).map((p: any) => {
        const privName = p.privileges?.name || 'Padrão';
        const isAdmin = privName.toLowerCase().includes('admin');
        const userRules: Record<string, boolean> = {};

        config.regras.forEach((r) => {
          if (userPermsMap[p.id] && userPermsMap[p.id][r.key] !== undefined) {
            userRules[r.key] = userPermsMap[p.id][r.key];
          } else if (isAdmin) {
            userRules[r.key] = true;
          } else {
            userRules[r.key] = Boolean(r.padraoAtivo);
          }
        });

        return {
          userId: p.id,
          email: p.email || '',
          fullName: p.full_name || p.email?.split('@')[0] || 'Usuário',
          functionName: p.user_functions?.name || 'Sem Cargo',
          privilegeName: privName,
          profileImageUrl: p.profile_image_url,
          regras: userRules,
        };
      });

      setUsers(mapped);
      if (!selectedUserId && mapped.length > 0) {
        setSelectedUserId(mapped[0].userId);
      }
    } catch (err: any) {
      console.error('Erro ao carregar permissões avançadas do grupo:', err);
      toast.error('Erro ao carregar governança avançada.');
    } finally {
      setLoading(false);
    }
  }, [config, selectedUserId]);

  useEffect(() => {
    if (grupoKey) {
      carregarDados();
    }
  }, [grupoKey]);

  const selectedUser = useMemo(
    () => users.find((u) => u.userId === selectedUserId) || null,
    [users, selectedUserId]
  );

  // Toggle de uma regra específica para o usuário selecionado
  const toggleRegra = (regraKey: string) => {
    if (!selectedUserId) return;

    setUsers((prev) =>
      prev.map((u) => {
        if (u.userId !== selectedUserId) return u;
        return {
          ...u,
          regras: {
            ...u.regras,
            [regraKey]: !u.regras[regraKey],
          },
        };
      })
    );
  };

  // Aplica um template pré-definido para o usuário selecionado
  const aplicarTemplate = (templateId: string) => {
    if (!config || !selectedUserId) return;
    const tpl = config.templates.find((t) => t.id === templateId);
    if (!tpl) return;

    const novasRegras: Record<string, boolean> = {};
    config.regras.forEach((r) => {
      novasRegras[r.key] = tpl.regrasAtivas.includes(r.key);
    });

    setUsers((prev) =>
      prev.map((u) => {
        if (u.userId !== selectedUserId) return u;
        return {
          ...u,
          regras: novasRegras,
        };
      })
    );

    toast.info(`Template "${tpl.nome}" aplicado. Clique em Salvar para gravar.`);
  };

  // Salvar alterações no banco de dados
  const salvarConfiguracaoUsuario = async () => {
    if (!config || !selectedUser) return;

    try {
      setSaving(true);

      // Upsert para cada regra na tabela user_interface_permissions
      const promises = config.regras.map(async (r) => {
        const estaAtivo = Boolean(selectedUser.regras[r.key]);
        const permission = estaAtivo ? 'can_create_update_delete' : 'no_access';

        // Garantir que a chave exista em interface_resources para evitar erro de Foreign Key
        await supabase
          .from('interface_resources')
          .upsert(
            {
              resource_key: r.key,
              resource_name: r.nome,
              is_submenu: false,
            },
            { onConflict: 'resource_key' }
          );

        return supabase
          .from('user_interface_permissions')
          .upsert(
            {
              user_id: selectedUser.userId,
              resource_key: r.key,
              permission: permission as any,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,resource_key' }
          );
      });

      const results = await Promise.all(promises);
      const hasError = results.some((res) => res.error);

      if (hasError) {
        throw new Error('Falha ao persistir algumas regras no banco.');
      }

      toast.success(`Configurações avançadas salvas para ${selectedUser.fullName}!`);
    } catch (err: any) {
      console.error('Erro ao salvar regras avançadas:', err);
      toast.error('Erro ao salvar alterações no banco.');
    } finally {
      setSaving(false);
    }
  };

  return {
    config,
    loading,
    saving,
    users,
    selectedUserId,
    setSelectedUserId,
    selectedUser,
    toggleRegra,
    aplicarTemplate,
    salvarConfiguracaoUsuario,
    recarregar: carregarDados,
  };
}
