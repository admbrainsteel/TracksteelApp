
-- 1. Criar índices para otimizar consultas de empenhos
CREATE INDEX IF NOT EXISTS idx_empenhos_material_of_number ON empenhos_material(of_number);
CREATE INDEX IF NOT EXISTS idx_empenhos_material_material_id ON empenhos_material(material_id);
CREATE INDEX IF NOT EXISTS idx_empenhos_material_status ON empenhos_material(status);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_material_of ON movimentacoes_estoque(material_id, of_vinculada);

-- 2. Adicionar campos faltantes na tabela empenhos_material para controle completo
ALTER TABLE empenhos_material 
ADD COLUMN IF NOT EXISTS lote TEXT,
ADD COLUMN IF NOT EXISTS observacoes TEXT,
ADD COLUMN IF NOT EXISTS movimentacao_empenho_id UUID REFERENCES movimentacoes_estoque(id);

-- 3. Atualizar trigger para sincronizar movimentações de empenho com a tabela empenhos_material
CREATE OR REPLACE FUNCTION sincronizar_empenhos_movimentacoes()
RETURNS TRIGGER AS $$
BEGIN
    -- Para INSERT de movimentação tipo empenho
    IF TG_OP = 'INSERT' AND NEW.tipo_movimentacao = 'empenho' THEN
        -- Inserir registro na tabela empenhos_material
        INSERT INTO empenhos_material (
            material_id,
            of_number,
            quantidade_empenhada,
            lote,
            observacoes,
            movimentacao_empenho_id,
            created_by,
            status
        ) VALUES (
            NEW.material_id,
            NEW.of_vinculada,
            NEW.quantidade,
            NEW.lote,
            NEW.observacoes,
            NEW.id,
            NEW.created_by,
            'Empenhado'
        );
        RETURN NEW;
    END IF;
    
    -- Para INSERT de movimentação tipo desempenho
    IF TG_OP = 'INSERT' AND NEW.tipo_movimentacao = 'desempenho' THEN
        -- Atualizar quantidade utilizada no empenho correspondente
        UPDATE empenhos_material 
        SET quantidade_utilizada = quantidade_utilizada + NEW.quantidade
        WHERE material_id = NEW.material_id 
        AND of_number = NEW.of_vinculada 
        AND status = 'Empenhado'
        AND quantidade_utilizada + NEW.quantidade <= quantidade_empenhada;
        
        -- Se quantidade utilizada = quantidade empenhada, marcar como finalizado
        UPDATE empenhos_material 
        SET status = 'Finalizado'
        WHERE material_id = NEW.material_id 
        AND of_number = NEW.of_vinculada 
        AND quantidade_utilizada = quantidade_empenhada;
        
        RETURN NEW;
    END IF;
    
    -- Para DELETE de movimentação tipo empenho
    IF TG_OP = 'DELETE' AND OLD.tipo_movimentacao = 'empenho' THEN
        -- Remover registro da tabela empenhos_material
        DELETE FROM empenhos_material 
        WHERE movimentacao_empenho_id = OLD.id;
        RETURN OLD;
    END IF;
    
    -- Para DELETE de movimentação tipo desempenho
    IF TG_OP = 'DELETE' AND OLD.tipo_movimentacao = 'desempenho' THEN
        -- Reverter quantidade utilizada no empenho
        UPDATE empenhos_material 
        SET quantidade_utilizada = quantidade_utilizada - OLD.quantidade,
            status = 'Empenhado'
        WHERE material_id = OLD.material_id 
        AND of_number = OLD.of_vinculada;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger para sincronização automática
DROP TRIGGER IF EXISTS trigger_sincronizar_empenhos ON movimentacoes_estoque;
CREATE TRIGGER trigger_sincronizar_empenhos
    AFTER INSERT OR DELETE ON movimentacoes_estoque
    FOR EACH ROW
    EXECUTE FUNCTION sincronizar_empenhos_movimentacoes();

-- 5. Função para validar disponibilidade antes de empenho
CREATE OR REPLACE FUNCTION validar_disponibilidade_empenho(
    p_material_id UUID,
    p_quantidade NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
    quantidade_disponivel NUMERIC;
BEGIN
    SELECT em.quantidade_disponivel INTO quantidade_disponivel
    FROM estoque_materiais em
    WHERE em.id = p_material_id;
    
    IF quantidade_disponivel IS NULL OR quantidade_disponivel < p_quantidade THEN
        RAISE EXCEPTION 'Quantidade insuficiente para empenho. Disponível: %, Solicitado: %', 
            COALESCE(quantidade_disponivel, 0), p_quantidade;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 6. Atualizar RLS para a nova estrutura
DROP POLICY IF EXISTS "Usuários autenticados podem excluir empenhos" ON empenhos_material;
CREATE POLICY "Usuários autenticados podem excluir empenhos"
    ON empenhos_material FOR DELETE
    USING (auth.uid() IS NOT NULL);
