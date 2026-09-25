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
