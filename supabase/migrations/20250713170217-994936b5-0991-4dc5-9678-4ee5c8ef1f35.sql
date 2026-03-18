-- Add revision field to tasks table and archived fields
ALTER TABLE public.tasks 
ADD COLUMN revision INTEGER DEFAULT 1,
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN archived_by UUID REFERENCES auth.users(id);

-- Function to increment revision when task is updated
CREATE OR REPLACE FUNCTION increment_task_revision()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment revision if the task content has actually changed
  IF (OLD.title != NEW.title OR 
      OLD.description != NEW.description OR 
      OLD.of_number != NEW.of_number OR 
      OLD.assigned_to != NEW.assigned_to OR 
      OLD.due_date != NEW.due_date OR 
      OLD.priority != NEW.priority OR 
      OLD.category != NEW.category) THEN
    
    NEW.revision = COALESCE(OLD.revision, 1) + 1;
    
    -- Update task_ref to include revision number if > 1
    IF NEW.revision > 1 THEN
      -- Extract base task ref (remove any existing revision)
      NEW.task_ref = regexp_replace(OLD.task_ref, '/\d+$', '') || '/' || NEW.revision;
    END IF;
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for revision increment
DROP TRIGGER IF EXISTS task_revision_trigger ON public.tasks;
CREATE TRIGGER task_revision_trigger
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION increment_task_revision();