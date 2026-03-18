
-- Update the function to be more permissive and only check truly critical dependencies
CREATE OR REPLACE FUNCTION public.can_delete_user(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_critical_dependencies boolean := false;
BEGIN
  -- Only check for truly critical data that would break system integrity
  SELECT EXISTS (
    -- Check ficha_tecnica_contratos (critical business data)
    SELECT 1 FROM public.ficha_tecnica_contratos WHERE user_id = _user_id
    UNION ALL
    -- Check ordens_fabricacao (critical business data)
    SELECT 1 FROM public.ordens_fabricacao WHERE user_id = _user_id
    UNION ALL
    -- Check tasks that are assigned to user (but not created by - creation is less critical)
    SELECT 1 FROM public.tasks WHERE assigned_to = _user_id
    UNION ALL
    -- Check pecas (critical manufacturing data)
    SELECT 1 FROM public.pecas WHERE user_id = _user_id
    UNION ALL
    -- Check apontamentos_producao (critical production data)
    SELECT 1 FROM public.apontamentos_producao WHERE created_by = _user_id
    UNION ALL
    -- Check cronogramas_of where user is gestor (critical role)
    SELECT 1 FROM public.cronogramas_of WHERE gestor_id = _user_id
    UNION ALL
    -- Check diarios_producao (critical production records)
    SELECT 1 FROM public.diarios_producao WHERE created_by = _user_id
    UNION ALL
    -- Check contratos_obra (critical business data)
    SELECT 1 FROM public.contratos_obra WHERE created_by = _user_id
    UNION ALL
    -- Check diario_obra_rdo (critical work records)
    SELECT 1 FROM public.diario_obra_rdo WHERE usuario_rdo = _user_id
  ) INTO has_critical_dependencies;

  -- User can be deleted if they don't have critical dependencies
  RETURN NOT has_critical_dependencies;
END;
$$;
