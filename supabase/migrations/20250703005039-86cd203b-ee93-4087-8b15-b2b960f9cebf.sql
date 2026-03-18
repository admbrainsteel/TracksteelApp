
-- Criar tabela para romaneios de expedição
CREATE TABLE public.romaneios_expedicao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_romaneio TEXT NOT NULL UNIQUE,
  of_number TEXT NOT NULL,
  data_romaneio DATE NOT NULL DEFAULT CURRENT_DATE,
  prioridade INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Em Preparação',
  observacoes TEXT,
  peso_total_romaneio NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Criar tabela para itens do romaneio (peças)
CREATE TABLE public.itens_romaneio_pecas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  romaneio_id UUID NOT NULL REFERENCES public.romaneios_expedicao(id) ON DELETE CASCADE,
  peca_id UUID NOT NULL REFERENCES public.pecas(id),
  marca TEXT NOT NULL,
  fase TEXT,
  descricao TEXT,
  comprimento NUMERIC(10,2),
  peso_unitario NUMERIC(10,3) NOT NULL,
  quantidade_expedida NUMERIC(10,2) NOT NULL,
  peso_total NUMERIC(10,2) NOT NULL,
  quantidade_faltante NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para insumos do romaneio
CREATE TABLE public.itens_romaneio_insumos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  romaneio_id UUID NOT NULL REFERENCES public.romaneios_expedicao(id) ON DELETE CASCADE,
  tipo_insumo TEXT NOT NULL, -- 'parafusos', 'tintas', 'eletrodos', 'cola', etc
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'PC',
  quantidade_expedida NUMERIC(10,2) NOT NULL,
  peso_unitario NUMERIC(10,3),
  peso_total NUMERIC(10,2),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para melhorar performance
CREATE INDEX idx_romaneios_of_number ON public.romaneios_expedicao(of_number);
CREATE INDEX idx_romaneios_data ON public.romaneios_expedicao(data_romaneio);
CREATE INDEX idx_itens_romaneio_pecas ON public.itens_romaneio_pecas(romaneio_id);
CREATE INDEX idx_itens_romaneio_insumos ON public.itens_romaneio_insumos(romaneio_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_romaneios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_romaneios_expedicao_updated_at
    BEFORE UPDATE ON public.romaneios_expedicao
    FOR EACH ROW EXECUTE FUNCTION update_romaneios_updated_at();

-- Políticas RLS
ALTER TABLE public.romaneios_expedicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_romaneio_pecas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_romaneio_insumos ENABLE ROW LEVEL SECURITY;

-- Políticas para romaneios_expedicao
CREATE POLICY "Usuários autenticados podem visualizar romaneios" 
  ON public.romaneios_expedicao FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir romaneios" 
  ON public.romaneios_expedicao FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar romaneios" 
  ON public.romaneios_expedicao FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar romaneios" 
  ON public.romaneios_expedicao FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- Políticas para itens_romaneio_pecas
CREATE POLICY "Usuários autenticados podem visualizar itens peças" 
  ON public.itens_romaneio_pecas FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir itens peças" 
  ON public.itens_romaneio_pecas FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar itens peças" 
  ON public.itens_romaneio_pecas FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar itens peças" 
  ON public.itens_romaneio_pecas FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- Políticas para itens_romaneio_insumos
CREATE POLICY "Usuários autenticados podem visualizar itens insumos" 
  ON public.itens_romaneio_insumos FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir itens insumos" 
  ON public.itens_romaneio_insumos FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar itens insumos" 
  ON public.itens_romaneio_insumos FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar itens insumos" 
  ON public.itens_romaneio_insumos FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- Função para gerar número do romaneio automaticamente
CREATE OR REPLACE FUNCTION generate_romaneio_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  new_romaneio_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_romaneio FROM 'ROM-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.romaneios_expedicao
  WHERE numero_romaneio ~ '^ROM-\d+$';
  
  new_romaneio_number := 'ROM-' || LPAD(next_num::TEXT, 4, '0');
  RETURN new_romaneio_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar número do romaneio automaticamente
CREATE OR REPLACE FUNCTION handle_romaneio_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_romaneio IS NULL OR NEW.numero_romaneio = '' THEN
    NEW.numero_romaneio := generate_romaneio_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_romaneio_number_trigger
    BEFORE INSERT ON public.romaneios_expedicao
    FOR EACH ROW EXECUTE FUNCTION handle_romaneio_number();
