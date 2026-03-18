
-- Criar tabela para armazenar códigos JSON
CREATE TABLE public.json_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  json_code JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Habilitar Row Level Security
ALTER TABLE public.json_codes ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS - apenas administradores podem gerenciar códigos JSON
CREATE POLICY "Only admins can manage JSON codes"
  ON public.json_codes
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Criar trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_json_codes_updated_at
  BEFORE UPDATE ON public.json_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar índice para melhor performance nas consultas por nome
CREATE INDEX idx_json_codes_name ON public.json_codes(name);
CREATE INDEX idx_json_codes_active ON public.json_codes(is_active);
