
-- Primeiro, vamos dropar o trigger existente que está causando o problema
DROP TRIGGER IF EXISTS trigger_sincronizar_empenhos_movimentacoes ON movimentacoes_estoque;

-- Recriar o trigger para executar APÓS as operações (AFTER)
CREATE TRIGGER trigger_sincronizar_empenhos_movimentacoes
    AFTER INSERT OR DELETE ON movimentacoes_estoque
    FOR EACH ROW
    EXECUTE FUNCTION sincronizar_empenhos_movimentacoes();

-- Também vamos atualizar a função para garantir que funcione corretamente
CREATE OR REPLACE FUNCTION public.sincronizar_empenhos_movimentacoes()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Para INSERT de movimentação tipo empenho
    IF TG_OP = 'INSERT' AND NEW.tipo_movimentacao = 'empenho' THEN
        -- Inserir registro na tabela empenhos_material
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
        -- Remover registro da tabela empenhos_material
        DELETE FROM empenhos_material 
        WHERE movimentacao_empenho_id = OLD.id;
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
