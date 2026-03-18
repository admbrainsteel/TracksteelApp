
-- Criar função RPC para buscar todos os usuários para tarefas
CREATE OR REPLACE FUNCTION public.get_all_users_for_tasks()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name
  FROM public.profiles p
  WHERE p.status = 'active'
  ORDER BY 
    COALESCE(NULLIF(trim(p.full_name), ''), p.email) ASC,
    p.email ASC;
END;
$$;
