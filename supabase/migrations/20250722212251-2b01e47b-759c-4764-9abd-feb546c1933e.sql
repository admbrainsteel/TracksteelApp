
-- Criar função auxiliar para verificar se o usuário tem permissões administrativas ou de colaborador
CREATE OR REPLACE FUNCTION public.user_can_access_ofs(_user_id uuid)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_is_admin boolean := false;
  user_permissions record;
BEGIN
  -- Verificar se é admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'admin'
  ) INTO user_is_admin;
  
  IF user_is_admin THEN
    RETURN true;
  END IF;
  
  -- Verificar privilégios funcionais (Admin ou qualquer permissão que não seja apenas visualização)
  SELECT p.permissions INTO user_permissions
  FROM public.profiles pr
  JOIN public.privileges p ON pr.privilege_id = p.id
  WHERE pr.id = _user_id;
  
  -- Se tem privilégios administrativos ou de colaborador (qualquer coisa além de view_only)
  IF user_permissions.permissions IS NOT NULL THEN
    IF (user_permissions.permissions->>'can_admin')::boolean = true OR
       (user_permissions.permissions->>'can_create_update_delete')::boolean = true OR
       (user_permissions.permissions->>'can_create_only')::boolean = true THEN
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$;

-- Atualizar política SELECT para ficha_tecnica_contratos
DROP POLICY IF EXISTS "Users can view their own fichas" ON public.ficha_tecnica_contratos;

CREATE POLICY "Users with permissions can view fichas"
  ON public.ficha_tecnica_contratos
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    public.user_can_access_ofs(auth.uid())
  );

-- Atualizar política INSERT para ficha_tecnica_contratos
DROP POLICY IF EXISTS "Users can create their own fichas" ON public.ficha_tecnica_contratos;

CREATE POLICY "Users with permissions can create fichas"
  ON public.ficha_tecnica_contratos
  FOR INSERT
  WITH CHECK (
    public.user_can_access_ofs(auth.uid())
  );

-- Atualizar política UPDATE para ficha_tecnica_contratos
DROP POLICY IF EXISTS "Users can update their own fichas" ON public.ficha_tecnica_contratos;

CREATE POLICY "Users with permissions can update fichas"
  ON public.ficha_tecnica_contratos
  FOR UPDATE
  USING (
    auth.uid() = user_id OR 
    public.user_can_access_ofs(auth.uid())
  );

-- Atualizar política DELETE para ficha_tecnica_contratos
DROP POLICY IF EXISTS "Users can delete their own fichas" ON public.ficha_tecnica_contratos;

CREATE POLICY "Users with permissions can delete fichas"
  ON public.ficha_tecnica_contratos
  FOR DELETE
  USING (
    auth.uid() = user_id OR 
    public.user_can_access_ofs(auth.uid())
  );
