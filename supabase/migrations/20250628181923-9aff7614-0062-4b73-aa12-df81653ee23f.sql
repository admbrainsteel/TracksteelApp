
-- Criar tabela para armazenar chaves API
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS - apenas administradores podem gerenciar chaves API
CREATE POLICY "Only admins can manage API keys"
  ON public.api_keys
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Criar trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Garantir que apenas uma chave seja primary por vez
CREATE UNIQUE INDEX idx_api_keys_single_primary 
  ON public.api_keys (is_primary) 
  WHERE is_primary = true;
