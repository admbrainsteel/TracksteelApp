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
  // 1. PRODUÇÃO & PCP
  producao_pcp: {
    key: 'producao_pcp',
    titulo: 'Produção & PCP',
    cor: 'sky',
    icone: 'Factory',
    descricao: 'Controle de apontamentos de fábrica, fechamento de diários e reordenação de filas.',
    regras: [
      {
        key: 'pcp_retroativo_permitido',
        nome: 'Apontamento Retroativo de Produção',
        descricao: 'Permite apontar produção com datas anteriores ao dia de trabalho atual.',
        icone: 'Calendar',
        padraoAtivo: false,
      },
      {
        key: 'pcp_fechar_diario',
        nome: 'Fechamento & Homologação do Diário',
        descricao: 'Autorização para encerrar e consolidar o diário de produção do dia.',
        icone: 'Lock',
        padraoAtivo: false,
      },
      {
        key: 'pcp_reordenar_prioridades',
        nome: 'Reordenação da Fila de Fabricação',
        descricao: 'Permite alterar a prioridade de fabricação e a ordem de corte/montagem das OFs.',
        icone: 'ArrowUpDown',
        padraoAtivo: false,
      },
      {
        key: 'pcp_apontamento_massa',
        nome: 'Apontamento em Lote / Massa',
        descricao: 'Libera o avanço conjunto de múltiplas peças simultaneamente.',
        icone: 'Layers',
        padraoAtivo: true,
      },
      {
        key: 'pcp_excluir_apontamento',
        nome: 'Exclusão & Estorno de Apontamentos',
        descricao: 'Permite cancelar ou excluir apontamentos de produção já registrados.',
        icone: 'Trash2',
        padraoAtivo: false,
      },
      {
        key: 'pcp_exportar_relatorios',
        nome: 'Exportação de Relatórios de Produção',
        descricao: 'Download de relatórios em PDF e planilhas de avanço e produtividade fabril.',
        icone: 'FileSpreadsheet',
        padraoAtivo: true,
      },
    ],
    templates: [
      {
        id: 'operador_pcp',
        nome: 'Apontador Fabril Padrão',
        descricao: 'Apontamento normal em lote de peças, sem autorização para exclusões ou datas retroativas.',
        icone: 'Wrench',
        regrasAtivas: ['pcp_apontamento_massa'],
      },
      {
        id: 'lider_producao',
        nome: 'Líder / Encarregado de Fábrica',
        descricao: 'Liberação de apontamentos retroativos, reordenação de filas e exportação de relatórios.',
        icone: 'Shield',
        regrasAtivas: ['pcp_retroativo_permitido', 'pcp_reordenar_prioridades', 'pcp_apontamento_massa', 'pcp_exportar_relatorios'],
      },
      {
        id: 'gestor_pcp_total',
        nome: 'Planejador PCP Total',
        descricao: 'Acesso pleno ao módulo: fechamento de diários, estornos, reordenação e relatórios.',
        icone: 'Crown',
        regrasAtivas: [
          'pcp_retroativo_permitido',
          'pcp_fechar_diario',
          'pcp_reordenar_prioridades',
          'pcp_apontamento_massa',
          'pcp_excluir_apontamento',
          'pcp_exportar_relatorios',
        ],
      },
    ],
  },

  // 2. ENGENHARIA, OFS & BIM
  engenharia_3d: {
    key: 'engenharia_3d',
    titulo: 'Engenharia, OFs & BIM',
    cor: 'indigo',
    icone: 'Box',
    descricao: 'Criação de OFs, importação de dados Tekla/XML/DSTV, cadastro de peças e modelos 3D.',
    regras: [
      {
        key: 'eng_criar_of',
        nome: 'Criação de Nova Ordem de Fabricação (OF)',
        descricao: 'Libera o botão de cadastro de novas ordens e definição de cliente e contrato.',
        icone: 'PlusCircle',
        padraoAtivo: false,
      },
      {
        key: 'eng_editar_of',
        nome: 'Edição de Dados & Metadados da OF',
        descricao: 'Permite alterar prazos, peso contratual, cliente e informações gerais da OF.',
        icone: 'Edit3',
        padraoAtivo: false,
      },
      {
        key: 'eng_excluir_of',
        nome: 'Exclusão ou Cancelamento de OF',
        descricao: 'Ação crítica de remoção ou cancelamento permanente de Ordens de Fabricação.',
        icone: 'Trash2',
        padraoAtivo: false,
      },
      {
        key: 'eng_importar_dados_tecnicos',
        nome: 'Importação de Dados Técnicos (XML / DSTV / Tekla)',
        descricao: 'Upload e processamento de arquivos de engenharia e listas de peças.',
        icone: 'UploadCloud',
        padraoAtivo: true,
      },
      {
        key: 'eng_gerenciar_pecas',
        nome: 'Cadastro, Edição & Exclusão de Peças',
        descricao: 'Permite adicionar novas marcas, ajustar perfis, comprimentos e pesos na lista técnica.',
        icone: 'Network',
        padraoAtivo: false,
      },
      {
        key: 'eng_download_ifc',
        nome: 'Download de Modelos 3D & Arquivos IFC',
        descricao: 'Permite exportar e baixar os modelos tridimensionais brutos e arquivos IFC/BIM.',
        icone: 'Download',
        padraoAtivo: true,
      },
      {
        key: 'eng_exportar_listas',
        nome: 'Exportação de Listas de Materiais & Peças',
        descricao: 'Emissão de relatórios técnicos, listas de corte e resumo de pesos.',
        icone: 'FileText',
        padraoAtivo: true,
      },
    ],
    templates: [
      {
        id: 'desenhista_detalhista',
        nome: 'Detalhista / Projetista',
        descricao: 'Focado em importação técnica, download de modelos IFC e geração de listas de corte.',
        icone: 'Compass',
        regrasAtivas: ['eng_importar_dados_tecnicos', 'eng_download_ifc', 'eng_exportar_listas'],
      },
      {
        id: 'engenheiro_estrutural',
        nome: 'Engenheiro de Estruturas',
        descricao: 'Criação de OFs, edição técnica de peças, importação de dados e relatórios.',
        icone: 'Shield',
        regrasAtivas: ['eng_criar_of', 'eng_editar_of', 'eng_importar_dados_tecnicos', 'eng_gerenciar_pecas', 'eng_download_ifc', 'eng_exportar_listas'],
      },
      {
        id: 'coordenador_engenharia_total',
        nome: 'Coordenador de Engenharia Total',
        descricao: 'Controle irrestrito de engenharia, incluindo exclusão e cancelamento de OFs.',
        icone: 'Crown',
        regrasAtivas: [
          'eng_criar_of',
          'eng_editar_of',
          'eng_excluir_of',
          'eng_importar_dados_tecnicos',
          'eng_gerenciar_pecas',
          'eng_download_ifc',
          'eng_exportar_listas',
        ],
      },
    ],
  },

  // 3. EXPEDIÇÃO, ESTOQUE & ROMANEIOS
  expedicao_logistica: {
    key: 'expedicao_logistica',
    titulo: 'Expedição, Estoque & Romaneios',
    cor: 'amber',
    icone: 'Truck',
    descricao: 'Gestão de cargas, romaneios de embarque, controle de estoque e solicitações de compra.',
    regras: [
      {
        key: 'exp_criar_romaneio',
        nome: 'Criação de Cargas & Romaneios',
        descricao: 'Permite abrir uma nova carga de expedição e definir transportadora e motorista.',
        icone: 'PlusSquare',
        padraoAtivo: false,
      },
      {
        key: 'exp_adicionar_remover_pecas',
        nome: 'Montagem de Romaneio (Adicionar/Remover Peças)',
        descricao: 'Autorização para incluir ou retirar peças e conjuntos da carga.',
        icone: 'PackageCheck',
        padraoAtivo: true,
      },
      {
        key: 'exp_despachar_carga',
        nome: 'Despacho & Finalização de Romaneio',
        descricao: 'Permite concluir o romaneio e marcar a carga como despachada/enviada.',
        icone: 'CheckSquare',
        padraoAtivo: false,
      },
      {
        key: 'exp_cancelar_estornar',
        nome: 'Cancelamento & Estorno de Cargas Despachadas',
        descricao: 'Ação crítica de cancelar romaneios enviados, com devolução das peças ao pátio.',
        icone: 'RotateCcw',
        padraoAtivo: false,
      },
      {
        key: 'exp_imprimir_documentos',
        nome: 'Emissão de Romaneios PDF & Etiquetas',
        descricao: 'Permite imprimir o espelho do romaneio e etiquetas de identificação de peças.',
        icone: 'Printer',
        padraoAtivo: true,
      },
      {
        key: 'est_ajuste_manual_saldo',
        nome: 'Ajuste Manual de Saldo de Estoque',
        descricao: 'Permite alterar quantidades físicas de chapas, perfis e consumíveis no inventário.',
        icone: 'SlidersHorizontal',
        padraoAtivo: false,
      },
      {
        key: 'est_entrada_material',
        nome: 'Entrada de Matérias-Primas & NFs',
        descricao: 'Registra novas entradas de aço no estoque de fábrica.',
        icone: 'FileInput',
        padraoAtivo: false,
      },
      {
        key: 'est_solicitacao_compras',
        nome: 'Criação & Gestão de Solicitações de Compras',
        descricao: 'Permite solicitar aquisição de materiais e insumos para suprimento das OFs.',
        icone: 'ShoppingCart',
        padraoAtivo: false,
      },
    ],
    templates: [
      {
        id: 'operador_expedicao',
        nome: 'Conferente de Pátio / Expedição',
        descricao: 'Adição de peças no romaneio e impressão de espelhos e etiquetas.',
        icone: 'Barcode',
        regrasAtivas: ['exp_adicionar_remover_pecas', 'exp_imprimir_documentos'],
      },
      {
        id: 'almoxarife_estoquista',
        nome: 'Almoxarife / Estoquista',
        descricao: 'Entradas de aço, controle de saldo e solicitações de compras.',
        icone: 'Box',
        regrasAtivas: ['est_entrada_material', 'est_solicitacao_compras', 'exp_imprimir_documentos'],
      },
      {
        id: 'lider_logistica_total',
        nome: 'Gestor de Logística & Estoque Total',
        descricao: 'Controle total de cargas, despacho, estorno, inventário e compras.',
        icone: 'Crown',
        regrasAtivas: [
          'exp_criar_romaneio',
          'exp_adicionar_remover_pecas',
          'exp_despachar_carga',
          'exp_cancelar_estornar',
          'exp_imprimir_documentos',
          'est_ajuste_manual_saldo',
          'est_entrada_material',
          'est_solicitacao_compras',
        ],
      },
    ],
  },

  // 4. OBRA & MONTAGEM EXTERNA
  obra_montagem: {
    key: 'obra_montagem',
    titulo: 'Obra & Montagem Externa',
    cor: 'teal',
    icone: 'HardHat',
    descricao: 'Acompanhamento do canteiro, status de montagem de peças e diário de obra.',
    regras: [
      {
        key: 'obra_apontar_montagem',
        nome: 'Apontamento de Peças Montadas em Campo',
        descricao: 'Permite registrar que conjuntos e peças foram descarregados e montados no canteiro.',
        icone: 'CheckCheck',
        padraoAtivo: true,
      },
      {
        key: 'obra_registrar_ocorrencia',
        nome: 'Registro de Ocorrências & Diário de Campo',
        descricao: 'Permite anotar paralisações por clima, problemas de montagem e observações de obra.',
        icone: 'AlertCircle',
        padraoAtivo: true,
      },
      {
        key: 'obra_configurar_marcos',
        nome: 'Configuração de Frentes & Marcos da Obra',
        descricao: 'Permite criar e alterar etapas, setores e marcos estruturais do projeto.',
        icone: 'Settings2',
        padraoAtivo: false,
      },
      {
        key: 'obra_exportar_relatorio',
        nome: 'Exportação de Relatórios de Evolução de Obra',
        descricao: 'Geração de relatórios gerenciais e evolução percentual da montagem.',
        icone: 'FileSpreadsheet',
        padraoAtivo: true,
      },
    ],
    templates: [
      {
        id: 'montador_campo',
        nome: 'Montador / Encarregado de Campo',
        descricao: 'Apontamento de peças no canteiro e registro de ocorrências.',
        icone: 'Wrench',
        regrasAtivas: ['obra_apontar_montagem', 'obra_registrar_ocorrencia'],
      },
      {
        id: 'engenheiro_obra_total',
        nome: 'Engenheiro Residente da Obra',
        descricao: 'Acesso irrestrito com configuração de marcos e exportação de relatórios.',
        icone: 'Crown',
        regrasAtivas: ['obra_apontar_montagem', 'obra_registrar_ocorrencia', 'obra_configurar_marcos', 'obra_exportar_relatorio'],
      },
    ],
  },

  // 5. ADMINISTRAÇÃO & SISTEMA
  admin_sistema: {
    key: 'admin_sistema',
    titulo: 'Administração & Sistema',
    cor: 'rose',
    icone: 'Shield',
    descricao: 'Governança de acessos, usuários, auditoria de dados e configurações da empresa.',
    regras: [
      {
        key: 'adm_gerenciar_usuarios',
        nome: 'Gestão de Usuários & Aprovações',
        descricao: 'Permite criar, editar, aprovar novos cadastros e inativar colaboradores.',
        icone: 'Users',
        padraoAtivo: false,
      },
      {
        key: 'adm_gerenciar_matriz',
        nome: 'Gestão da Matriz de Acessos & Permissões',
        descricao: 'Autorização para conceder ou revogar acessos básicos e regras avançadas.',
        icone: 'ShieldCheck',
        padraoAtivo: false,
      },
      {
        key: 'adm_redefinir_senhas',
        nome: 'Redefinição de Senhas de Acesso',
        descricao: 'Permite gerar links de recuperação e redefinir senhas de colaboradores.',
        icone: 'KeyRound',
        padraoAtivo: false,
      },
      {
        key: 'adm_auditoria_inconsistencias',
        nome: 'Auditoria & Correção de Inconsistências',
        descricao: 'Executa varreduras de integridade no banco de dados e aplica correções automáticas.',
        icone: 'Activity',
        padraoAtivo: false,
      },
      {
        key: 'adm_configuracoes_gerais',
        nome: 'Alteração de Parâmetros da Empresa',
        descricao: 'Autoriza alterar dados cadastrais da empresa, logotipo e parâmetros globais do ERP.',
        icone: 'Settings',
        padraoAtivo: false,
      },
    ],
    templates: [
      {
        id: 'administrador_rh',
        nome: 'Gestor de Equipe & RH',
        descricao: 'Criação de usuários, aprovação de pendentes e redefinição de senhas.',
        icone: 'Users',
        regrasAtivas: ['adm_gerenciar_usuarios', 'adm_redefinir_senhas'],
      },
      {
        id: 'super_admin_total',
        nome: 'Super Administrador Total',
        descricao: 'Acesso irrestrito a todas as configurações de governança, sistema e banco de dados.',
        icone: 'Crown',
        regrasAtivas: [
          'adm_gerenciar_usuarios',
          'adm_gerenciar_matriz',
          'adm_redefinir_senhas',
          'adm_auditoria_inconsistencias',
          'adm_configuracoes_gerais',
        ],
      },
    ],
  },
};
