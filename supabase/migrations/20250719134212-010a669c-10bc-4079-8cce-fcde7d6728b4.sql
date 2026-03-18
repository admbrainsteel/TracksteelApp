
-- Create function to check if user can be safely deleted
CREATE OR REPLACE FUNCTION public.can_delete_user(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_dependencies boolean := false;
BEGIN
  -- Check if user has any data in critical tables
  SELECT EXISTS (
    -- Check ficha_tecnica_contratos
    SELECT 1 FROM public.ficha_tecnica_contratos WHERE user_id = _user_id
    UNION ALL
    -- Check ordens_fabricacao  
    SELECT 1 FROM public.ordens_fabricacao WHERE user_id = _user_id
    UNION ALL
    -- Check tasks created or assigned
    SELECT 1 FROM public.tasks WHERE created_by = _user_id OR assigned_to = _user_id
    UNION ALL
    -- Check pecas
    SELECT 1 FROM public.pecas WHERE user_id = _user_id
    UNION ALL
    -- Check componentes_peca
    SELECT 1 FROM public.componentes_peca WHERE user_id = _user_id
    UNION ALL
    -- Check apontamentos_producao
    SELECT 1 FROM public.apontamentos_producao WHERE created_by = _user_id
    UNION ALL
    -- Check estoque_materiais
    SELECT 1 FROM public.estoque_materiais WHERE created_by = _user_id
    UNION ALL
    -- Check movimentacoes_estoque
    SELECT 1 FROM public.movimentacoes_estoque WHERE created_by = _user_id
    UNION ALL
    -- Check empenhos_material
    SELECT 1 FROM public.empenhos_material WHERE created_by = _user_id
    UNION ALL
    -- Check cronogramas_of
    SELECT 1 FROM public.cronogramas_of WHERE created_by = _user_id OR gestor_id = _user_id
    UNION ALL
    -- Check diarios_producao
    SELECT 1 FROM public.diarios_producao WHERE created_by = _user_id
    UNION ALL
    -- Check contratos_obra
    SELECT 1 FROM public.contratos_obra WHERE created_by = _user_id
    UNION ALL
    -- Check diario_obra_rdo
    SELECT 1 FROM public.diario_obra_rdo WHERE usuario_rdo = _user_id
    UNION ALL
    -- Check catalogos
    SELECT 1 FROM public.catalogos WHERE created_by = _user_id
    UNION ALL
    -- Check json_codes
    SELECT 1 FROM public.json_codes WHERE created_by = _user_id
  ) INTO has_dependencies;

  RETURN NOT has_dependencies;
END;
$$;

-- Create function to delete user and all related data (only if safe)
CREATE OR REPLACE FUNCTION public.admin_delete_user(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if current user is admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Check if user can be safely deleted
  IF NOT public.can_delete_user(_user_id) THEN
    RAISE EXCEPTION 'User cannot be deleted due to existing dependencies';
  END IF;

  -- Delete from user_roles table
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  
  -- Delete from profiles table
  DELETE FROM public.profiles WHERE id = _user_id;
  
  -- Delete from auth.users table (this will cascade)
  DELETE FROM auth.users WHERE id = _user_id;
  
  RETURN true;
END;
$$;

-- Grant execute permission to authenticated users (the function itself checks for admin role)
GRANT EXECUTE ON FUNCTION public.can_delete_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user TO authenticated;
