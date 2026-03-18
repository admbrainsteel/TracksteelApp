
-- Create enum for user status
CREATE TYPE public.user_status AS ENUM ('pending', 'active', 'inactive', 'rejected');

-- Create functions table for user roles/functions
CREATE TABLE public.functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create privileges table for access control
CREATE TABLE public.privileges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update the existing profiles table to include the new fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS function_id UUID REFERENCES public.functions(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privilege_id UUID REFERENCES public.privileges(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status public.user_status DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Enable RLS on new tables
ALTER TABLE public.functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privileges ENABLE ROW LEVEL SECURITY;

-- Create policies for functions table
CREATE POLICY "Admins can manage functions"
  ON public.functions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "All authenticated users can view functions"
  ON public.functions
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for privileges table
CREATE POLICY "Admins can manage privileges"
  ON public.privileges
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "All authenticated users can view privileges"
  ON public.privileges
  FOR SELECT
  TO authenticated
  USING (true);

-- Update profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile image"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Insert default functions
INSERT INTO public.functions (name, description) VALUES
  ('Desenvolvedor', 'Responsável pelo desenvolvimento de software'),
  ('Gerente de Produção/Engenharia', 'Gerencia processos de produção e engenharia'),
  ('Projetista', 'Responsável por projetos técnicos'),
  ('Vendedora', 'Responsável por vendas'),
  ('Compradora', 'Responsável por compras')
ON CONFLICT (name) DO NOTHING;

-- Insert default privileges
INSERT INTO public.privileges (name, description, permissions) VALUES
  ('Admin', 'Acesso total ao sistema', '{"can_manage_users": true, "can_edit_settings": true, "can_view_all": true}'),
  ('Viewer', 'Apenas visualização', '{"can_manage_users": false, "can_edit_settings": false, "can_view_all": false}')
ON CONFLICT (name) DO NOTHING;

-- Update existing user registration trigger to set status as pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, status, requested_at)
  VALUES (new.id, new.email, 'pending', NOW());
  RETURN new;
END;
$$;
