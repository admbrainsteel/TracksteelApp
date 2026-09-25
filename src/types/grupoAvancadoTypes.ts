export interface RegraAvancada {
  key: string;
  nome: string;
  descricao: string;
  icone: string;
  padraoAtivo?: boolean;
}

export interface GrupoAvancadoConfig {
  key: string;
  titulo: string;
  cor: 'sky' | 'indigo' | 'amber' | 'teal' | 'rose';
  icone: string;
  descricao: string;
  regras: RegraAvancada[];
  templates: {
    id: string;
    nome: string;
    descricao: string;
    icone: string;
    regrasAtivas: string[];
  }[];
}

export const GRUPOS_AVANCADOS_CONFIG: Record<string, GrupoAvancadoConfig> = {
  producao_pcp: {
    key: 'producao_pcp',
    titulo: 'Produção & PCP',
    cor: 'sky',
    icone: 'Factory',
    descricao: 'Regras avançadas de apontamentos, tolerâncias fabris, fila de produção e homologação de diários.',
    regras: [
      {
        key: 'pcp_retroativo_permitido',
        nome: 'Apontamento Retroativo de Peças',
        descricao: 'Permite que o operador ou encarregado aponte produção com datas anteriores ao dia de trabalho atual.',
        icone: 'Calendar',
        padraoAtivo: false,
      },
      {
        key: 'pcp_fechar_diario',
        nome: 'Fechamento & Homologação do Diário',
        descricao: 'Autorização para encerrar e consolidar o diário de produção fabril, travando apontamentos do dia.',
        icone: 'Lock',
        padraoAtivo: false,
      },
      {
        key: 'pcp_reordenar_prioridades',
        nome: 'Reordenação da Fila de Fabricação',
        descricao: 'Permite alterar a prioridade tática de OFs e bancas, furando filas de corte, montagem ou solda.',
        icone: 'ArrowUpDown',
        padraoAtivo: false,
      },
      {
        key: 'pcp_apontamento_massa',
        nome: 'Apontamento em Lote / Massa',
        descricao: 'Libera a ferramenta de avanço conjunto de múltiplas peças de uma vez só.',
        icone: 'Layers',
        padraoAtivo: true,
      },
      {
        key: 'pcp_liberar_retrabalho',
        nome: 'Autorização de Retrabalho & Refugo',
        descricao: 'Permite apontar peças refugadas e liberar ordens de retrabalho com consumo extra de matéria-prima.',
        icone: 'AlertTriangle',
        padraoAtivo: false,
      },
      {
        key: 'pcp_capacidade_excedente',
        nome: 'Alocação de Capacidade Excedente (>100%)',
        descricao: 'Força o agendamento de máquinas e postos de trabalho acima da capacidade nominal cadastrada.',
        icone: 'Gauge',
        padraoAtivo: false,
      },
    ],
    templates: [
      {
        id: 'operador_pcp',
        nome: 'Apontador Fabril Padrão',
        descricao: 'Apenas apontamentos normais e avanço de lotes, sem permissão de retroativo ou travamento.',
        icone: 'Wrench',
        regrasAtivas: ['pcp_apontamento_massa'],
      },
      {
        id: 'lider_producao',
        nome: 'Líder / Encarregado de Fábrica',
        descricao: 'Liberação de retroativo, reordenação de prioridades e autorização de retrabalho.',
        icone: 'Shield',
        regrasAtivas: ['pcp_retroativo_permitido', 'pcp_reordenar_prioridades', 'pcp_apontamento_massa', 'pcp_liberar_retrabalho'],
      },
      {
        id: 'gestor_pcp_total',
        nome: 'Planejador PCP Total',
        descricao: 'Acesso total com fechamento de diários, capacidade excedente e reordenação.',
        icone: 'Crown',
        regrasAtivas: ['pcp_retroativo_permitido', 'pcp_fechar_diario', 'pcp_reordenar_prioridades', 'pcp_apontamento_massa', 'pcp_liberar_retrabalho', 'pcp_capacidade_excedente'],
      },
    ],
  },

  engenharia_3d: {
    key: 'engenharia_3d',
    titulo: 'Engenharia, OFs & BIM',
    cor: 'indigo',
    icone: 'Box',
    descricao: 'Controle de revisões técnicas, exportação de modelos IFC/BIM, arquivos CAD e fichas com custos.',
    regras: [
      {
        key: 'eng_aprovar_revisoes',
        nome: 'Aprovação & Liberação de Revisões de OF',
        descricao: 'Autorização formal para aprovar revisões de projetos e emitir novas listas de corte para a fábrica.',
        icone: 'CheckCircle2',
        padraoAtivo: false,
      },
      {
        key: 'eng_download_ifc',
        nome: 'Download de Modelos 3D & Arquivos IFC',
        descricao: 'Permite exportar e baixar os modelos tridimensionais brutos e arquivos IFC/BIM do projeto.',
        icone: 'Download',
        padraoAtivo: true,
      },
      {
        key: 'eng_ver_custos',
        nome: 'Visualização de Fichas Técnicas & Custos',
        descricao: 'Exibe valores monetários, custo unitário por quilo e tabelas financeiras confidenciais de peças.',
        icone: 'DollarSign',
        padraoAtivo: false,
      },
      {
        key: 'eng_editar_estruturas',
        nome: 'Edição de Estruturas & Subconjuntos',
        descricao: 'Permite alterar hierarquias de peças, pesos de projeto e marcas de montagem já cadastradas.',
        icone: 'Network',
        padraoAtivo: false,
      },
      {
        key: 'eng_upload_cad',
        nome: 'Upload de Arquivos CAD/DWG/DSTV',
        descricao: 'Permite importar novos arquivos de engenharia, perfis de corte e desenhos 2D na OF.',
        icone: 'UploadCloud',
        padraoAtivo: true,
      },
    ],
    templates: [
      {
        id: 'desenhista_projetista',
        nome: 'Projetista / Detalhista',
        descricao: 'Upload de arquivos técnicos e download de IFC para verificação e modelagem.',
        icone: 'Compass',
        regrasAtivas: ['eng_download_ifc', 'eng_upload_cad'],
      },
      {
        id: 'coordenador_engenharia',
        nome: 'Coordenador de Engenharia',
        descricao: 'Aprovação de revisões, edição de conjuntos e gestão técnica completa.',
        icone: 'Shield',
        regrasAtivas: ['eng_aprovar_revisoes', 'eng_download_ifc', 'eng_editar_estruturas', 'eng_upload_cad'],
      },
      {
        id: 'diretoria_tecnica',
        nome: 'Diretoria Técnica & Orçamentos',
        descricao: 'Controle irrestrito com acesso a custos confidenciais e fichas financeiras.',
        icone: 'Crown',
        regrasAtivas: ['eng_aprovar_revisoes', 'eng_download_ifc', 'eng_ver_custos', 'eng_editar_estruturas', 'eng_upload_cad'],
      },
    ],
  },

  expedicao_logistica: {
    key: 'expedicao_logistica',
    titulo: 'Expedição & Romaneios',
    cor: 'amber',
    icone: 'Truck',
    descricao: 'Regras de pesagem rodoviária, autorização de embarque, conferência cega e estorno de cargas.',
    regras: [
      {
        key: 'exp_sem_pesagem',
        nome: 'Liberação de Romaneio sem Pesagem',
        descricao: 'Permite despachar carretas sem registrar o ticket físico da balança rodoviária.',
        icone: 'Scale',
        padraoAtivo: false,
      },
      {
        key: 'exp_tolerancia_alta',
        nome: 'Margem Ampliada de Tolerância de Balança',
        descricao: 'Aceita diferença de peso acima de ±100kg entre o peso teórico dos romaneios e a balança.',
        icone: 'Percent',
        padraoAtivo: false,
      },
      {
        key: 'exp_despacho_sem_assinatura',
        nome: 'Despacho sem Assinatura Digital do Motorista',
        descricao: 'Autoriza a saída de carretas sem a coleta prévia da assinatura presencial do transportador.',
        icone: 'FileSignature',
        padraoAtivo: false,
      },
      {
        key: 'exp_conferencia_cega',
        nome: 'Exigência de Conferência Cega no Embarque',
        descricao: 'Força o operador a bipar e contar peça a peça sem visualizar a quantidade esperada na tela.',
        icone: 'EyeOff',
        padraoAtivo: true,
      },
      {
        key: 'exp_estorno_romaneio',
        nome: 'Estorno & Cancelamento de Romaneios Despachados',
        descricao: 'Permite cancelar romaneios já faturados/despachados com retorno automático das peças ao estoque.',
        icone: 'RotateCcw',
        padraoAtivo: false,
      },
    ],
    templates: [
      {
        id: 'conferente_expedicao',
        nome: 'Conferente de Pátio',
        descricao: 'Focado em conferência cega e bipe de peças no carregamento das carretas.',
        icone: 'Barcode',
        regrasAtivas: ['exp_conferencia_cega'],
      },
      {
        id: 'lider_logistica',
        nome: 'Líder de Expedição / Logística',
        descricao: 'Autorização com margem de balança e despacho com assinatura flexível.',
        icone: 'Shield',
        regrasAtivas: ['exp_tolerancia_alta', 'exp_conferencia_cega', 'exp_sem_pesagem'],
      },
      {
        id: 'gerente_logistica_total',
        nome: 'Gerente de Logística Total',
        descricao: 'Acesso total com estorno de cargas despachadas e todas as liberações de saída.',
        icone: 'Crown',
        regrasAtivas: ['exp_sem_pesagem', 'exp_tolerancia_alta', 'exp_despacho_sem_assinatura', 'exp_conferencia_cega', 'exp_estorno_romaneio'],
      },
    ],
  },

  obra_montagem: {
    key: 'obra_montagem',
    titulo: 'Obra & Montagem Externa',
    cor: 'teal',
    icone: 'HardHat',
    descricao: 'Controle de descarga no canteiro, liberação de içamento e registro de não-conformidades de campo.',
    regras: [
      {
        key: 'obra_receber_romaneio',
        nome: 'Confirmação de Descarga & Recebimento no Canteiro',
        descricao: 'Permite registrar o recebimento físico das carretas e atestar o estado das peças entregues.',
        icone: 'PackageCheck',
        padraoAtivo: true,
      },
      {
        key: 'obra_liberar_montagem',
        nome: 'Autorização Formal de Içamento & Fixação',
        descricao: 'Libera a equipe de montadores para içar conjuntos e soldar/aparafusar na estrutura definitiva.',
        icone: 'CheckSquare',
        padraoAtivo: false,
      },
      {
        key: 'obra_apontar_nao_conformidade',
        nome: 'Registro de Não-Conformidade de Campo (RNC)',
        descricao: 'Permite abrir ocorrências de peças com furo desalinhado, empenamentos ou danos de transporte.',
        icone: 'AlertOctagon',
        padraoAtivo: true,
      },
    ],
    templates: [
      {
        id: 'montador_campo',
        nome: 'Montador / Encarregado de Campo',
        descricao: 'Recebimento de romaneios e registro de problemas ou RNCs de campo.',
        icone: 'Wrench',
        regrasAtivas: ['obra_receber_romaneio', 'obra_apontar_nao_conformidade'],
      },
      {
        id: 'engenheiro_obra_total',
        nome: 'Engenheiro Residente da Obra',
        descricao: 'Controle irrestrito no canteiro com liberação de içamento e homologação estrutural.',
        icone: 'Crown',
        regrasAtivas: ['obra_receber_romaneio', 'obra_liberar_montagem', 'obra_apontar_nao_conformidade'],
      },
    ],
  },

  admin_sistema: {
    key: 'admin_sistema',
    titulo: 'Administração & Sistema',
    cor: 'rose',
    icone: 'Shield',
    descricao: 'Acesso a auditorias de segurança completas, exportações em massa e parâmetros globais do ERP.',
    regras: [
      {
        key: 'adm_auditoria_completa',
        nome: 'Auditoria Completa & Logs de Segurança',
        descricao: 'Permite visualizar todos os acessos por IP, histórico de operações críticas e falhas de login.',
        icone: 'Activity',
        padraoAtivo: false,
      },
      {
        key: 'adm_exportar_dados',
        nome: 'Exportação Massiva de Dados (Excel/CSV/JSON)',
        descricao: 'Libera a exportação de tabelas completas de clientes, faturamento, peças e ordens de produção.',
        icone: 'DownloadCloud',
        padraoAtivo: false,
      },
      {
        key: 'adm_configuracoes_globais',
        nome: 'Alteração de Parâmetros Globais do Sistema',
        descricao: 'Autoriza alterar configurações gerais da empresa, logotipos, regras fiscais e integrações.',
        icone: 'Settings',
        padraoAtivo: false,
      },
    ],
    templates: [
      {
        id: 'auditor_sistema',
        nome: 'Auditor de Segurança',
        descricao: 'Acesso de auditoria e exportação para compliance sem alterar parâmetros globais.',
        icone: 'Search',
        regrasAtivas: ['adm_auditoria_completa', 'adm_exportar_dados'],
      },
      {
        id: 'super_admin_total',
        nome: 'Super Administrador Total',
        descricao: 'Controle total de governança, parâmetros de infraestrutura e exportações.',
        icone: 'Crown',
        regrasAtivas: ['adm_auditoria_completa', 'adm_exportar_dados', 'adm_configuracoes_globais'],
      },
    ],
  },
};
