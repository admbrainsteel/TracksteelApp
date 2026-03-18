
-- Criar função para verificar disponibilidade de peças antes de inserir/atualizar itens de prioridade
CREATE OR REPLACE FUNCTION verificar_disponibilidade_peca(
    p_peca_id uuid,
    p_quantidade_adicional numeric,
    p_item_id uuid DEFAULT NULL -- Para updates, excluir o próprio item do cálculo
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    quantidade_total_peca numeric;
    quantidade_ja_priorizada numeric;
    quantidade_disponivel numeric;
BEGIN
    -- Buscar quantidade total da peça
    SELECT quantidade INTO quantidade_total_peca
    FROM pecas 
    WHERE id = p_peca_id;
    
    IF quantidade_total_peca IS NULL THEN
        RAISE EXCEPTION 'Peça não encontrada';
    END IF;
    
    -- Calcular quantidade já priorizada (excluindo o item atual se for update)
    SELECT COALESCE(SUM(quantidade_priorizada), 0) INTO quantidade_ja_priorizada
    FROM itens_prioridade_fabricacao 
    WHERE peca_id = p_peca_id 
    AND (p_item_id IS NULL OR id != p_item_id);
    
    -- Calcular quantidade disponível
    quantidade_disponivel := quantidade_total_peca - quantidade_ja_priorizada;
    
    -- Verificar se a quantidade adicional não excede o disponível
    IF p_quantidade_adicional > quantidade_disponivel THEN
        RAISE EXCEPTION 'Quantidade solicitada (%) excede o disponível (%) para esta peça', 
            p_quantidade_adicional, quantidade_disponivel;
    END IF;
    
    RETURN true;
END;
$$;

-- Criar trigger para validar inserções
CREATE OR REPLACE FUNCTION trigger_validar_item_prioridade()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validar na inserção
    IF TG_OP = 'INSERT' THEN
        PERFORM verificar_disponibilidade_peca(NEW.peca_id, NEW.quantidade_priorizada);
        RETURN NEW;
    END IF;
    
    -- Validar na atualização
    IF TG_OP = 'UPDATE' THEN
        PERFORM verificar_disponibilidade_peca(NEW.peca_id, NEW.quantidade_priorizada, NEW.id);
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Aplicar o trigger na tabela
DROP TRIGGER IF EXISTS trigger_validar_disponibilidade_item_prioridade ON itens_prioridade_fabricacao;
CREATE TRIGGER trigger_validar_disponibilidade_item_prioridade
    BEFORE INSERT OR UPDATE ON itens_prioridade_fabricacao
    FOR EACH ROW
    EXECUTE FUNCTION trigger_validar_item_prioridade();

-- Criar função otimizada para buscar peças disponíveis
CREATE OR REPLACE FUNCTION buscar_pecas_disponiveis_para_prioridade(
    p_of_number text,
    p_etapa_fase text
)
RETURNS TABLE(
    id uuid,
    marca text,
    descricao text,
    peso_unitario numeric,
    quantidade numeric,
    of_number text,
    etapa_fase text,
    quantidade_disponivel numeric,
    user_id uuid,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    WITH pecas_com_prioridades AS (
        SELECT 
            p.*,
            COALESCE(SUM(ipf.quantidade_priorizada), 0) as quantidade_total_priorizada
        FROM pecas p
        LEFT JOIN itens_prioridade_fabricacao ipf ON p.id = ipf.peca_id
        LEFT JOIN prioridades_fabricacao pf ON ipf.prioridade_fabricacao_id = pf.id
        WHERE p.of_number = p_of_number 
        AND p.etapa_fase = p_etapa_fase
        GROUP BY p.id, p.marca, p.descricao, p.peso_unitario, p.quantidade, 
                 p.of_number, p.etapa_fase, p.user_id, p.created_at, p.updated_at
    )
    SELECT 
        pcp.id,
        pcp.marca,
        pcp.descricao,
        pcp.peso_unitario,
        pcp.quantidade,
        pcp.of_number,
        pcp.etapa_fase,
        (pcp.quantidade - pcp.quantidade_total_priorizada) as quantidade_disponivel,
        pcp.user_id,
        pcp.created_at,
        pcp.updated_at
    FROM pecas_com_prioridades pcp
    WHERE (pcp.quantidade - pcp.quantidade_total_priorizada) > 0
    ORDER BY pcp.marca ASC;
$$;
