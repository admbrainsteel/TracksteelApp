import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  SMART_SUBMODULES,
  SMART_DEFAULT_TEMPLATES,
  SmartCustomTemplate,
  SmartUserConfig,
} from '@/types/smartPermissions';

const STORAGE_KEY_TEMPLATES = 'tracksteel_custom_smart_templates';

export function useSmartPermissions() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<SmartUserConfig[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<SmartCustomTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TEMPLATES);
      const customTemplates: SmartCustomTemplate[] = saved ? JSON.parse(saved) : [];
      return [...SMART_DEFAULT_TEMPLATES, ...customTemplates];
    } catch {
      return SMART_DEFAULT_TEMPLATES;
    }
  });

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
      const permsByUser: Record<
        string,
        Record<string, { can_view: boolean; can_edit: boolean; can_delete: boolean }>
      > = {};

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
        const mergedPerms: Record<
          string,
          { can_view: boolean; can_edit: boolean; can_delete: boolean }
        > = {};

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
        const current = u.permissions[resourceKey] || {
          can_view: false,
          can_edit: false,
          can_delete: false,
        };
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
    field:
      | 'whatsappNumber'
      | 'notifEmailApontamentos'
      | 'notifEmailMetricas'
      | 'notifWhatsappApontamentos'
      | 'notifWhatsappMetricas',
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
      const rowsToUpsert = Object.entries(userToSave.permissions).map(
        ([resource_key, perm]) => ({
          user_id: userId,
          resource_key,
          can_view: perm.can_view,
          can_edit: perm.can_edit,
          can_delete: perm.can_delete,
          updated_at: new Date().toISOString(),
        })
      );

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

  // Aplicar qualquer template
  const aplicarTemplate = (userId: string, template: SmartCustomTemplate) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.userId !== userId) return u;
        const newPerms: Record<
          string,
          { can_view: boolean; can_edit: boolean; can_delete: boolean }
        > = {};

        SMART_SUBMODULES.forEach((sub) => {
          if (template.permissions[sub.key]) {
            newPerms[sub.key] = { ...template.permissions[sub.key] };
          } else {
            newPerms[sub.key] = { can_view: false, can_edit: false, can_delete: false };
          }
        });

        return {
          ...u,
          permissions: newPerms,
        };
      })
    );
    toast.info(`Template "${template.nome}" aplicado. Clique em "Salvar Alterações" para confirmar.`);
  };

  // Criar e salvar novo template customizado
  const criarNovoTemplate = (
    nome: string,
    descricao: string,
    permissions: Record<string, { can_view: boolean; can_edit: boolean; can_delete: boolean }>
  ) => {
    if (!nome.trim()) {
      toast.error('Informe um nome para o template.');
      return false;
    }

    const novoTemplate: SmartCustomTemplate = {
      id: `custom_${Date.now()}`,
      nome: nome.trim(),
      descricao: descricao.trim() || 'Template personalizado pelo gestor.',
      icone: 'Sparkles',
      badge: 'Personalizado',
      isCustom: true,
      permissions: JSON.parse(JSON.stringify(permissions)),
    };

    const updated = [...templates, novoTemplate];
    setTemplates(updated);

    try {
      const customOnly = updated.filter((t) => t.isCustom);
      localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(customOnly));
      toast.success(`Novo template "${novoTemplate.nome}" criado com sucesso!`);
      return true;
    } catch (e) {
      console.error('Erro ao salvar template customizado:', e);
      return false;
    }
  };

  // Remover template customizado
  const removerTemplateCustom = (templateId: string) => {
    const updated = templates.filter((t) => t.id !== templateId);
    setTemplates(updated);
    try {
      const customOnly = updated.filter((t) => t.isCustom);
      localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(customOnly));
      toast.success('Template removido com sucesso.');
    } catch (e) {
      console.error('Erro ao remover template:', e);
    }
  };

  return {
    loading,
    saving,
    users,
    templates,
    selectedUserId,
    setSelectedUserId,
    selectedUser,
    togglePermission,
    updateNotificationConfig,
    salvarConfiguracaoUsuario,
    aplicarTemplate,
    criarNovoTemplate,
    removerTemplateCustom,
    recarregar: carregarDados,
  };
}
