import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { SMART_SUBMODULES } from '@/types/smartPermissions';

export function useUserSmartAccess() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<
    Record<string, { can_view: boolean; can_edit: boolean; can_delete: boolean }>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadPermissions() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await (supabase as any)
          .from('smart_user_permissions')
          .select('resource_key, can_view, can_edit, can_delete')
          .eq('user_id', user.id);

        if (error) throw error;

        const permsMap: Record<
          string,
          { can_view: boolean; can_edit: boolean; can_delete: boolean }
        > = {};

        // Preenche com padrão do operador primeiro
        SMART_SUBMODULES.forEach((sub) => {
          permsMap[sub.key] = { ...sub.padraoOperador };
        });

        // Sobrescreve com as regras salvas para este usuário
        (data || []).forEach((row: any) => {
          permsMap[row.resource_key] = {
            can_view: Boolean(row.can_view),
            can_edit: Boolean(row.can_edit),
            can_delete: Boolean(row.can_delete),
          };
        });

        if (mounted) {
          setPermissions(permsMap);
        }
      } catch (err) {
        console.error('Erro ao carregar permissões do usuário para o Modo Smart:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPermissions();

    return () => {
      mounted = false;
    };
  }, [user]);

  const canView = (key: string) => permissions[key]?.can_view ?? true;
  const canEdit = (key: string) => permissions[key]?.can_edit ?? false;
  const canDelete = (key: string) => permissions[key]?.can_delete ?? false;

  return {
    loading,
    permissions,
    canView,
    canEdit,
    canDelete,
  };
}
