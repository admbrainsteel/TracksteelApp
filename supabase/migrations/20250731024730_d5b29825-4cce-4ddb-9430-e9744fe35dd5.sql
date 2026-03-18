
-- Remover a constraint única que está causando o problema
ALTER TABLE empenhos_material DROP CONSTRAINT IF EXISTS empenhos_material_of_number_material_id_key;

-- Criar nova função que consolida empenhos ao invés de criar duplicados
CREATE OR REPLACE FUNCTION public.sincronizar_empenhos_movimentacoes()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    empenho_existente_id UUID;
    quantidade_atual NUMERIC;
BEGIN
    -- Para INSERT de movimentação tipo empenho
    IF TG_OP = 'INSERT' AND NEW.tipo_movimentacao = 'empenho' THEN
        -- Verificar se já existe empenho para este material+OF
        SELECT id, quantidade_empenhada INTO empenho_existente_id, quantidade_atual
        FROM empenhos_material 
        WHERE material_id = NEW.material_id 
        AND of_number = NEW.of_vinculada 
        AND status = 'Empenhado'
        LIMIT 1;
        
        IF empenho_existente_id IS NOT NULL THEN
            -- Atualizar empenho existente
            UPDATE empenhos_material 
            SET quantidade_empenhada = quantidade_empenhada + NEW.quantidade,
                movimentacao_empenho_id = NEW.id,
                observacoes = COALESCE(observacoes, '') || 
                             CASE WHEN observacoes IS NOT NULL AND observacoes != '' 
                             THEN '; ' || COALESCE(NEW.observacoes, '') 
                             ELSE COALESCE(NEW.observacoes, '') END
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
        
        RETURN NEW;
    END IF;
    
    -- Para INSERT de movimentação tipo desempenho
    IF TG_OP = 'INSERT' AND NEW.tipo_movimentacao = 'desempenho' THEN
        -- Atualizar quantidade utilizada no empenho correspondente
        WITH empenhos_ordenados AS (
            SELECT id, quantidade_empenhada, quantidade_utilizada,
                   (quantidade_empenhada - quantidade_utilizada) as disponivel_para_utilizar
            FROM empenhos_material 
            WHERE material_id = NEW.material_id 
            AND of_number = NEW.of_vinculada 
            AND status = 'Empenhado'
            AND quantidade_utilizada < quantidade_empenhada
            ORDER BY data_empenho ASC
            LIMIT 1
        )
        UPDATE empenhos_material 
        SET quantidade_utilizada = quantidade_utilizada + LEAST(NEW.quantidade, empenhos_ordenados.disponivel_para_utilizar),
            status = CASE 
                WHEN quantidade_utilizada + LEAST(NEW.quantidade, empenhos_ordenados.disponivel_para_utilizar) >= quantidade_empenhada 
                THEN 'Finalizado' 
                ELSE 'Empenhado' 
            END
        FROM empenhos_ordenados 
        WHERE empenhos_material.id = empenhos_ordenados.id;
        
        RETURN NEW;
    END IF;
    
    -- Para DELETE de movimentação tipo empenho
    IF TG_OP = 'DELETE' AND OLD.tipo_movimentacao = 'empenho' THEN
        -- Diminuir quantidade empenhada ou remover se for a única
        WITH empenho_atual AS (
            SELECT id, quantidade_empenhada 
            FROM empenhos_material 
            WHERE movimentacao_empenho_id = OLD.id
        )
        UPDATE empenhos_material 
        SET quantidade_empenhada = quantidade_empenhada - OLD.quantidade
        FROM empenho_atual
        WHERE empenhos_material.id = empenho_atual.id;
        
        -- Remover empenho se quantidade chegou a zero
        DELETE FROM empenhos_material 
        WHERE quantidade_empenhada <= 0 AND movimentacao_empenho_id = OLD.id;
        
        RETURN OLD;
    END IF;
    
    -- Para DELETE de movimentação tipo desempenho
    IF TG_OP = 'DELETE' AND OLD.tipo_movimentacao = 'desempenho' THEN
        -- Reverter quantidade utilizada no empenho
        UPDATE empenhos_material 
        SET quantidade_utilizada = GREATEST(0, quantidade_utilizada - OLD.quantidade),
            status = 'Empenhado'
        WHERE material_id = OLD.material_id 
        AND of_number = OLD.of_vinculada
        AND quantidade_utilizada > 0;
        RETURN OLD;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$;
