
-- Criar tabela para tipos de matéria-prima
CREATE TABLE public.tipos_materia_prima (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  caracteristicas JSONB DEFAULT '{}',
  controles JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  ativo BOOLEAN DEFAULT true
);

-- Criar tabela principal de estoque
CREATE TABLE public.estoque_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  tipo_material_id UUID REFERENCES tipos_materia_prima(id),
  unidade TEXT NOT NULL DEFAULT 'PC',
  quantidade_total NUMERIC DEFAULT 0,
  quantidade_disponivel NUMERIC DEFAULT 0,
  quantidade_empenhada NUMERIC DEFAULT 0,
  quantidade_minima NUMERIC DEFAULT 0,
  quantidade_maxima NUMERIC,
  peso_unitario NUMERIC DEFAULT 0,
  valor_unitario NUMERIC DEFAULT 0,
  lote_atual TEXT,
  fornecedor TEXT,
  localizacao TEXT,
  status TEXT DEFAULT 'Normal' CHECK (status IN ('Normal', 'Crítico', 'Excesso')),
  certificado TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID
);

-- Criar tabela de movimentações de estoque
CREATE TABLE public.movimentacoes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES estoque_materiais(id) NOT NULL,
  tipo_movimentacao TEXT NOT NULL CHECK (tipo_movimentacao IN ('entrada', 'saida', 'transferencia', 'ajuste', 'empenho', 'desempenho')),
  quantidade NUMERIC NOT NULL,
  valor_unitario NUMERIC,
  valor_total NUMERIC,
  lote TEXT,
  fornecedor TEXT,
  nota_fiscal TEXT,
  of_vinculada TEXT,
  observacoes TEXT,
  data_movimentacao DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID
);

-- Criar tabela de empenhos de material
CREATE TABLE public.empenhos_material (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  of_number TEXT NOT NULL,
  material_id UUID REFERENCES estoque_materiais(id) NOT NULL,
  quantidade_empenhada NUMERIC NOT NULL,
  quantidade_utilizada NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Empenhado' CHECK (status IN ('Empenhado', 'Parcial', 'Finalizado')),
  data_empenho DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  UNIQUE(of_number, material_id)
);

-- Criar tabela de rastreabilidade
CREATE TABLE public.rastreabilidade_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES estoque_materiais(id) NOT NULL,
  lote TEXT NOT NULL,
  quantidade NUMERIC NOT NULL,
  certificado TEXT,
  fornecedor TEXT,
  data_entrada DATE,
  data_validade DATE,
  status TEXT DEFAULT 'Ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID
);

-- Habilitar RLS
ALTER TABLE public.tipos_materia_prima ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empenhos_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rastreabilidade_materiais ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tipos_materia_prima
CREATE POLICY "Todos podem visualizar tipos MP" ON tipos_materia_prima FOR SELECT USING (true);
CREATE POLICY "Usuários autenticados podem inserir tipos MP" ON tipos_materia_prima FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Usuários autenticados podem atualizar tipos MP" ON tipos_materia_prima FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Políticas RLS para estoque_materiais
CREATE POLICY "Todos podem visualizar estoque" ON estoque_materiais FOR SELECT USING (true);
CREATE POLICY "Usuários autenticados podem inserir estoque" ON estoque_materiais FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Usuários autenticados podem atualizar estoque" ON estoque_materiais FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Políticas RLS para movimentacoes_estoque
CREATE POLICY "Todos podem visualizar movimentações" ON movimentacoes_estoque FOR SELECT USING (true);
CREATE POLICY "Usuários autenticados podem inserir movimentações" ON movimentacoes_estoque FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas RLS para empenhos_material
CREATE POLICY "Todos podem visualizar empenhos" ON empenhos_material FOR SELECT USING (true);
CREATE POLICY "Usuários autenticados podem inserir empenhos" ON empenhos_material FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Usuários autenticados podem atualizar empenhos" ON empenhos_material FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Políticas RLS para rastreabilidade_materiais
CREATE POLICY "Todos podem visualizar rastreabilidade" ON rastreabilidade_materiais FOR SELECT USING (true);
CREATE POLICY "Usuários autenticados podem inserir rastreabilidade" ON rastreabilidade_materiais FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Criar triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tipos_materia_prima_updated_at BEFORE UPDATE ON tipos_materia_prima FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_estoque_materiais_updated_at BEFORE UPDATE ON estoque_materiais FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Criar função para atualizar status do estoque baseado nas quantidades
CREATE OR REPLACE FUNCTION atualizar_status_estoque()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar status baseado na quantidade disponível vs mínima
    IF NEW.quantidade_disponivel <= NEW.quantidade_minima THEN
        NEW.status = 'Crítico';
    ELSIF NEW.quantidade_maxima IS NOT NULL AND NEW.quantidade_disponivel >= NEW.quantidade_maxima THEN
        NEW.status = 'Excesso';
    ELSE
        NEW.status = 'Normal';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_atualizar_status_estoque 
BEFORE INSERT OR UPDATE ON estoque_materiais 
FOR EACH ROW EXECUTE PROCEDURE atualizar_status_estoque();

-- Criar função para atualizar quantidades do estoque após movimentações
CREATE OR REPLACE FUNCTION processar_movimentacao_estoque()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tipo_movimentacao = 'entrada' THEN
        UPDATE estoque_materiais 
        SET quantidade_total = quantidade_total + NEW.quantidade,
            quantidade_disponivel = quantidade_disponivel + NEW.quantidade
        WHERE id = NEW.material_id;
    ELSIF NEW.tipo_movimentacao = 'saida' THEN
        UPDATE estoque_materiais 
        SET quantidade_total = quantidade_total - NEW.quantidade,
            quantidade_disponivel = quantidade_disponivel - NEW.quantidade
        WHERE id = NEW.material_id;
    ELSIF NEW.tipo_movimentacao = 'empenho' THEN
        UPDATE estoque_materiais 
        SET quantidade_disponivel = quantidade_disponivel - NEW.quantidade,
            quantidade_empenhada = quantidade_empenhada + NEW.quantidade
        WHERE id = NEW.material_id;
    ELSIF NEW.tipo_movimentacao = 'desempenho' THEN
        UPDATE estoque_materiais 
        SET quantidade_disponivel = quantidade_disponivel + NEW.quantidade,
            quantidade_empenhada = quantidade_empenhada - NEW.quantidade
        WHERE id = NEW.material_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_processar_movimentacao 
AFTER INSERT ON movimentacoes_estoque 
FOR EACH ROW EXECUTE PROCEDURE processar_movimentacao_estoque();
