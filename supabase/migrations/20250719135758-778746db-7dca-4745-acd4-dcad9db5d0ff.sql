
-- Create function to get detailed user dependencies
CREATE OR REPLACE FUNCTION public.get_user_dependencies(_user_id uuid)
RETURNS TABLE(
  table_name text,
  dependency_type text,
  count bigint,
  description text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 'ficha_tecnica_contratos'::text, 'created'::text, COUNT(*)::bigint, 'Fichas técnicas criadas'::text
  FROM public.ficha_tecnica_contratos WHERE user_id = _user_id
  UNION ALL
  SELECT 'ordens_fabricacao'::text, 'created'::text, COUNT(*)::bigint, 'Ordens de fabricação criadas'::text
  FROM public.ordens_fabricacao WHERE user_id = _user_id
  UNION ALL
  SELECT 'tasks'::text, 'assigned'::text, COUNT(*)::bigint, 'Tarefas atribuídas'::text
  FROM public.tasks WHERE assigned_to = _user_id
  UNION ALL
  SELECT 'tasks'::text, 'created'::text, COUNT(*)::bigint, 'Tarefas criadas'::text
  FROM public.tasks WHERE created_by = _user_id
  UNION ALL
  SELECT 'pecas'::text, 'created'::text, COUNT(*)::bigint, 'Peças criadas'::text
  FROM public.pecas WHERE user_id = _user_id
  UNION ALL
  SELECT 'apontamentos_producao'::text, 'created'::text, COUNT(*)::bigint, 'Apontamentos de produção'::text
  FROM public.apontamentos_producao WHERE created_by = _user_id
  UNION ALL
  SELECT 'cronogramas_of'::text, 'manager'::text, COUNT(*)::bigint, 'Cronogramas como gestor'::text
  FROM public.cronogramas_of WHERE gestor_id = _user_id
  UNION ALL
  SELECT 'cronogramas_of'::text, 'created'::text, COUNT(*)::bigint, 'Cronogramas criados'::text
  FROM public.cronogramas_of WHERE created_by = _user_id
  UNION ALL
  SELECT 'diarios_producao'::text, 'created'::text, COUNT(*)::bigint, 'Diários de produção'::text
  FROM public.diarios_producao WHERE created_by = _user_id
  UNION ALL
  SELECT 'contratos_obra'::text, 'created'::text, COUNT(*)::bigint, 'Contratos de obra'::text
  FROM public.contratos_obra WHERE created_by = _user_id
  UNION ALL
  SELECT 'diario_obra_rdo'::text, 'responsible'::text, COUNT(*)::bigint, 'RDOs como responsável'::text
  FROM public.diario_obra_rdo WHERE usuario_rdo = _user_id
  UNION ALL
  SELECT 'estoque_materiais'::text, 'created'::text, COUNT(*)::bigint, 'Materiais de estoque criados'::text
  FROM public.estoque_materiais WHERE created_by = _user_id
  UNION ALL
  SELECT 'movimentacoes_estoque'::text, 'created'::text, COUNT(*)::bigint, 'Movimentações de estoque'::text
  FROM public.movimentacoes_estoque WHERE created_by = _user_id
  UNION ALL
  SELECT 'empenhos_material'::text, 'created'::text, COUNT(*)::bigint, 'Empenhos de material'::text
  FROM public.empenhos_material WHERE created_by = _user_id
  UNION ALL
  SELECT 'componentes_peca'::text, 'created'::text, COUNT(*)::bigint, 'Componentes de peça'::text
  FROM public.componentes_peca WHERE user_id = _user_id;
END;
$$;

-- Update the can_delete_user function to be more lenient for new users
CREATE OR REPLACE FUNCTION public.can_delete_user(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_critical_dependencies boolean := false;
  user_created_at timestamp with time zone;
BEGIN
  -- Get when the user was created
  SELECT created_at INTO user_created_at
  FROM public.profiles WHERE id = _user_id;
  
  -- If user was created very recently (less than 1 day ago) and has no critical data, allow deletion
  IF user_created_at > (now() - interval '1 day') THEN
    SELECT EXISTS (
      -- Only check the most critical data for new users
      SELECT 1 FROM public.ficha_tecnica_contratos WHERE user_id = _user_id
      UNION ALL
      SELECT 1 FROM public.ordens_fabricacao WHERE user_id = _user_id
      UNION ALL
      SELECT 1 FROM public.pecas WHERE user_id = _user_id
      UNION ALL
      SELECT 1 FROM public.apontamentos_producao WHERE created_by = _user_id
    ) INTO has_critical_dependencies;
  ELSE
    -- For older users, check all critical dependencies
    SELECT EXISTS (
      SELECT 1 FROM public.ficha_tecnica_contratos WHERE user_id = _user_id
      UNION ALL
      SELECT 1 FROM public.ordens_fabricacao WHERE user_id = _user_id
      UNION ALL
      SELECT 1 FROM public.tasks WHERE assigned_to = _user_id
      UNION ALL
      SELECT 1 FROM public.pecas WHERE user_id = _user_id
      UNION ALL
      SELECT 1 FROM public.apontamentos_producao WHERE created_by = _user_id
      UNION ALL
      SELECT 1 FROM public.cronogramas_of WHERE gestor_id = _user_id
      UNION ALL
      SELECT 1 FROM public.diarios_producao WHERE created_by = _user_id
      UNION ALL
      SELECT 1 FROM public.contratos_obra WHERE created_by = _user_id
      UNION ALL
      SELECT 1 FROM public.diario_obra_rdo WHERE usuario_rdo = _user_id
    ) INTO has_critical_dependencies;
  END IF;

  RETURN NOT has_critical_dependencies;
END;
$$;

-- Create function to replace user references with "UserDel"
CREATE OR REPLACE FUNCTION public.replace_user_with_deleted(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_user_id uuid;
BEGIN
  -- Check if current user is admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can replace user references';
  END IF;

  -- Create or get "UserDel" user in profiles
  SELECT id INTO deleted_user_id
  FROM public.profiles 
  WHERE email = 'user.deleted@system.internal';
  
  IF deleted_user_id IS NULL THEN
    -- Create the deleted user placeholder
    INSERT INTO public.profiles (id, email, full_name, status)
    VALUES (gen_random_uuid(), 'user.deleted@system.internal', 'Usuário Excluído', 'inactive')
    RETURNING id INTO deleted_user_id;
  END IF;

  -- Replace user references in non-critical tables
  UPDATE public.tasks SET created_by = deleted_user_id WHERE created_by = _user_id;
  UPDATE public.cronogramas_of SET created_by = deleted_user_id WHERE created_by = _user_id;
  UPDATE public.estoque_materiais SET created_by = deleted_user_id WHERE created_by = _user_id;
  UPDATE public.movimentacoes_estoque SET created_by = deleted_user_id WHERE created_by = _user_id;
  UPDATE public.empenhos_material SET created_by = deleted_user_id WHERE created_by = _user_id;
  UPDATE public.componentes_peca SET user_id = deleted_user_id WHERE user_id = _user_id;
  
  -- Note: We don't replace references in critical business tables like:
  -- ficha_tecnica_contratos, ordens_fabricacao, pecas, apontamentos_producao
  -- These should prevent deletion if they exist
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_dependencies TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_user_with_deleted TO authenticated;
