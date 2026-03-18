
-- Inserir todos os recursos de interface atuais da sidebar
INSERT INTO public.interface_resources (resource_key, resource_name, parent_key, icon_name, route_path, is_submenu, order_index) VALUES
-- Menu principal
('dashboard', 'Dashboard', NULL, 'BarChart3', '/dashboard', false, 1),
('cadastro', 'Cadastro', NULL, 'FileText', NULL, false, 2),
('ferramentas', 'Ferramentas', NULL, 'Wrench', NULL, false, 3),
('estoque', 'Estoque', NULL, 'Warehouse', '/estoque', false, 4),
('ofs', 'OFs', NULL, 'FolderOpen', NULL, false, 5),
('producao', 'Produção', NULL, 'Building2', NULL, false, 6),
('expedicao', 'Expedição', NULL, 'Truck', '/expedicao', false, 7),
('obra', 'Obra', NULL, 'HardHat', NULL, false, 8),
('tarefas', 'Tarefas', NULL, 'CheckSquare', NULL, false, 9),
('biblioteca', 'Biblioteca', NULL, 'Book', NULL, false, 10),
('sistema', 'Sistema', NULL, 'Clipboard', '/sistema', false, 11),
('sugestoes', 'Sugestões', NULL, 'MessageSquare', '/sugestoes', false, 12),
('configuracoes', 'Configurações', NULL, 'Settings', NULL, false, 13),

-- Submenus do Cadastro
('cadastro-of', 'Ficha Técnica da OF', 'cadastro', NULL, '/cadastro-of', true, 1),
('cadastro-pecas', 'Cadastro de Peças', 'cadastro', NULL, '/cadastro-pecas', true, 2),

-- Submenus das Ferramentas
('ferramentas-conversores', 'Conversores de dados', 'ferramentas', NULL, '/ferramentas/conversores', true, 1),

-- Submenus das OFs
('ofs-lista', 'Ordens de Fabricação', 'ofs', NULL, '/ofs', true, 1),
('ofs-cronograma', 'Cronograma', 'ofs', NULL, '/ofs/cronograma', true, 2),
('ofs-concluidas', 'OFs Concluídas', 'ofs', NULL, '/cadastro/ofs-concluidas', true, 3),

-- Submenus da Produção
('producao-visao', 'Visão Geral', 'producao', NULL, '/producao', true, 1),
('producao-apontamento', 'Apontamento de Produção', 'producao', NULL, '/apontamento-producao', true, 2),
('producao-dashboard', 'Dashboard de Produção', 'producao', NULL, '/dashboard-producao', true, 3),

-- Submenus da Obra
('obra-dashboard', 'Dashboard de Obras', 'obra', NULL, '/obra', true, 1),
('obra-configuracoes', 'Configurações da Obra', 'obra', NULL, '/obra/configuracoes', true, 2),

-- Submenus das Tarefas
('tarefas-lista', 'Tarefas', 'tarefas', NULL, '/tarefas', true, 1),
('tarefas-historico', 'Histórico', 'tarefas', NULL, '/tarefas/historico', true, 2),

-- Submenus da Biblioteca
('biblioteca-catalogos', 'Catálogos', 'biblioteca', NULL, '/biblioteca/catalogos', true, 1),
('biblioteca-normas', 'Normas', 'biblioteca', NULL, '/biblioteca/normas', true, 2),
('biblioteca-referencias', 'Referências', 'biblioteca', NULL, '/biblioteca/referencias', true, 3),

-- Submenus das Configurações
('configuracoes-gerais', 'Configurações Gerais', 'configuracoes', NULL, '/configuracoes', true, 1),
('theme-customization', 'Personalização de Tema', 'configuracoes', NULL, '/admin/theme-customization', true, 2),

-- Menus de Admin
('admin', 'Admin', NULL, 'Shield', '/admin', false, 14),
('user-management', 'Gerenciar Usuários', NULL, 'UserCog', '/user-management', false, 15)

ON CONFLICT (resource_key) DO UPDATE SET
  resource_name = EXCLUDED.resource_name,
  parent_key = EXCLUDED.parent_key,
  icon_name = EXCLUDED.icon_name,
  route_path = EXCLUDED.route_path,
  is_submenu = EXCLUDED.is_submenu,
  order_index = EXCLUDED.order_index,
  updated_at = now();

-- Atualizar recursos existentes para atribuí-los aos grupos padrão
UPDATE public.interface_resources 
SET group_id = (SELECT id FROM public.menu_groups WHERE name = 'Principal' LIMIT 1)
WHERE resource_key NOT IN ('admin', 'user-management') AND group_id IS NULL;

UPDATE public.interface_resources 
SET group_id = (SELECT id FROM public.menu_groups WHERE name = 'Administração' LIMIT 1)
WHERE resource_key IN ('admin', 'user-management') AND group_id IS NULL;
