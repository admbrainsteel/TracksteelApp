
-- Criar tabela para armazenar os diários de produção
CREATE TABLE public.diarios_producao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  tecnico_responsavel TEXT NOT NULL,
  turno TEXT NOT NULL CHECK (turno IN ('1-manha', '1-tarde', '2-turno')),
  observacoes_gerais TEXT,
  fotos_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  finalizado BOOLEAN DEFAULT false
);

-- Criar tabela para recursos (máquinas e operários)
CREATE TABLE public.recursos_producao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('maquina', 'operario')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para apontamentos de recursos por OF no diário
CREATE TABLE public.apontamentos_diario_recursos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  diario_id UUID NOT NULL REFERENCES public.diarios_producao(id) ON DELETE CASCADE,
  of_number TEXT NOT NULL,
  recurso_id UUID NOT NULL REFERENCES public.recursos_producao(id),
  qtd_inicio NUMERIC DEFAULT 0,
  qtd_meio NUMERIC DEFAULT 0,
  qtd_fim NUMERIC DEFAULT 0,
  qtd_segundo_turno NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para lotes de solda por OF no diário
CREATE TABLE public.lotes_solda_diario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  diario_id UUID NOT NULL REFERENCES public.diarios_producao(id) ON DELETE CASCADE,
  of_number TEXT NOT NULL,
  lote_solda TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para ocorrências de improdutividade
CREATE TABLE public.ocorrencias_improdutividade (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao TEXT NOT NULL,
  categoria TEXT DEFAULT 'Geral',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para ocorrências marcadas no diário
CREATE TABLE public.diario_ocorrencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  diario_id UUID NOT NULL REFERENCES public.diarios_producao(id) ON DELETE CASCADE,
  ocorrencia_id UUID NOT NULL REFERENCES public.ocorrencias_improdutividade(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.diarios_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recursos_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apontamentos_diario_recursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes_solda_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencias_improdutividade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diario_ocorrencias ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para diarios_producao
CREATE POLICY "Authenticated users can view diarios_producao" 
  ON public.diarios_producao 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert diarios_producao" 
  ON public.diarios_producao 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update diarios_producao" 
  ON public.diarios_producao 
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete diarios_producao" 
  ON public.diarios_producao 
  FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- Políticas RLS para recursos_producao
CREATE POLICY "Authenticated users can view recursos_producao" 
  ON public.recursos_producao 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage recursos_producao" 
  ON public.recursos_producao 
  FOR ALL 
  USING (auth.uid() IS NOT NULL);

-- Políticas RLS para apontamentos_diario_recursos
CREATE POLICY "Authenticated users can manage apontamentos_diario_recursos" 
  ON public.apontamentos_diario_recursos 
  FOR ALL 
  USING (auth.uid() IS NOT NULL);

-- Políticas RLS para lotes_solda_diario
CREATE POLICY "Authenticated users can manage lotes_solda_diario" 
  ON public.lotes_solda_diario 
  FOR ALL 
  USING (auth.uid() IS NOT NULL);

-- Políticas RLS para ocorrencias_improdutividade
CREATE POLICY "Authenticated users can view ocorrencias_improdutividade" 
  ON public.ocorrencias_improdutividade 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage ocorrencias_improdutividade" 
  ON public.ocorrencias_improdutividade 
  FOR ALL 
  USING (auth.uid() IS NOT NULL);

-- Políticas RLS para diario_ocorrencias
CREATE POLICY "Authenticated users can manage diario_ocorrencias" 
  ON public.diario_ocorrencias 
  FOR ALL 
  USING (auth.uid() IS NOT NULL);

-- Inserir dados iniciais para recursos
INSERT INTO public.recursos_producao (nome, tipo) VALUES
  ('Robo', 'maquina'),
  ('Serra', 'maquina'),
  ('Maq. Cantoneira', 'maquina'),
  ('Maq. Solda', 'maquina'),
  ('Plasma', 'maquina'),
  ('Jato', 'maquina'),
  ('Montadores', 'operario'),
  ('Soldadores', 'operario'),
  ('Endireitadores', 'operario'),
  ('Op. Acabamento', 'operario'),
  ('Jatista', 'operario'),
  ('Pintores', 'operario'),
  ('Op. Carga', 'operario');

-- Inserir dados iniciais para ocorrências de improdutividade
INSERT INTO public.ocorrencias_improdutividade (descricao) VALUES
  ('Ponte rolante em manutenção'),
  ('Falta de insumo'),
  ('Quebra/Falta de caminhão para expedição'),
  ('Falta de energia'),
  ('Equipamento quebrado'),
  ('Falta de matéria prima'),
  ('Problema de qualidade'),
  ('Atraso de fornecedor'),
  ('Falta de pessoal'),
  ('Condições climáticas adversas');

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_diarios_producao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_diarios_producao_updated_at 
  BEFORE UPDATE ON diarios_producao 
  FOR EACH ROW EXECUTE FUNCTION update_diarios_producao_updated_at();
