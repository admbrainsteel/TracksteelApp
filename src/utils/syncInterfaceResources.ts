
import { supabase } from '@/integrations/supabase/client';

export const syncInterfaceResources = async (menuItems: any[], adminMenuItems: any[]) => {
  try {
    // Definir todos os recursos disponíveis no sistema (lista única e limpa)
    const allResources = [
      // Menu Principal
      { resource_key: 'dashboard', resource_name: 'Dashboard', icon_name: 'BarChart3', route_path: '/dashboard', is_submenu: false, order_index: 1 },
      
      // Cadastro - Menu pai
      { resource_key: 'cadastro', resource_name: 'Cadastro', icon_name: 'FileText', route_path: null, is_submenu: false, order_index: 2 },
      { resource_key: 'cadastro-of', resource_name: 'Ficha Técnica da OF', icon_name: null, route_path: '/cadastro-of', is_submenu: true, parent_key: 'cadastro', order_index: 1 },
      { resource_key: 'cadastro-pecas', resource_name: 'Cadastro de Peças', icon_name: null, route_path: '/seletor-of', is_submenu: true, parent_key: 'cadastro', order_index: 2 },
      { resource_key: 'equipamentos', resource_name: 'Equipamentos', icon_name: null, route_path: '/equipamentos', is_submenu: true, parent_key: 'cadastro', order_index: 3 },
      
      // Ferramentas - Menu pai
      { resource_key: 'ferramentas', resource_name: 'Ferramentas', icon_name: 'Wrench', route_path: null, is_submenu: false, order_index: 3 },
      { resource_key: 'ferramentas-conversores', resource_name: 'Conversores de dados', icon_name: null, route_path: '/ferramentas/conversores', is_submenu: true, parent_key: 'ferramentas', order_index: 1 },
      { resource_key: 'ferramentas-inconsistencias', resource_name: 'Ver Inconsistências', icon_name: null, route_path: '/ferramentas/inconsistencias', is_submenu: true, parent_key: 'ferramentas', order_index: 2 },
      
      // Estoque
      { resource_key: 'estoque', resource_name: 'Estoque', icon_name: 'Warehouse', route_path: '/estoque', is_submenu: false, order_index: 4 },
      { resource_key: 'estoque-solicitacao-compras', resource_name: 'Solicitação de Compras', icon_name: null, route_path: '/estoque/solicitacao-compras', is_submenu: true, parent_key: 'estoque', order_index: 1 },
      
      // OFs - Menu pai
      { resource_key: 'ofs', resource_name: 'OFs', icon_name: 'FolderOpen', route_path: null, is_submenu: false, order_index: 5 },
      { resource_key: 'ofs-lista', resource_name: 'Ordens de Fabricação', icon_name: null, route_path: '/ofs', is_submenu: true, parent_key: 'ofs', order_index: 1 },
      { resource_key: 'ofs-cronograma', resource_name: 'Cronograma', icon_name: null, route_path: '/ofs/cronograma', is_submenu: true, parent_key: 'ofs', order_index: 2 },
      { resource_key: 'ofs-concluidas', resource_name: 'OFs Concluídas', icon_name: null, route_path: '/cadastro/ofs-concluidas', is_submenu: true, parent_key: 'ofs', order_index: 3 },
      
      // Produção - Menu pai
      { resource_key: 'producao', resource_name: 'Produção', icon_name: 'Building2', route_path: null, is_submenu: false, order_index: 6 },
      { resource_key: 'producao-visao', resource_name: 'Visão Geral', icon_name: null, route_path: '/producao', is_submenu: true, parent_key: 'producao', order_index: 1 },
      { resource_key: 'diario-producao', resource_name: 'Diário de Produção', icon_name: null, route_path: '/diario-producao', is_submenu: true, parent_key: 'producao', order_index: 2 },
      { resource_key: 'producao-apontamento', resource_name: 'Apontamento de Produção', icon_name: null, route_path: '/apontamento-producao', is_submenu: true, parent_key: 'producao', order_index: 3 },
      { resource_key: 'producao-dashboard', resource_name: 'Dashboard de Produção', icon_name: null, route_path: '/dashboard-producao', is_submenu: true, parent_key: 'producao', order_index: 4 },
      { resource_key: 'prioridades-fabricacao', resource_name: 'Prioridades de Fabricação', icon_name: null, route_path: '/prioridades-fabricacao', is_submenu: true, parent_key: 'producao', order_index: 5 },
      
      // Painel Industrial
      { resource_key: 'painel-industrial', resource_name: 'Painel Industrial', icon_name: 'Monitor', route_path: '/painel-industrial', is_submenu: false, order_index: 7 },
      
      // Expedição
      { resource_key: 'expedicao', resource_name: 'Expedição', icon_name: 'Truck', route_path: '/expedicao', is_submenu: false, order_index: 8 },
      
      // Obra - Menu pai
      { resource_key: 'obra', resource_name: 'Obra', icon_name: 'HardHat', route_path: null, is_submenu: false, order_index: 9 },
      { resource_key: 'obra-dashboard', resource_name: 'Dashboard de Obras', icon_name: null, route_path: '/obra', is_submenu: true, parent_key: 'obra', order_index: 1 },
      { resource_key: 'obra-configuracoes', resource_name: 'Configurações da Obra', icon_name: null, route_path: '/obra/configuracoes', is_submenu: true, parent_key: 'obra', order_index: 2 },
      
      // Tarefas - Menu pai
      { resource_key: 'tarefas', resource_name: 'Tarefas', icon_name: 'CheckSquare', route_path: null, is_submenu: false, order_index: 10 },
      { resource_key: 'tarefas-lista', resource_name: 'Lista de Tarefas', icon_name: null, route_path: '/tarefas', is_submenu: true, parent_key: 'tarefas', order_index: 1 },
      { resource_key: 'tarefas-historico', resource_name: 'Histórico de Tarefas', icon_name: null, route_path: '/tarefas/historico', is_submenu: true, parent_key: 'tarefas', order_index: 2 },
      
      // Biblioteca - Menu pai
      { resource_key: 'biblioteca', resource_name: 'Biblioteca', icon_name: 'Book', route_path: null, is_submenu: false, order_index: 11 },
      { resource_key: 'biblioteca-catalogos', resource_name: 'Catálogos', icon_name: null, route_path: '/biblioteca/catalogos', is_submenu: true, parent_key: 'biblioteca', order_index: 1 },
      { resource_key: 'biblioteca-normas', resource_name: 'Normas', icon_name: null, route_path: '/biblioteca/normas', is_submenu: true, parent_key: 'biblioteca', order_index: 2 },
      { resource_key: 'biblioteca-referencias', resource_name: 'Referências', icon_name: null, route_path: '/biblioteca/referencias', is_submenu: true, parent_key: 'biblioteca', order_index: 3 },
      
      // Sistema
      { resource_key: 'sistema', resource_name: 'Sistema', icon_name: 'Clipboard', route_path: '/sistema', is_submenu: false, order_index: 12 },
      
      // Sugestões
      { resource_key: 'sugestoes', resource_name: 'Sugestões', icon_name: 'MessageSquare', route_path: '/sugestoes', is_submenu: false, order_index: 13 },
      
      // Atribuições
      { resource_key: 'atribuicoes', resource_name: 'Atribuições', icon_name: 'Users', route_path: '/atribuicoes', is_submenu: false, order_index: 14 },
      
      // Mapa Interativo
      { resource_key: 'mapa-interativo', resource_name: 'Mapa Interativo', icon_name: 'Network', route_path: '/mapa-interativo', is_submenu: false, order_index: 15 },
      
      // Configurações - Menu pai
      { resource_key: 'configuracoes', resource_name: 'Configurações', icon_name: 'Settings', route_path: null, is_submenu: false, order_index: 16 },
      { resource_key: 'configuracoes-gerais', resource_name: 'Configurações Gerais', icon_name: null, route_path: '/configuracoes', is_submenu: true, parent_key: 'configuracoes', order_index: 1 },
      { resource_key: 'theme-customization', resource_name: 'Personalização de Tema', icon_name: null, route_path: '/admin/theme-customization', is_submenu: true, parent_key: 'configuracoes', order_index: 2 },
      
      // Admin
      { resource_key: 'admin', resource_name: 'Admin', icon_name: 'Shield', route_path: '/admin', is_submenu: false, order_index: 17 },
      { resource_key: 'user-management', resource_name: 'Gerenciar Usuários', icon_name: 'UserCog', route_path: '/user-management', is_submenu: false, order_index: 18 }
    ];

    console.log('Iniciando limpeza completa de recursos duplicados...');
    
    // ETAPA 1: Limpar completamente a tabela e reconstruir
    const { error: deleteError } = await supabase
      .from('interface_resources')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (deleteError) {
      console.error('Erro ao limpar tabela:', deleteError);
    } else {
      console.log('Tabela limpa com sucesso');
    }

    // ETAPA 2: Inserir todos os recursos limpos
    const { error: insertError } = await supabase
      .from('interface_resources')
      .insert(allResources);

    if (insertError) {
      console.error('Erro ao inserir recursos:', insertError);
    } else {
      console.log(`${allResources.length} recursos inseridos com sucesso`);
      console.log('✅ Recurso "equipamentos" sincronizado:', allResources.find(r => r.resource_key === 'equipamentos'));
    }

    console.log('Sincronização concluída - duplicatas removidas');

  } catch (error) {
    console.error('Erro na sincronização de recursos:', error);
  }
};
