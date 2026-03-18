
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view tasks assigned to them or created by them" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks or assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

-- Create new policies for tasks table
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
