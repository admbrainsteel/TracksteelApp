
-- Criar tabela para cadastro de peças
CREATE TABLE public.pecas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  of_number TEXT NOT NULL,
  etapa_fase TEXT,
  marca TEXT NOT NULL,
  descricao TEXT,
  quantidade INTEGER DEFAULT 0,
  peso_unitario NUMERIC(10,3) DEFAULT 0,
  peso_total NUMERIC(10,3) DEFAULT 0,
  tratamento_superficial TEXT,
  material TEXT,
  perfil_principal TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.pecas ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam todas as peças
CREATE POLICY "Users can view all pecas" 
  ON public.pecas 
  FOR SELECT 
  USING (true);

-- Política para permitir que usuários criem peças
CREATE POLICY "Users can create pecas" 
  ON public.pecas 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Política para permitir que usuários atualizem suas próprias peças
CREATE POLICY "Users can update their own pecas" 
  ON public.pecas 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Política para permitir que usuários deletem suas próprias peças
CREATE POLICY "Users can delete their own pecas" 
  ON public.pecas 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_pecas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pecas_updated_at_trigger
    BEFORE UPDATE ON public.pecas
    FOR EACH ROW
    EXECUTE FUNCTION update_pecas_updated_at();
