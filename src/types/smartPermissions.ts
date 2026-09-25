export interface SmartSubmodule {
  key: string;
  nome: string;
  descricao: string;
  icone: string;
  padraoOperador: {
    can_view: boolean;
    can_edit: boolean;
    can_delete: boolean;
  };
}

export const SMART_SUBMODULES: SmartSubmodule[] = [
  {
    key: 'smart_of',
    nome: 'Ordens de Fabricação (OF)',
    descricao: 'Acesso à seleção, listagem e busca de OFs ativas',
    icone: 'FileText',
    padraoOperador: { can_view: true, can_edit: false, can_delete: false },
  },
  {
    key: 'smart_fases',
    nome: 'Fases & Etapas da Obra',
    descricao: 'Filtro e navegação pelas etapas/fases de fabricação',
    icone: 'Layers',
    padraoOperador: { can_view: true, can_edit: false, can_delete: false },
  },
  {
    key: 'smart_processos',
    nome: 'Processos de Fabricação',
    descricao: 'Visualização e seleção de processos (Corte, Solda, Pintura, etc.)',
    icone: 'Flame',
    padraoOperador: { can_view: true, can_edit: false, can_delete: false },
  },
  {
    key: 'smart_apontamento',
    nome: 'Apontamento de Peças',
    descricao: 'Realização de apontamentos normais de produção no chão de fábrica',
    icone: 'CheckCircle2',
    padraoOperador: { can_view: true, can_edit: true, can_delete: false },
  },
  {
    key: 'smart_forcar_apontamento',
    nome: 'Forçar Apontamento (Avanço sem restrição)',
    descricao: 'Permissão para avançar peças furando fila ou com pendências de processos anteriores',
    icone: 'Zap',
    padraoOperador: { can_view: false, can_edit: false, can_delete: false },
  },
  {
    key: 'smart_3d',
    nome: 'Modelo 3D BIM',
    descricao: 'Visualizador interativo 3D de peças, montagens e conjuntos',
    icone: 'Box',
    padraoOperador: { can_view: true, can_edit: false, can_delete: false },
  },
  {
    key: 'smart_modo_completo',
    nome: 'Acesso ao Modo Completo ERP',
    descricao: 'Permissão para alternar da interface touch para o ERP gerencial',
    icone: 'ExternalLink',
    padraoOperador: { can_view: false, can_edit: false, can_delete: false },
  },
  {
    key: 'smart_romaneios',
    nome: 'Romaneios & Embarque',
    descricao: 'Acesso e conferência de romaneios de expedição de peças',
    icone: 'Truck',
    padraoOperador: { can_view: true, can_edit: false, can_delete: false },
  },
  {
    key: 'smart_montagem',
    nome: 'Montagem & Canteiro',
    descricao: 'Apontamentos e checklists de montagem externa',
    icone: 'Wrench',
    padraoOperador: { can_view: true, can_edit: true, can_delete: false },
  },
  {
    key: 'smart_relatorios',
    nome: 'Relatórios & Exportação PDF',
    descricao: 'Geração de resumos de produção, checklists e exportação de relatórios',
    icone: 'FileSpreadsheet',
    padraoOperador: { can_view: true, can_edit: true, can_delete: false },
  },
];

export interface SmartCustomTemplate {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  badge?: string;
  isCustom?: boolean;
  permissions: Record<string, { can_view: boolean; can_edit: boolean; can_delete: boolean }>;
}

