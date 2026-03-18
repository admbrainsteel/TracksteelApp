-- Verificar estrutura atual da tabela tipos_materia_prima
-- Se a coluna categoria não existir, vamos adicioná-la para distinguir entre material direto e indireto

-- Adicionar coluna categoria se não existir
ALTER TABLE tipos_materia_prima 
ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'direto' CHECK (categoria IN ('direto', 'indireto'));

-- Criar tabelas para os outros CRUDs se não existirem

-- Tabela para unidades de medida
CREATE TABLE IF NOT EXISTS unidades_medida (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    abreviacao TEXT NOT NULL UNIQUE,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para localizações
CREATE TABLE IF NOT EXISTS localizacoes_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    codigo TEXT UNIQUE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para qualidades de aço
CREATE TABLE IF NOT EXISTS qualidades_aco (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    norma TEXT,
    descricao TEXT,
    propriedades JSONB DEFAULT '{}',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_unidades_medida()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_localizacoes()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_qualidades_aco()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers se não existirem
DROP TRIGGER IF EXISTS trigger_update_updated_at_unidades_medida ON unidades_medida;
CREATE TRIGGER trigger_update_updated_at_unidades_medida
    BEFORE UPDATE ON unidades_medida
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_unidades_medida();

DROP TRIGGER IF EXISTS trigger_update_updated_at_localizacoes ON localizacoes_estoque;
CREATE TRIGGER trigger_update_updated_at_localizacoes
    BEFORE UPDATE ON localizacoes_estoque
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_localizacoes();

DROP TRIGGER IF EXISTS trigger_update_updated_at_qualidades_aco ON qualidades_aco;
CREATE TRIGGER trigger_update_updated_at_qualidades_aco
    BEFORE UPDATE ON qualidades_aco
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_qualidades_aco();

-- Inserir alguns dados iniciais para unidades de medida
INSERT INTO unidades_medida (nome, abreviacao, descricao) VALUES
('Peça', 'PC', 'Unidade por peça'),
('Metro', 'M', 'Unidade de comprimento em metros'),
('Quilograma', 'KG', 'Unidade de peso em quilogramas'),
('Tonelada', 'TON', 'Unidade de peso em toneladas'),
('Metro Quadrado', 'M²', 'Unidade de área em metros quadrados'),
('Litro', 'L', 'Unidade de volume em litros')
ON CONFLICT (nome) DO NOTHING;

-- Inserir algumas localizações iniciais
INSERT INTO localizacoes_estoque (nome, codigo, descricao) VALUES
('Galpão Principal', 'GP001', 'Galpão principal de armazenamento'),
('Área Externa', 'AE001', 'Área externa coberta'),
('Depósito Pequeno', 'DP001', 'Depósito para materiais pequenos'),
('Área de Recebimento', 'AR001', 'Área para recebimento de materiais'),
('Área de Expedição', 'AX001', 'Área para expedição de materiais')
ON CONFLICT (nome) DO NOTHING;

-- Inserir algumas qualidades de aço iniciais
INSERT INTO qualidades_aco (nome, norma, descricao, propriedades) VALUES
('ASTM A36', 'ASTM A36', 'Aço carbono estrutural', '{"resistencia": "250 MPa", "uso": "estrutural"}'),
('ASTM A572 Gr50', 'ASTM A572', 'Aço carbono alta resistência', '{"resistencia": "345 MPa", "uso": "estrutural"}'),
('SAE 1020', 'SAE 1020', 'Aço carbono baixo teor', '{"carbono": "0.20%", "uso": "geral"}'),
('SAE 1045', 'SAE 1045', 'Aço carbono médio teor', '{"carbono": "0.45%", "uso": "eixos"}'),
('ASTM A500 Gr B', 'ASTM A500', 'Aço carbono para tubos', '{"resistencia": "290 MPa", "uso": "tubular"}')
ON CONFLICT (nome) DO NOTHING;

-- RLS Policies
ALTER TABLE unidades_medida ENABLE ROW LEVEL SECURITY;
ALTER TABLE localizacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualidades_aco ENABLE ROW LEVEL SECURITY;

-- Políticas para visualização (todos podem ver)
CREATE POLICY "Todos podem visualizar unidades" ON unidades_medida FOR SELECT USING (true);
CREATE POLICY "Todos podem visualizar localizações" ON localizacoes_estoque FOR SELECT USING (true);
CREATE POLICY "Todos podem visualizar qualidades aço" ON qualidades_aco FOR SELECT USING (true);

-- Políticas para modificação (apenas usuários autenticados)
CREATE POLICY "Usuários autenticados podem gerenciar unidades" ON unidades_medida FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Usuários autenticados podem gerenciar localizações" ON localizacoes_estoque FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Usuários autenticados podem gerenciar qualidades aço" ON qualidades_aco FOR ALL USING (auth.uid() IS NOT NULL);