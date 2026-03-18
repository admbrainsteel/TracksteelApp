
-- 1. Função para calcular a prioridade mais alta de uma peça
CREATE OR REPLACE FUNCTION calcular_prioridade_mais_alta_peca(p_peca_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    prioridade_mais_alta text := 'P4'; -- Default
BEGIN
    -- Buscar a prioridade mais alta desta peça em todas as prioridades de fabricação
    SELECT 
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM itens_prioridade_fabricacao ipf
                JOIN prioridades_fabricacao pf ON ipf.prioridade_fabricacao_id = pf.id
                JOIN prioridades_config pc ON pf.prioridade_id = pc.id
                WHERE ipf.peca_id = p_peca_id AND pc.codigo = 'P1'
            ) THEN 'P1'
            WHEN EXISTS (
                SELECT 1 FROM itens_prioridade_fabricacao ipf
                JOIN prioridades_fabricacao pf ON ipf.prioridade_fabricacao_id = pf.id
                JOIN prioridades_config pc ON pf.prioridade_id = pc.id
                WHERE ipf.peca_id = p_peca_id AND pc.codigo = 'P2'
            ) THEN 'P2'
            WHEN EXISTS (
                SELECT 1 FROM itens_prioridade_fabricacao ipf
                JOIN prioridades_fabricacao pf ON ipf.prioridade_fabricacao_id = pf.id
                JOIN prioridades_config pc ON pf.prioridade_id = pc.id
                WHERE ipf.peca_id = p_peca_id AND pc.codigo = 'P3'
            ) THEN 'P3'
            ELSE 'P4'
        END
    INTO prioridade_mais_alta;
    
    RETURN prioridade_mais_alta;
END;
$$;

-- 2. Função para sincronizar prioridade da peça
CREATE OR REPLACE FUNCTION sincronizar_prioridade_peca()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    peca_id_afetada uuid;
    nova_prioridade text;
BEGIN
    -- Determinar qual peça foi afetada
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        peca_id_afetada := NEW.peca_id;
    ELSIF TG_OP = 'DELETE' THEN
        peca_id_afetada := OLD.peca_id;
    END IF;
    
    -- Calcular a nova prioridade mais alta para esta peça
    nova_prioridade := calcular_prioridade_mais_alta_peca(peca_id_afetada);
    
    -- Atualizar a coluna prioridade na tabela pecas
    UPDATE pecas 
    SET prioridade = nova_prioridade,
        updated_at = now()
    WHERE id = peca_id_afetada;
    
    -- Retornar o registro apropriado
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- 3. Criar trigger na tabela itens_prioridade_fabricacao
DROP TRIGGER IF EXISTS trigger_sincronizar_prioridade_peca ON itens_prioridade_fabricacao;
CREATE TRIGGER trigger_sincronizar_prioridade_peca
    AFTER INSERT OR UPDATE OR DELETE ON itens_prioridade_fabricacao
    FOR EACH ROW
    EXECUTE FUNCTION sincronizar_prioridade_peca();

-- 4. Função para auto-criar prioridade P4 para peças novas
CREATE OR REPLACE FUNCTION auto_criar_prioridade_p4()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    prioridade_config_p4_id uuid;
    prioridade_fabricacao_id uuid;
BEGIN
    -- Garantir que a peça nova tenha prioridade P4
    NEW.prioridade := 'P4';
    
    -- Buscar ID da configuração de prioridade P4
    SELECT id INTO prioridade_config_p4_id
    FROM prioridades_config 
    WHERE codigo = 'P4';
    
    IF prioridade_config_p4_id IS NULL THEN
        RAISE EXCEPTION 'Configuração de prioridade P4 não encontrada';
    END IF;
    
    -- Buscar ou criar prioridade_fabricacao para P4 desta OF+fase
    SELECT id INTO prioridade_fabricacao_id
    FROM prioridades_fabricacao
    WHERE of_number = NEW.of_number 
    AND etapa_fase = NEW.etapa_fase 
    AND prioridade_id = prioridade_config_p4_id;
    
    -- Se não existe, criar a prioridade_fabricacao
    IF prioridade_fabricacao_id IS NULL THEN
        INSERT INTO prioridades_fabricacao (
            of_number,
            etapa_fase,
            prioridade_id,
            nome_prioridade,
            ativo
        ) VALUES (
            NEW.of_number,
            NEW.etapa_fase,
            prioridade_config_p4_id,
            'P4 - Baixa',
            true
        ) RETURNING id INTO prioridade_fabricacao_id;
    END IF;
    
    -- Criar item na prioridade P4 (será executado após o INSERT da peça)
    -- Usar pg_notify para processar após o commit da transação
    PERFORM pg_notify('nova_peca_p4', json_build_object(
        'peca_id', NEW.id,
        'prioridade_fabricacao_id', prioridade_fabricacao_id,
        'peso_unitario', NEW.peso_unitario,
        'quantidade', NEW.quantidade
    )::text);
    
    RETURN NEW;
