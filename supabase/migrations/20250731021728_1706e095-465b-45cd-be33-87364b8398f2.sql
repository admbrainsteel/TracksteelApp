
-- 1. Primeiro, vamos corrigir os triggers existentes e garantir consistência
-- Remover triggers existentes que podem estar causando problemas
DROP TRIGGER IF EXISTS trigger_processar_movimentacao_estoque ON movimentacoes_estoque;
DROP TRIGGER IF EXISTS trigger_sincronizar_empenhos_movimentacoes ON movimentacoes_estoque;

-- Criar função consolidada para processar movimentações de estoque
CREATE OR REPLACE FUNCTION public.processar_movimentacao_estoque_consolidada()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Para INSERT (nova movimentação)
    IF TG_OP = 'INSERT' THEN
        -- Atualizar quantidades no estoque baseado no tipo de movimentação
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
            
            -- Criar registro de empenho automaticamente
            INSERT INTO empenhos_material (
                material_id,
                of_number,
                quantidade_empenhada,
                quantidade_utilizada,
                lote,
                observacoes,
                status,
                data_empenho,
                created_by,
                movimentacao_empenho_id
            ) VALUES (
                NEW.material_id,
                NEW.of_vinculada,
                NEW.quantidade,
                0,
                NEW.lote,
                NEW.observacoes,
                'Empenhado',
                NEW.data_movimentacao,
                NEW.created_by,
                NEW.id
            );
                
        ELSIF NEW.tipo_movimentacao = 'desempenho' THEN
            -- Para desempenho: aumentar disponível, diminuir empenhada
            UPDATE estoque_materiais 
            SET quantidade_disponivel = quantidade_disponivel + NEW.quantidade,
                quantidade_empenhada = quantidade_empenhada - NEW.quantidade
            WHERE id = NEW.material_id;
            
            -- Atualizar quantidade utilizada nos empenhos existentes
            WITH empenhos_ordenados AS (
                SELECT id, quantidade_empenhada, quantidade_utilizada,
                       (quantidade_empenhada - quantidade_utilizada) as disponivel_para_utilizar
                FROM empenhos_material 
                WHERE material_id = NEW.material_id 
                AND of_number = NEW.of_vinculada 
                AND status = 'Empenhado'
                AND quantidade_utilizada < quantidade_empenhada
                ORDER BY data_empenho ASC
            ),
            atualizacao AS (
                SELECT id,
                       CASE 
                           WHEN NEW.quantidade <= disponivel_para_utilizar THEN NEW.quantidade
                           ELSE disponivel_para_utilizar
                       END as qtd_a_utilizar
                FROM empenhos_ordenados
                LIMIT 1
            )
            UPDATE empenhos_material 
            SET quantidade_utilizada = quantidade_utilizada + atualizacao.qtd_a_utilizar,
                status = CASE 
                    WHEN quantidade_utilizada + atualizacao.qtd_a_utilizar >= quantidade_empenhada 
                    THEN 'Finalizado' 
                    ELSE 'Empenhado' 
                END
            FROM atualizacao 
            WHERE empenhos_material.id = atualizacao.id;
                
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
    
    -- Para DELETE (reversão da movimentação)
    IF TG_OP = 'DELETE' THEN
        -- Reverter as operações baseado no tipo de movimentação
        IF OLD.tipo_movimentacao = 'entrada' THEN
            UPDATE estoque_materiais 
            SET quantidade_total = quantidade_total - OLD.quantidade,
                quantidade_disponivel = quantidade_disponivel - OLD.quantidade
            WHERE id = OLD.material_id;
                
        ELSIF OLD.tipo_movimentacao = 'saida' THEN
            UPDATE estoque_materiais 
            SET quantidade_total = quantidade_total + OLD.quantidade,
                quantidade_disponivel = quantidade_disponivel + OLD.quantidade
            WHERE id = OLD.material_id;
                
        ELSIF OLD.tipo_movimentacao = 'empenho' THEN
            -- Reverter empenho: aumentar disponível, diminuir empenhada
            UPDATE estoque_materiais 
            SET quantidade_disponivel = quantidade_disponivel + OLD.quantidade,
                quantidade_empenhada = quantidade_empenhada - OLD.quantidade
            WHERE id = OLD.material_id;
            
            -- Excluir o empenho vinculado
            DELETE FROM empenhos_material 
            WHERE movimentacao_empenho_id = OLD.id;
                
        ELSIF OLD.tipo_movimentacao = 'desempenho' THEN
            -- Reverter desempenho: diminuir disponível, aumentar empenhada  
            UPDATE estoque_materiais 
            SET quantidade_disponivel = quantidade_disponivel - OLD.quantidade,
                quantidade_empenhada = quantidade_empenhada + OLD.quantidade
            WHERE id = OLD.material_id;
            
            -- Reverter quantidade utilizada nos empenhos
            UPDATE empenhos_material 
            SET quantidade_utilizada = quantidade_utilizada - OLD.quantidade,
                status = 'Empenhado'
            WHERE material_id = OLD.material_id 
            AND of_number = OLD.of_vinculada
            AND quantidade_utilizada >= OLD.quantidade;
                
        ELSIF OLD.tipo_movimentacao = 'ajuste' THEN
            UPDATE estoque_materiais 
            SET quantidade_total = quantidade_total - OLD.quantidade,
                quantidade_disponivel = quantidade_disponivel - OLD.quantidade
            WHERE id = OLD.material_id;
                
        ELSIF OLD.tipo_movimentacao = 'transferencia' THEN
            UPDATE estoque_materiais 
            SET quantidade_disponivel = quantidade_disponivel + OLD.quantidade
            WHERE id = OLD.material_id;
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$function$;

-- Criar o trigger consolidado
CREATE TRIGGER trigger_processar_movimentacao_estoque_consolidada
    BEFORE INSERT OR DELETE ON movimentacoes_estoque
    FOR EACH ROW EXECUTE FUNCTION processar_movimentacao_estoque_consolidada();

-- Função para limpar dados inconsistentes
CREATE OR REPLACE FUNCTION public.limpar_dados_inconsistentes_estoque()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- Recalcular quantidades empenhadas baseado na tabela de empenhos
    UPDATE estoque_materiais 
    SET quantidade_empenhada = COALESCE(
        (SELECT SUM(quantidade_empenhada - quantidade_utilizada) 
         FROM empenhos_material 
         WHERE material_id = estoque_materiais.id 
         AND status = 'Empenhado'), 
        0
    );
    
    -- Remover empenhos órfãos (sem movimentação vinculada)
    DELETE FROM empenhos_material 
    WHERE movimentacao_empenho_id IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM movimentacoes_estoque 
        WHERE id = empenhos_material.movimentacao_empenho_id
    );
    
    -- Remover movimentações órfãs de empenho (sem material)
    DELETE FROM movimentacoes_estoque 
    WHERE tipo_movimentacao = 'empenho' 
    AND NOT EXISTS (
        SELECT 1 FROM estoque_materiais 
        WHERE id = movimentacoes_estoque.material_id
    );
END;
$function$;

-- Executar limpeza de dados inconsistentes
SELECT limpar_dados_inconsistentes_estoque();
