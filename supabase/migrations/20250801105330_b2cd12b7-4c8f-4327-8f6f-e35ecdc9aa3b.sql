
-- Primeiro, vamos remover os triggers existentes para evitar conflitos
DROP TRIGGER IF EXISTS trigger_processar_movimentacao ON movimentacoes_estoque;
DROP TRIGGER IF EXISTS trigger_sincronizar_empenhos ON movimentacoes_estoque;

-- Remover as funções antigas
DROP FUNCTION IF EXISTS public.processar_movimentacao_estoque_consolidada();
DROP FUNCTION IF EXISTS public.sincronizar_empenhos_movimentacoes();

-- Criar uma nova função consolidada e mais robusta
CREATE OR REPLACE FUNCTION public.processar_movimentacao_estoque()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    empenho_existente_id UUID;
    quantidade_atual NUMERIC;
BEGIN
    -- Lógica para INSERT (nova movimentação)
    IF TG_OP = 'INSERT' THEN
        -- Processar movimentações de estoque
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
            -- Para empenho: diminuir disponível, aumentar empenhada
            UPDATE estoque_materiais 
            SET quantidade_disponivel = quantidade_disponivel - NEW.quantidade,
                quantidade_empenhada = quantidade_empenhada + NEW.quantidade
            WHERE id = NEW.material_id;
            
            -- Verificar se já existe empenho para este material+OF
            SELECT em.id, em.quantidade_empenhada 
            INTO empenho_existente_id, quantidade_atual
            FROM empenhos_material em 
            WHERE em.material_id = NEW.material_id 
            AND em.of_number = NEW.of_vinculada 
            AND em.status = 'Empenhado'
            LIMIT 1;
            
            IF empenho_existente_id IS NOT NULL THEN
                -- Atualizar empenho existente
                UPDATE empenhos_material 
                SET quantidade_empenhada = quantidade_empenhada + NEW.quantidade,
                    observacoes = CASE 
                        WHEN observacoes IS NOT NULL AND observacoes != '' 
                        THEN observacoes || '; ' || COALESCE(NEW.observacoes, '') 
                        ELSE COALESCE(NEW.observacoes, '') 
                    END
                WHERE id = empenho_existente_id;
            ELSE
                -- Criar novo empenho
                INSERT INTO empenhos_material (
                    material_id,
                    of_number,
                    quantidade_empenhada,
                    quantidade_utilizada,
                    lote,
                    observacoes,
                    movimentacao_empenho_id,
                    created_by,
                    status,
                    data_empenho
                ) VALUES (
                    NEW.material_id,
                    NEW.of_vinculada,
                    NEW.quantidade,
                    0,
                    NEW.lote,
                    NEW.observacoes,
                    NEW.id,
                    NEW.created_by,
                    'Empenhado',
                    NEW.data_movimentacao
                );
            END IF;
                
        ELSIF NEW.tipo_movimentacao = 'desempenho' THEN
            -- Para desempenho: aumentar disponível, diminuir empenhada
            UPDATE estoque_materiais 
            SET quantidade_disponivel = quantidade_disponivel + NEW.quantidade,
                quantidade_empenhada = quantidade_empenhada - NEW.quantidade
            WHERE id = NEW.material_id;
            
            -- Atualizar quantidade utilizada nos empenhos existentes (FIFO)
            UPDATE empenhos_material em1
            SET quantidade_utilizada = quantidade_utilizada + LEAST(
                NEW.quantidade - COALESCE((
                    SELECT SUM(em2.quantidade_empenhada - em2.quantidade_utilizada) 
                    FROM empenhos_material em2 
                    WHERE em2.material_id = NEW.material_id 
                    AND em2.of_number = NEW.of_vinculada 
                    AND em2.status = 'Empenhado'
                    AND em2.data_empenho < em1.data_empenho
                ), 0),
                em1.quantidade_empenhada - em1.quantidade_utilizada
            ),
            status = CASE 
                WHEN quantidade_utilizada + LEAST(
                    NEW.quantidade - COALESCE((
                        SELECT SUM(em3.quantidade_empenhada - em3.quantidade_utilizada) 
                        FROM empenhos_material em3 
                        WHERE em3.material_id = NEW.material_id 
                        AND em3.of_number = NEW.of_vinculada 
                        AND em3.status = 'Empenhado'
                        AND em3.data_empenho < em1.data_empenho
                    ), 0),
                    em1.quantidade_empenhada - em1.quantidade_utilizada
                ) >= em1.quantidade_empenhada 
                THEN 'Finalizado' 
                ELSE 'Empenhado' 
            END
            WHERE em1.material_id = NEW.material_id 
            AND em1.of_number = NEW.of_vinculada 
            AND em1.status = 'Empenhado'
            AND em1.quantidade_utilizada < em1.quantidade_empenhada;
                
        ELSIF NEW.tipo_movimentacao = 'ajuste' THEN
            UPDATE estoque_materiais 
            SET quantidade_total = quantidade_total + NEW.quantidade,
                quantidade_disponivel = quantidade_disponivel + NEW.quantidade
            WHERE id = NEW.material_id;
                
        ELSIF NEW.tipo_movimentacao = 'transferencia' THEN
            UPDATE estoque_materiais 
            SET quantidade_disponivel = quantidade_disponivel - NEW.quantidade
            WHERE id = NEW.material_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Lógica para DELETE (reversão da movimentação)
    IF TG_OP = 'DELETE' THEN
        IF OLD.tipo_movimentacao = 'entrada' THEN
            -- Reverter entrada: diminuir do total e disponível
            UPDATE estoque_materiais 
            SET quantidade_total = quantidade_total - OLD.quantidade,
                quantidade_disponivel = quantidade_disponivel - OLD.quantidade
            WHERE id = OLD.material_id;
            
        ELSIF OLD.tipo_movimentacao = 'saida' THEN
            -- Reverter saída: aumentar no total e disponível
            UPDATE estoque_materiais 
            SET quantidade_total = quantidade_total + OLD.quantidade,
                quantidade_disponivel = quantidade_disponivel + OLD.quantidade
            WHERE id = OLD.material_id;
            
        ELSIF OLD.tipo_movimentacao = 'empenho' THEN
            -- Reverter empenho: aumentar disponível e diminuir empenhada
            UPDATE estoque_materiais 
            SET quantidade_disponivel = quantidade_disponivel + OLD.quantidade,
                quantidade_empenhada = quantidade_empenhada - OLD.quantidade
            WHERE id = OLD.material_id;
            
            -- Diminuir quantidade empenhada ou remover empenho
            UPDATE empenhos_material 
            SET quantidade_empenhada = quantidade_empenhada - OLD.quantidade
            WHERE movimentacao_empenho_id = OLD.id;
            
            -- Remover empenhos com quantidade zero
            DELETE FROM empenhos_material 
            WHERE quantidade_empenhada <= 0 
            AND movimentacao_empenho_id = OLD.id;
            
        ELSIF OLD.tipo_movimentacao = 'desempenho' THEN
            -- Reverter desempenho: diminuir disponível e aumentar empenhada
            UPDATE estoque_materiais 
            SET quantidade_disponivel = quantidade_disponivel - OLD.quantidade,
                quantidade_empenhada = quantidade_empenhada + OLD.quantidade
            WHERE id = OLD.material_id;
            
            -- Reverter quantidade utilizada no empenho
            UPDATE empenhos_material em
            SET quantidade_utilizada = GREATEST(0, em.quantidade_utilizada - OLD.quantidade),
                status = 'Empenhado'
            WHERE em.material_id = OLD.material_id 
            AND em.of_number = OLD.of_vinculada
            AND em.quantidade_utilizada > 0;
            
        ELSIF OLD.tipo_movimentacao = 'ajuste' THEN
            -- Reverter ajuste
            UPDATE estoque_materiais 
            SET quantidade_total = quantidade_total - OLD.quantidade,
                quantidade_disponivel = quantidade_disponivel - OLD.quantidade
            WHERE id = OLD.material_id;
            
        ELSIF OLD.tipo_movimentacao = 'transferencia' THEN
            -- Reverter transferência
            UPDATE estoque_materiais 
            SET quantidade_disponivel = quantidade_disponivel + OLD.quantidade
            WHERE id = OLD.material_id;
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$function$;

-- Recriar o trigger principal
CREATE TRIGGER trigger_processar_movimentacao_estoque
    BEFORE INSERT OR DELETE ON movimentacoes_estoque
    FOR EACH ROW
    EXECUTE FUNCTION processar_movimentacao_estoque();

-- Garantir que não há conflitos de constraint
ALTER TABLE empenhos_material DROP CONSTRAINT IF EXISTS empenhos_material_of_number_material_id_key;
ALTER TABLE empenhos_material DROP CONSTRAINT IF EXISTS empenhos_material_movimentacao_empenho_id_key;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_empenhos_material_id_of_status ON empenhos_material(material_id, of_number, status);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_material_tipo ON movimentacoes_estoque(material_id, tipo_movimentacao);
