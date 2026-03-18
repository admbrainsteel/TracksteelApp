
-- Criar tabela para componentes das peças
CREATE TABLE public.componentes_peca (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  peca_id UUID NOT NULL REFERENCES public.pecas(id) ON DELETE CASCADE,
  marca_componente TEXT NOT NULL,
  descricao TEXT,
  perfil TEXT,
  peso_unitario NUMERIC(10,3) DEFAULT 0,
  quantidade_por_peca INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users,
  
  -- Constraint para garantir que marcas de componentes sejam numéricas entre 1000-9999
  CONSTRAINT check_marca_componente_range CHECK (
    marca_componente ~ '^\d+$' AND 
    CAST(marca_componente AS INTEGER) BETWEEN 1000 AND 9999
  )
);

-- Habilitar RLS
ALTER TABLE public.componentes_peca ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para componentes
CREATE POLICY "Users can view all componentes" 
  ON public.componentes_peca 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can create componentes" 
  ON public.componentes_peca 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own componentes" 
  ON public.componentes_peca 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own componentes" 
  ON public.componentes_peca 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_componentes_peca_updated_at_trigger
    BEFORE UPDATE ON public.componentes_peca
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Índices para melhor performance
CREATE INDEX idx_componentes_peca_peca_id ON public.componentes_peca(peca_id);
CREATE INDEX idx_componentes_peca_marca ON public.componentes_peca(marca_componente);
