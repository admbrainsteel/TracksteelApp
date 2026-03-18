
-- Primeiro, vamos verificar e corrigir a foreign key constraint
-- Vamos dropar a constraint problemática e recriar corretamente

-- Dropar a constraint existente se ela existir
ALTER TABLE empenhos_material DROP CONSTRAINT IF EXISTS empenhos_material_movimentacao_empenho_id_fkey;

-- Recriar a constraint como DEFERRABLE para permitir que seja verificada ao final da transação
ALTER TABLE empenhos_material 
ADD CONSTRAINT empenhos_material_movimentacao_empenho_id_fkey 
FOREIGN KEY (movimentacao_empenho_id) 
REFERENCES movimentacoes_estoque(id) 
ON DELETE SET NULL
DEFERRABLE INITIALLY DEFERRED;

-- Também vamos ajustar a função para ser mais robusta
CREATE OR REPLACE FUNCTION public.sincronizar_empenhos_movimentacoes()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Para INSERT de movimentação tipo empenho
    IF TG_OP = 'INSERT' AND NEW.tipo_movimentacao = 'empenho' THEN
        -- Aguardar um momento para garantir que o registro está commitado
        PERFORM pg_sleep(0.001);
        
        -- Verificar se o registro da movimentação realmente existe
        IF EXISTS (SELECT 1 FROM movimentacoes_estoque WHERE id = NEW.id) THEN
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
