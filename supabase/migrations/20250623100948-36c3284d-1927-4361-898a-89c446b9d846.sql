
-- Criar tabela para recursos de interface (telas/menus)
CREATE TABLE public.interface_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_key TEXT NOT NULL UNIQUE,
  resource_name TEXT NOT NULL,
  parent_key TEXT NULL,
  icon_name TEXT NULL,
  route_path TEXT NULL,
  is_submenu BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de relação N:M entre privilégios e recursos de interface
CREATE TABLE public.privilege_interface_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  privilege_id UUID NOT NULL REFERENCES public.privileges(id) ON DELETE CASCADE,
  resource_key TEXT NOT NULL REFERENCES public.interface_resources(resource_key) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(privilege_id, resource_key)
);

-- Inserir os recursos de interface baseados no menu atual
INSERT INTO public.interface_resources (resource_key, resource_name, icon_name, route_path, is_submenu, order_index) VALUES
('dashboard', 'Dashboard', 'LayoutDashboard', '/', false, 1),
('grupos', 'Grupos e Equipe', 'Users', '/grupos', false, 2),
('tarefas', 'Tarefas', 'CheckSquare', '/tarefas', false, 3),
('cadastro', 'Cadastro', 'UserPlus', '/cadastro', false, 4),
('cadastro-of', 'Cadastro de OF', 'FileText', '/cadastro-of', true, 1),
('producao', 'Produção', 'Factory', '/producao', false, 5),
('sistema', 'Sistema', 'Settings', '/sistema', false, 6),
('configuracoes', 'Configurações', 'Settings', '/configuracoes', false, 7),
('admin', 'Painel Admin', 'Shield', '/admin', false, 8),
('user-management', 'Usuários e Privilégios', 'Users', '/user-management', false, 9);

-- Definir relações pai-filho para submenus
UPDATE public.interface_resources 
SET parent_key = 'cadastro' 
WHERE resource_key = 'cadastro-of';

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.interface_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privilege_interface_resources ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para interface_resources (todos podem ler, só admins podem modificar)
CREATE POLICY "Anyone can view interface resources"
  ON public.interface_resources
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify interface resources"
  ON public.interface_resources
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para privilege_interface_resources (só admins podem gerenciar)
CREATE POLICY "Only admins can manage privilege interface resources"
  ON public.privilege_interface_resources
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Função para verificar se usuário tem acesso a um recurso específico
CREATE OR REPLACE FUNCTION public.user_has_interface_access(_user_id UUID, _resource_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.privilege_interface_resources pir ON p.privilege_id = pir.privilege_id
    WHERE p.id = _user_id
      AND pir.resource_key = _resource_key
  ) OR public.has_role(_user_id, 'admin');
$$;
