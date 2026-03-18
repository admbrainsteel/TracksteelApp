
-- Criar tabela para configurações de tema
CREATE TABLE public.theme_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  light_theme jsonb NOT NULL DEFAULT '{}',
  dark_theme jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.theme_config ENABLE ROW LEVEL SECURITY;

-- Política para permitir que apenas admins possam gerenciar temas
CREATE POLICY "Only admins can manage themes" 
  ON public.theme_config 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

-- Inserir registro inicial com tema padrão
INSERT INTO public.theme_config (id, light_theme, dark_theme) 
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '{"background": "0 0% 100%", "foreground": "222.2 84% 4.9%", "primary": "222.2 47.4% 11.2%", "primary-foreground": "210 40% 98%", "secondary": "210 40% 96.1%", "secondary-foreground": "222.2 47.4% 11.2%", "accent": "210 40% 96.1%", "accent-foreground": "222.2 47.4% 11.2%", "card": "0 0% 100%", "card-foreground": "222.2 84% 4.9%", "border": "214.3 31.8% 91.4%", "input": "214.3 31.8% 91.4%", "ring": "222.2 84% 4.9%"}',
  '{"background": "222.2 84% 4.9%", "foreground": "210 40% 98%", "primary": "210 40% 98%", "primary-foreground": "222.2 47.4% 11.2%", "secondary": "217.2 32.6% 17.5%", "secondary-foreground": "210 40% 98%", "accent": "217.2 32.6% 17.5%", "accent-foreground": "210 40% 98%", "card": "222.2 84% 4.9%", "card-foreground": "210 40% 98%", "border": "217.2 32.6% 17.5%", "input": "217.2 32.6% 17.5%", "ring": "212.7 26.8% 83.9%"}'
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_theme_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_theme_config_updated_at
    BEFORE UPDATE ON public.theme_config
    FOR EACH ROW
    EXECUTE FUNCTION update_theme_config_updated_at();
