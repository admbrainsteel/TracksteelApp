
-- Corrigir a função generate_task_ref para evitar ambiguidade na coluna task_ref
CREATE OR REPLACE FUNCTION public.generate_task_ref()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  new_task_ref TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(tasks.task_ref FROM 'T-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.tasks
  WHERE tasks.task_ref ~ '^T-\d+$';
  
  new_task_ref := 'T-' || LPAD(next_num::TEXT, 4, '0');
  RETURN new_task_ref;
END;
$$;

-- Verificar e recriar as políticas RLS para garantir que estão funcionando corretamente
DROP POLICY IF EXISTS "Users can view tasks assigned to them or created by them" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks or assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

-- Recriar as políticas RLS
CREATE POLICY "Users can view tasks assigned to them or created by them"
  ON public.tasks
  FOR SELECT
  USING (
    auth.uid() = created_by OR 
    auth.uid() = ANY(assigned_to) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Authenticated users can create tasks"
  ON public.tasks
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own tasks or assigned tasks"
  ON public.tasks
  FOR UPDATE
  USING (
    auth.uid() = created_by OR 
    auth.uid() = ANY(assigned_to) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can delete their own tasks"
  ON public.tasks
  FOR DELETE
  USING (
    auth.uid() = created_by OR
    public.has_role(auth.uid(), 'admin')
  );
