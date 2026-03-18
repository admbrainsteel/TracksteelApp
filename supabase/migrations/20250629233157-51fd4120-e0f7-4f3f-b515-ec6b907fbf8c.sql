
-- Criar tabela para configurações de webhook dos conversores
CREATE TABLE public.webhook_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  converter_name text NOT NULL,
  link_envio text NOT NULL,
  link_recebimento text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Criar tabela para rastrear processamentos de arquivos
CREATE TABLE public.file_processings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_config_id uuid REFERENCES public.webhook_configs(id),
  file_name text NOT NULL,
  file_type text NOT NULL,
  status text NOT NULL DEFAULT 'enviado',
  sent_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  download_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Adicionar RLS às tabelas
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_processings ENABLE ROW LEVEL SECURITY;

-- Políticas para webhook_configs
CREATE POLICY "Users can view webhook configs" ON public.webhook_configs
  FOR SELECT USING (true);

CREATE POLICY "Users can create webhook configs" ON public.webhook_configs
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update webhook configs" ON public.webhook_configs
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete webhook configs" ON public.webhook_configs
  FOR DELETE USING (auth.uid() = created_by);

-- Políticas para file_processings
CREATE POLICY "Users can view file processings" ON public.file_processings
  FOR SELECT USING (true);

CREATE POLICY "Users can create file processings" ON public.file_processings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update file processings" ON public.file_processings
  FOR UPDATE USING (true);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_webhook_configs()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_webhook_configs_updated_at
    BEFORE UPDATE ON public.webhook_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_webhook_configs();

CREATE OR REPLACE FUNCTION update_updated_at_file_processings()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_file_processings_updated_at
    BEFORE UPDATE ON public.file_processings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_file_processings();
