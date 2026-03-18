
-- Criar enum para níveis de permissão
CREATE TYPE public.permission_level AS ENUM (
  'can_admin',
  'can_create_update_delete', 
  'can_create_only',
  'can_view_only',
  'no_access'
);

-- Criar tabela para permissões específicas por usuário e recurso
CREATE TABLE public.user_interface_permissions (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_key TEXT NOT NULL REFERENCES public.interface_resources(resource_key) ON DELETE CASCADE,
  permission public.permission_level NOT NULL DEFAULT 'no_access',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, resource_key)
);

-- Criar índice para busca por resource_key
CREATE INDEX idx_user_interface_permissions_resource_key ON public.user_interface_permissions(resource_key);

-- Habilitar RLS
ALTER TABLE public.user_interface_permissions ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: usuário pode ver suas próprias permissões, admin pode ver todas
CREATE POLICY "Users can view own permissions, admins can view all"
  ON public.user_interface_permissions
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Política para INSERT/UPDATE/DELETE: apenas admin
CREATE POLICY "Only admins can manage user permissions"
  ON public.user_interface_permissions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_user_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_interface_permissions_updated_at
    BEFORE UPDATE ON public.user_interface_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_permissions_updated_at();

-- Função RPC para obter permissão efetiva de um usuário para um recurso específico
CREATE OR REPLACE FUNCTION public.get_effective_permission_for_resource(
  _user_id UUID,
  _resource_key TEXT
)
RETURNS public.permission_level
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_permission public.permission_level;
  user_privileges RECORD;
BEGIN
  -- Se é admin, sempre retorna can_admin
  IF public.has_role(_user_id, 'admin'::app_role) THEN
    RETURN 'can_admin'::permission_level;
  END IF;

  -- Verificar se existe override específico para este usuário e recurso
  SELECT permission INTO user_permission
  FROM public.user_interface_permissions
  WHERE user_id = _user_id AND resource_key = _resource_key;

  -- Se existe override, retornar ele
  IF user_permission IS NOT NULL THEN
    RETURN user_permission;
  END IF;

  -- Caso contrário, usar permissões funcionais do privilégio do usuário
  SELECT p.permissions INTO user_privileges
  FROM public.profiles pr
  JOIN public.privileges p ON pr.privilege_id = p.id
  WHERE pr.id = _user_id;

  -- Se não tem privilégio definido, sem acesso
  IF user_privileges.permissions IS NULL THEN
    RETURN 'no_access'::permission_level;
  END IF;

  -- Converter permissões funcionais para permission_level (maior nível disponível)
  IF (user_privileges.permissions->>'can_admin')::boolean = true THEN
    RETURN 'can_admin'::permission_level;
  ELSIF (user_privileges.permissions->>'can_create_update_delete')::boolean = true THEN
    RETURN 'can_create_update_delete'::permission_level;
  ELSIF (user_privileges.permissions->>'can_create_only')::boolean = true THEN
    RETURN 'can_create_only'::permission_level;
  ELSIF (user_privileges.permissions->>'can_view_only')::boolean = true THEN
    RETURN 'can_view_only'::permission_level;
  ELSE
    RETURN 'no_access'::permission_level;
  END IF;
END;
$$;

-- Função RPC para obter todas as permissões efetivas de um usuário
CREATE OR REPLACE FUNCTION public.get_effective_permissions_for_user(_user_id UUID)
RETURNS TABLE(resource_key TEXT, permission public.permission_level)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ir.resource_key,
    public.get_effective_permission_for_resource(_user_id, ir.resource_key) as permission
  FROM public.interface_resources ir
  ORDER BY ir.resource_key;
END;
$$;

-- Habilitar realtime para a tabela user_interface_permissions
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_interface_permissions;

-- Definir REPLICA IDENTITY FULL para payloads completos no realtime
ALTER TABLE public.user_interface_permissions REPLICA IDENTITY FULL;
