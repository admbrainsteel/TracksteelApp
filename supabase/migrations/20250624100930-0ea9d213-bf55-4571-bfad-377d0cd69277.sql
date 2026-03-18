
-- Adicionar campos de data início e término à tabela de fichas técnicas
ALTER TABLE ficha_tecnica_contratos 
ADD COLUMN data_inicio date,
ADD COLUMN data_termino_prev date;

-- Atualizar os dados existentes para migrar data_criacao para data_inicio
UPDATE ficha_tecnica_contratos 
SET data_inicio = data_criacao 
WHERE data_inicio IS NULL;

-- Criar tabela para ordens de fabricação
CREATE TABLE public.ordens_fabricacao (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  num_of text NOT NULL,
  descritivo text,
  data_abertura date,
  data_prazo date,
  peso_total numeric,
  criterio_qualidade text,
  tratamento_final text,
  local_uf text,
  status text DEFAULT 'ativa',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  ficha_tecnica_id uuid REFERENCES ficha_tecnica_contratos(id)
);

-- Criar tabela para OFs arquivadas/concluídas
CREATE TABLE public.ofs_concluidas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  num_of text NOT NULL,
  descritivo text,
  data_abertura date,
  data_prazo date,
  peso_total numeric,
  criterio_qualidade text,
  tratamento_final text,
  local_uf text,
  data_arquivamento timestamp with time zone DEFAULT now(),
  arquivado_por uuid,
  ficha_tecnica_data jsonb, -- Dados da ficha técnica arquivados
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid
);

-- Adicionar RLS às novas tabelas
ALTER TABLE public.ordens_fabricacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofs_concluidas ENABLE ROW LEVEL SECURITY;

-- Políticas para ordens_fabricacao (usuários autenticados podem ver todas)
CREATE POLICY "Authenticated users can view ordens_fabricacao" 
  ON public.ordens_fabricacao 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert ordens_fabricacao" 
  ON public.ordens_fabricacao 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update ordens_fabricacao" 
  ON public.ordens_fabricacao 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete ordens_fabricacao" 
  ON public.ordens_fabricacao 
  FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Políticas para ofs_concluidas (usuários autenticados podem ver todas)
CREATE POLICY "Authenticated users can view ofs_concluidas" 
  ON public.ofs_concluidas 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert ofs_concluidas" 
  ON public.ofs_concluidas 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ordens_fabricacao_updated_at 
  BEFORE UPDATE ON ordens_fabricacao 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