END;
$$;

-- 5. Criar trigger na tabela pecas para auto-criar prioridade P4
DROP TRIGGER IF EXISTS trigger_auto_criar_prioridade_p4 ON pecas;
CREATE TRIGGER trigger_auto_criar_prioridade_p4
    BEFORE INSERT ON pecas
    FOR EACH ROW
    EXECUTE FUNCTION auto_criar_prioridade_p4();

-- 6. Função para processar peças novas após commit
CREATE OR REPLACE FUNCTION processar_peca_nova_p4()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    notification_data json;
    peca_existe boolean;
BEGIN
    -- Parse dos dados da notificação
    notification_data := NEW.payload::json;
    
    -- Verificar se a peça ainda não está na prioridade P4
    SELECT EXISTS(
        SELECT 1 FROM itens_prioridade_fabricacao 
        WHERE peca_id = (notification_data->>'peca_id')::uuid
        AND prioridade_fabricacao_id = (notification_data->>'prioridade_fabricacao_id')::uuid
    ) INTO peca_existe;
    
    -- Se não existe, criar o item
    IF NOT peca_existe THEN
        INSERT INTO itens_prioridade_fabricacao (
            peca_id,
            prioridade_fabricacao_id,
            quantidade_priorizada,
            peso_total,
            ordem_fabricacao
        ) VALUES (
            (notification_data->>'peca_id')::uuid,
            (notification_data->>'prioridade_fabricacao_id')::uuid,
            (notification_data->>'quantidade')::numeric,
            (notification_data->>'quantidade')::numeric * (notification_data->>'peso_unitario')::numeric,
            1
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- 7. Atualizar RLS na tabela pecas para impedir alteração manual da prioridade
DROP POLICY IF EXISTS "Users can update their own pecas" ON pecas;
CREATE POLICY "Users can update their own pecas" ON pecas
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id AND 
        -- Impedir alteração da coluna prioridade manualmente
        (OLD.prioridade = NEW.prioridade OR NEW.prioridade IS NULL)
    );

-- 8. Migrar dados existentes - atualizar prioridades das peças com base no sistema atual
DO $$
DECLARE
    peca_record record;
BEGIN
    -- Para cada peça existente, calcular e atualizar sua prioridade
    FOR peca_record IN 
        SELECT DISTINCT id FROM pecas
    LOOP
        UPDATE pecas 
        SET prioridade = calcular_prioridade_mais_alta_peca(peca_record.id)
        WHERE id = peca_record.id;
    END LOOP;
END $$;

-- 9. Criar peças em P4 para aquelas que não estão em nenhuma prioridade
INSERT INTO itens_prioridade_fabricacao (
    peca_id,
    prioridade_fabricacao_id,
    quantidade_priorizada,
    peso_total,
    ordem_fabricacao
)
SELECT DISTINCT
    p.id as peca_id,
    pf.id as prioridade_fabricacao_id,
    p.quantidade as quantidade_priorizada,
    p.quantidade * p.peso_unitario as peso_total,
    1 as ordem_fabricacao
FROM pecas p
JOIN prioridades_config pc ON pc.codigo = 'P4'
LEFT JOIN LATERAL (
    SELECT pf.id
    FROM prioridades_fabricacao pf
    WHERE pf.of_number = p.of_number 
    AND pf.etapa_fase = p.etapa_fase 
    AND pf.prioridade_id = pc.id
    LIMIT 1
) pf ON true
LEFT JOIN itens_prioridade_fabricacao ipf ON ipf.peca_id = p.id
WHERE ipf.id IS NULL -- Peças que não estão em nenhuma prioridade
AND pf.id IS NOT NULL; -- Apenas se existir a prioridade_fabricacao

-- 10. Criar prioridades_fabricacao P4 para OF+fase que não existem
INSERT INTO prioridades_fabricacao (
    of_number,
    etapa_fase,
    prioridade_id,
    nome_prioridade,
    ativo
)
SELECT DISTINCT
    p.of_number,
    p.etapa_fase,
    pc.id as prioridade_id,
    'P4 - Baixa' as nome_prioridade,
    true as ativo
FROM pecas p
JOIN prioridades_config pc ON pc.codigo = 'P4'
LEFT JOIN prioridades_fabricacao pf ON pf.of_number = p.of_number 
    AND pf.etapa_fase = p.etapa_fase 
    AND pf.prioridade_id = pc.id
WHERE pf.id IS NULL;
