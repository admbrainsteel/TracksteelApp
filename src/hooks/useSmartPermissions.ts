import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SMART_SUBMODULES, SmartUserConfig } from '@/types/smartPermissions';

export function useSmartPermissions() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<SmartUserConfig[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Carregar profiles com functions
      const { data: profiles, error: profError } = await (supabase as any)
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          profile_image_url,
          whatsapp_number,
          notif_email_apontamentos,
          notif_email_metricas,
          notif_whatsapp_apontamentos,
          notif_whatsapp_metricas,
          functions:function_id ( name )
        `)
        .order('full_name', { ascending: true });

      if (profError) throw profError;

      // 2. Carregar permissões da tabela smart_user_permissions
      const { data: perms, error: permError } = await (supabase as any)
        .from('smart_user_permissions')
        .select('*');

      if (permError) throw permError;

      // Montar mapa de permissões por usuário
      const permsByUser: Record<string, Record<string, { can_view: boolean; can_edit: boolean; can_delete: boolean }>> = {};
      
      (perms || []).forEach((p: any) => {
        if (!permsByUser[p.user_id]) {
          permsByUser[p.user_id] = {};
        }
        permsByUser[p.user_id][p.resource_key] = {
          can_view: Boolean(p.can_view),
          can_edit: Boolean(p.can_edit),
          can_delete: Boolean(p.can_delete),
        };
      });

      const formattedUsers: SmartUserConfig[] = (profiles || []).map((prof: any) => {
        const userPerms = permsByUser[prof.id] || {};
        const mergedPerms: Record<string, { can_view: boolean; can_edit: boolean; can_delete: boolean }> = {};

        SMART_SUBMODULES.forEach((sub) => {
          if (userPerms[sub.key]) {
            mergedPerms[sub.key] = userPerms[sub.key];
          } else {
            // Default fallback
            mergedPerms[sub.key] = { ...sub.padraoOperador };
          }
        });

        return {
          userId: prof.id,
          email: prof.email || '',
          fullName: prof.full_name || prof.email?.split('@')[0] || 'Sem Nome',
          functionName: prof.functions?.name || 'Não atribuído',
          profileImageUrl: prof.profile_image_url,
          whatsappNumber: prof.whatsapp_number || '',
          notifEmailApontamentos: prof.notif_email_apontamentos !== false,
          notifEmailMetricas: prof.notif_email_metricas !== false,
          notifWhatsappApontamentos: prof.notif_whatsapp_apontamentos !== false,
          notifWhatsappMetricas: prof.notif_whatsapp_metricas !== false,
          permissions: mergedPerms,
        };
      });

      setUsers(formattedUsers);
      if (formattedUsers.length > 0 && !selectedUserId) {
        setSelectedUserId(formattedUsers[0].userId);
      }
    } catch (err: any) {
      console.error('Erro ao carregar permissões do Modo Smart:', err);
      toast.error('Não foi possível carregar as permissões do Modo Smart.');
    } finally {
      setLoading(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    carregarDados();
  }, []);

  const selectedUser = users.find((u) => u.userId === selectedUserId) || null;

  // Atualizar permissão no estado local
  const togglePermission = (
    userId: string,
    resourceKey: string,
    field: 'can_view' | 'can_edit' | 'can_delete'
  ) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.userId !== userId) return u;
        const current = u.permissions[resourceKey] || { can_view: false, can_edit: false, can_delete: false };
        const updated = {
          ...current,
          [field]: !current[field],
        };
        // Se desativar visualizar, desativa edição e exclusão por coerência
        if (field === 'can_view' && !updated.can_view) {
          updated.can_edit = false;
          updated.can_delete = false;
        }
        // Se ativar edição ou exclusão, ativa automaticamente visualizar
        if ((field === 'can_edit' || field === 'can_delete') && updated[field]) {
          updated.can_view = true;
        }

        return {
          ...u,
          permissions: {
            ...u.permissions,
            [resourceKey]: updated,
          },
        };
      })
    );
  };

  // Atualizar dados de notificação no estado local
  const updateNotificationConfig = (
    userId: string,
    field: 'whatsappNumber' | 'notifEmailApontamentos' | 'notifEmailMetricas' | 'notifWhatsappApontamentos' | 'notifWhatsappMetricas',
    value: any
  ) => {
    setUsers((prev) =>
      prev.map((u) => (u.userId === userId ? { ...u, [field]: value } : u))
    );
  };

  // Salvar permissões e perfil do usuário no banco
  const salvarConfiguracaoUsuario = async (userId: string) => {
    const userToSave = users.find((u) => u.userId === userId);
    if (!userToSave) return;

    try {
      setSaving(true);

      // 1. Atualizar Profile
      const { error: profError } = await (supabase as any)
        .from('profiles')
        .update({
          whatsapp_number: userToSave.whatsappNumber.trim() || null,
          notif_email_apontamentos: userToSave.notifEmailApontamentos,
          notif_email_metricas: userToSave.notifEmailMetricas,
          notif_whatsapp_apontamentos: userToSave.notifWhatsappApontamentos,
          notif_whatsapp_metricas: userToSave.notifWhatsappMetricas,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (profError) throw profError;

      // 2. Fazer Upsert das permissões na tabela smart_user_permissions
      const rowsToUpsert = Object.entries(userToSave.permissions).map(([resource_key, perm]) => ({
        user_id: userId,
        resource_key,
        can_view: perm.can_view,
        can_edit: perm.can_edit,
        can_delete: perm.can_delete,
        updated_at: new Date().toISOString(),
      }));

      const { error: permError } = await (supabase as any)
        .from('smart_user_permissions')
        .upsert(rowsToUpsert, { onConflict: 'user_id,resource_key' });

      if (permError) throw permError;

      toast.success(`Configurações de ${userToSave.fullName} salvas com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao salvar configurações do Modo Smart:', err);
      toast.error('Erro ao salvar configurações: ' + (err.message || 'Falha na requisição'));
    } finally {
      setSaving(false);
    }
  };

  // Aplicar Template Padrão (Chão de Fábrica ou Administrador)
  const aplicarTemplateSmart = (userId: string, tipo: 'operador' | 'admin' | 'leitura') => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.userId !== userId) return u;
        const newPerms: Record<string, { can_view: boolean; can_edit: boolean; can_delete: boolean }> = {};

        SMART_SUBMODULES.forEach((sub) => {
          if (tipo === 'operador') {
            newPerms[sub.key] = { ...sub.padraoOperador };
          } else if (tipo === 'admin') {
            newPerms[sub.key] = { can_view: true, can_edit: true, can_delete: true };
          } else if (tipo === 'leitura') {
            newPerms[sub.key] = { can_view: true, can_edit: false, can_delete: false };
          }
        });

        return {
          ...u,
          permissions: newPerms,
        };
      })
    );
    toast.info(`Template ${tipo.toUpperCase()} aplicado na tela. Clique em "Salvar" para confirmar.`);
  };

  return {
    loading,
    saving,
    users,
    selectedUserId,
    setSelectedUserId,
    selectedUser,
    togglePermission,
    updateNotificationConfig,
    salvarConfiguracaoUsuario,
    aplicarTemplateSmart,
    recarregar: carregarDados,
  };
}
