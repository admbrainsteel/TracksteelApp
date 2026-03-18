
-- Criar tabela para configurações de prioridades
CREATE TABLE public.prioridades_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  cor text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Inserir as prioridades padrão
INSERT INTO public.prioridades_config (codigo, nome, cor, ordem) VALUES
('P1', 'Crítica', '#dc2626', 1),
('P2', 'Alta', '#ea580c', 2),
('P3', 'Média', '#ca8a04', 3),
('P4', 'Baixa', '#16a34a', 4);

-- Habilitar RLS
ALTER TABLE public.prioridades_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Anyone can view prioridades config" 
  ON public.prioridades_config 
  FOR SELECT 
  USING (true);

CREATE POLICY "Only admins can modify prioridades config" 
  ON public.prioridades_config 
  FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_prioridades_config_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_update_prioridades_config_updated_at
    BEFORE UPDATE ON public.prioridades_config
    FOR EACH ROW
    EXECUTE FUNCTION update_prioridades_config_updated_at();
