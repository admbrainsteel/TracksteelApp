
-- Create enum for task status
CREATE TYPE public.task_status AS ENUM ('a_fazer', 'em_andamento', 'revisao', 'pendente', 'bloqueado', 'concluido');

-- Create enum for task priority
CREATE TYPE public.task_priority AS ENUM ('baixa', 'media', 'alta', 'urgente');

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_ref TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  of_number TEXT NOT NULL REFERENCES public.ficha_tecnica_contratos(of_number),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  assigned_to UUID[] DEFAULT '{}',
  due_date TIMESTAMP WITH TIME ZONE,
  status public.task_status DEFAULT 'a_fazer',
  priority public.task_priority DEFAULT 'media',
  category TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task comments table
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task attachments table
CREATE TABLE public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task subtasks table
CREATE TABLE public.task_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all task tables
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;

-- Create policies for tasks table
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

-- Create policies for task comments
CREATE POLICY "Users can view comments on accessible tasks"
  ON public.task_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE id = task_id AND (
        auth.uid() = created_by OR 
        auth.uid() = ANY(assigned_to) OR
        public.has_role(auth.uid(), 'admin')
      )
    )
  );

CREATE POLICY "Authenticated users can create comments on accessible tasks"
  ON public.task_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE id = task_id AND (
        auth.uid() = created_by OR 
        auth.uid() = ANY(assigned_to) OR
        public.has_role(auth.uid(), 'admin')
      )
    )
  );

-- Create policies for task attachments
CREATE POLICY "Users can view attachments on accessible tasks"
  ON public.task_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE id = task_id AND (
        auth.uid() = created_by OR 
        auth.uid() = ANY(assigned_to) OR
        public.has_role(auth.uid(), 'admin')
      )
    )
  );

CREATE POLICY "Authenticated users can upload attachments to accessible tasks"
  ON public.task_attachments
  FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE id = task_id AND (
        auth.uid() = created_by OR 
        auth.uid() = ANY(assigned_to) OR
        public.has_role(auth.uid(), 'admin')
      )
    )
  );

-- Create policies for task subtasks
CREATE POLICY "Users can view subtasks on accessible tasks"
  ON public.task_subtasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE id = task_id AND (
        auth.uid() = created_by OR 
        auth.uid() = ANY(assigned_to) OR
        public.has_role(auth.uid(), 'admin')
      )
    )
  );

CREATE POLICY "Users can manage subtasks on accessible tasks"
  ON public.task_subtasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE id = task_id AND (
        auth.uid() = created_by OR 
        auth.uid() = ANY(assigned_to) OR
        public.has_role(auth.uid(), 'admin')
      )
    )
  );

-- Create function to generate task reference
CREATE OR REPLACE FUNCTION public.generate_task_ref()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  task_ref TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(task_ref FROM 'TASK-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.tasks
  WHERE task_ref ~ '^TASK-\d+$';
  
  task_ref := 'TASK-' || LPAD(next_num::TEXT, 3, '0');
  RETURN task_ref;
END;
$$;

-- Create trigger to auto-generate task reference
CREATE OR REPLACE FUNCTION public.handle_task_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.task_ref IS NULL OR NEW.task_ref = '' THEN
    NEW.task_ref := public.generate_task_ref();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_task_ref_trigger
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_ref();

-- Create trigger to update task completion
CREATE OR REPLACE FUNCTION public.handle_task_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'concluido' AND OLD.status != 'concluido' THEN
    NEW.is_completed := true;
    NEW.completed_at := NOW();
    NEW.completed_by := auth.uid();
  ELSIF NEW.status != 'concluido' AND OLD.status = 'concluido' THEN
    NEW.is_completed := false;
    NEW.completed_at := NULL;
    NEW.completed_by := NULL;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER handle_task_completion_trigger
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_completion();
