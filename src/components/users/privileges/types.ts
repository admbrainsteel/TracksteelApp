
export interface Privilege {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export const FUNCTIONAL_PERMISSIONS = [
  { key: 'can_admin', label: 'Administrador Total', description: 'Acesso completo ao sistema' },
  { key: 'can_create_update_delete', label: 'Criar/Editar/Excluir', description: 'Pode criar, editar e excluir dados' },
  { key: 'can_create_only', label: 'Apenas Criar', description: 'Pode criar e visualizar dados' },
  { key: 'can_view_only', label: 'Apenas Visualizar', description: 'Pode apenas visualizar dados' }
];
