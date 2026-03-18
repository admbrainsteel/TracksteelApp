
-- Criar tabela principal para prioridades de fabricação
CREATE TABLE public.prioridades_fabricacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  of_number TEXT NOT NULL,
  etapa_fase TEXT NOT NULL,
  prioridade_id UUID REFERENCES prioridades_config(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  nome_prioridade TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true
);

-- Criar tabela para itens da prioridade
CREATE TABLE public.itens_prioridade_fabricacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prioridade_fabricacao_id UUID REFERENCES prioridades_fabricacao(id) ON DELETE CASCADE,
  peca_id UUID REFERENCES pecas(id),
  quantidade_priorizada NUMERIC NOT NULL DEFAULT 0,
  ordem_fabricacao INTEGER NOT NULL DEFAULT 1,
  peso_total NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.prioridades_fabricacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_prioridade_fabricacao ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para prioridades_fabricacao
CREATE POLICY "Usuários autenticados podem visualizar prioridades" 
  ON public.prioridades_fabricacao 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir prioridades" 
  ON public.prioridades_fabricacao 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar prioridades" 
  ON public.prioridades_fabricacao 
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar prioridades" 
  ON public.prioridades_fabricacao 
  FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- Criar políticas RLS para itens_prioridade_fabricacao
CREATE POLICY "Usuários autenticados podem visualizar itens prioridade" 
  ON public.itens_prioridade_fabricacao 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir itens prioridade" 
  ON public.itens_prioridade_fabricacao 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar itens prioridade" 
  ON public.itens_prioridade_fabricacao 
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar itens prioridade" 
  ON public.itens_prioridade_fabricacao 
  FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_prioridades_fabricacao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prioridades_fabricacao_updated_at
    BEFORE UPDATE ON public.prioridades_fabricacao
    FOR EACH ROW
    EXECUTE FUNCTION update_prioridades_fabricacao_updated_at();

CREATE OR REPLACE FUNCTION update_itens_prioridade_fabricacao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_itens_prioridade_fabricacao_updated_at
    BEFORE UPDATE ON public.itens_prioridade_fabricacao
    FOR EACH ROW
    EXECUTE FUNCTION update_itens_prioridade_fabricacao_updated_at();

-- Criar índices para performance
CREATE INDEX idx_prioridades_fabricacao_of_fase ON public.prioridades_fabricacao(of_number, etapa_fase);
CREATE INDEX idx_itens_prioridade_ordem ON public.itens_prioridade_fabricacao(prioridade_fabricacao_id, ordem_fabricacao);
