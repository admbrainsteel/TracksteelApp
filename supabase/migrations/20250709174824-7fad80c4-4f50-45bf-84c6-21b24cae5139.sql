-- Create table for menu groups
CREATE TABLE public.menu_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.menu_groups ENABLE ROW LEVEL SECURITY;

-- Create policies for menu groups
CREATE POLICY "Only admins can manage menu groups" 
ON public.menu_groups 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add group_id to interface_resources table
ALTER TABLE public.interface_resources 
ADD COLUMN group_id UUID REFERENCES public.menu_groups(id);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_menu_groups_updated_at
  BEFORE UPDATE ON public.menu_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default menu groups
INSERT INTO public.menu_groups (name, color, order_index) VALUES
('Principal', '#6366f1', 0),
('Administração', '#ef4444', 1);

-- Update existing interface resources to assign them to default group
UPDATE public.interface_resources 
SET group_id = (SELECT id FROM public.menu_groups WHERE name = 'Principal' LIMIT 1)
WHERE resource_key NOT IN ('admin', 'user-management');

UPDATE public.interface_resources 
SET group_id = (SELECT id FROM public.menu_groups WHERE name = 'Administração' LIMIT 1)
WHERE resource_key IN ('admin', 'user-management');