export const SMART_DEFAULT_TEMPLATES: SmartCustomTemplate[] = [
  {
    id: 'operador_padrao',
    nome: 'Padrão Operador',
    descricao: 'Focado em apontamento de peças, montagem e relatórios básicos.',
    icone: 'Factory',
    badge: 'Chão de Fábrica',
    isCustom: false,
    permissions: {
      smart_of: { can_view: true, can_edit: false, can_delete: false },
      smart_fases: { can_view: true, can_edit: false, can_delete: false },
      smart_processos: { can_view: true, can_edit: false, can_delete: false },
      smart_apontamento: { can_view: true, can_edit: true, can_delete: false },
      smart_forcar_apontamento: { can_view: false, can_edit: false, can_delete: false },
      smart_3d: { can_view: true, can_edit: false, can_delete: false },
      smart_modo_completo: { can_view: false, can_edit: false, can_delete: false },
      smart_romaneios: { can_view: true, can_edit: false, can_delete: false },
      smart_montagem: { can_view: true, can_edit: true, can_delete: false },
      smart_relatorios: { can_view: true, can_edit: true, can_delete: false },
    },
  },
  {
    id: 'lider_producao',
    nome: 'Líder de Produção',
    descricao: 'Permite forçar apontamentos com pendências e gerar todos os relatórios.',
    icone: 'Zap',
    badge: 'Liderança',
    isCustom: false,
    permissions: {
      smart_of: { can_view: true, can_edit: true, can_delete: false },
      smart_fases: { can_view: true, can_edit: true, can_delete: false },
      smart_processos: { can_view: true, can_edit: true, can_delete: false },
      smart_apontamento: { can_view: true, can_edit: true, can_delete: true },
      smart_forcar_apontamento: { can_view: true, can_edit: true, can_delete: false },
      smart_3d: { can_view: true, can_edit: false, can_delete: false },
      smart_modo_completo: { can_view: true, can_edit: false, can_delete: false },
      smart_romaneios: { can_view: true, can_edit: true, can_delete: false },
      smart_montagem: { can_view: true, can_edit: true, can_delete: false },
      smart_relatorios: { can_view: true, can_edit: true, can_delete: false },
    },
  },
  {
    id: 'inspetor_qualidade',
    nome: 'Inspetor de Qualidade',
    descricao: 'Acesso ao 3D, relatórios, romaneios e visualização completa de processos.',
    icone: 'CheckCircle2',
    badge: 'Qualidade',
    isCustom: false,
    permissions: {
      smart_of: { can_view: true, can_edit: false, can_delete: false },
      smart_fases: { can_view: true, can_edit: false, can_delete: false },
      smart_processos: { can_view: true, can_edit: false, can_delete: false },
      smart_apontamento: { can_view: true, can_edit: false, can_delete: false },
      smart_forcar_apontamento: { can_view: false, can_edit: false, can_delete: false },
      smart_3d: { can_view: true, can_edit: false, can_delete: false },
      smart_modo_completo: { can_view: false, can_edit: false, can_delete: false },
      smart_romaneios: { can_view: true, can_edit: false, can_delete: false },
      smart_montagem: { can_view: true, can_edit: false, can_delete: false },
      smart_relatorios: { can_view: true, can_edit: true, can_delete: false },
    },
  },
  {
    id: 'total_admin',
    nome: 'Total Admin',
    descricao: 'Acesso irrestrito a todos os submódulos, forçar apontamentos e modo completo.',
    icone: 'Shield',
    badge: 'Administrador',
    isCustom: false,
    permissions: {
      smart_of: { can_view: true, can_edit: true, can_delete: true },
      smart_fases: { can_view: true, can_edit: true, can_delete: true },
      smart_processos: { can_view: true, can_edit: true, can_delete: true },
      smart_apontamento: { can_view: true, can_edit: true, can_delete: true },
      smart_forcar_apontamento: { can_view: true, can_edit: true, can_delete: true },
      smart_3d: { can_view: true, can_edit: true, can_delete: true },
      smart_modo_completo: { can_view: true, can_edit: true, can_delete: true },
      smart_romaneios: { can_view: true, can_edit: true, can_delete: true },
      smart_montagem: { can_view: true, can_edit: true, can_delete: true },
      smart_relatorios: { can_view: true, can_edit: true, can_delete: true },
    },
  },
  {
    id: 'apenas_leitura',
    nome: 'Apenas Leitura',
    descricao: 'Somente visualização de OFs, peças, 3D e status sem permissão de apontamento.',
    icone: 'Eye',
    badge: 'Consulta',
    isCustom: false,
    permissions: {
      smart_of: { can_view: true, can_edit: false, can_delete: false },
      smart_fases: { can_view: true, can_edit: false, can_delete: false },
      smart_processos: { can_view: true, can_edit: false, can_delete: false },
      smart_apontamento: { can_view: false, can_edit: false, can_delete: false },
      smart_forcar_apontamento: { can_view: false, can_edit: false, can_delete: false },
      smart_3d: { can_view: true, can_edit: false, can_delete: false },
      smart_modo_completo: { can_view: false, can_edit: false, can_delete: false },
      smart_romaneios: { can_view: true, can_edit: false, can_delete: false },
      smart_montagem: { can_view: true, can_edit: false, can_delete: false },
      smart_relatorios: { can_view: true, can_edit: false, can_delete: false },
    },
  },
];

export interface SmartUserPermission {
  id?: string;
  user_id: string;
  resource_key: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface SmartUserConfig {
  userId: string;
  email: string;
  fullName: string;
  functionName: string;
  profileImageUrl: string | null;
  whatsappNumber: string;
  notifEmailApontamentos: boolean;
  notifEmailMetricas: boolean;
  notifWhatsappApontamentos: boolean;
  notifWhatsappMetricas: boolean;
  permissions: Record<string, { can_view: boolean; can_edit: boolean; can_delete: boolean }>;
}
