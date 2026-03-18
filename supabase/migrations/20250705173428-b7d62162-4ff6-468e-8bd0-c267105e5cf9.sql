
-- Primeiro, vamos alterar a tabela estoque_materiais para garantir que o lote seja obrigatório e único por material
ALTER TABLE estoque_materiais 
ALTER COLUMN lote_atual SET NOT NULL,
ADD CONSTRAINT unique_material_lote UNIQUE (descricao, lote_atual);

-- Criar índice para melhor performance nas consultas por lote
CREATE INDEX idx_estoque_materiais_lote ON estoque_materiais(lote_atual);

-- Alterar a tabela movimentacoes_estoque para incluir o campo certificado
ALTER TABLE movimentacoes_estoque 
ADD COLUMN certificado text,
ADD COLUMN user_name text;

-- Criar função para buscar o nome do usuário logado
CREATE OR REPLACE FUNCTION get_user_name(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(full_name, email, 'Usuário não identificado')
  FROM profiles 
  WHERE id = user_id;
$$;

-- Atualizar função de processamento de movimentação para incluir validações
CREATE OR REPLACE FUNCTION processar_movimentacao_estoque()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    material_record estoque_materiais%ROWTYPE;
BEGIN
    -- Buscar o material
    SELECT * INTO material_record 
    FROM estoque_materiais 
    WHERE id = NEW.material_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Material não encontrado';
    END IF;

    -- Validar e processar cada tipo de movimentação
    IF NEW.tipo_movimentacao = 'entrada' THEN
        UPDATE estoque_materiais 
        SET quantidade_total = quantidade_total + NEW.quantidade,
            quantidade_disponivel = quantidade_disponivel + NEW.quantidade
        WHERE id = NEW.material_id;
        
    ELSIF NEW.tipo_movimentacao = 'saida' THEN
        -- Validar se há quantidade suficiente
        IF material_record.quantidade_disponivel < NEW.quantidade THEN
            RAISE EXCEPTION 'Quantidade insuficiente para saída. Disponível: %, Solicitado: %', 
                material_record.quantidade_disponivel, NEW.quantidade;
        END IF;
        
        UPDATE estoque_materiais 
        SET quantidade_total = quantidade_total - NEW.quantidade,
            quantidade_disponivel = quantidade_disponivel - NEW.quantidade
        WHERE id = NEW.material_id;
        
    ELSIF NEW.tipo_movimentacao = 'ajuste' THEN
        -- Para ajuste, definir a quantidade total como o valor informado
        UPDATE estoque_materiais 
        SET quantidade_total = NEW.quantidade,
            quantidade_disponivel = NEW.quantidade - quantidade_empenhada
        WHERE id = NEW.material_id;
        
    ELSIF NEW.tipo_movimentacao = 'empenho' THEN
        -- Validar se há quantidade disponível suficiente
        IF material_record.quantidade_disponivel < NEW.quantidade THEN
            RAISE EXCEPTION 'Quantidade insuficiente para empenho. Disponível: %, Solicitado: %', 
                material_record.quantidade_disponivel, NEW.quantidade;
        END IF;
        
        -- Validar se OF foi informada
        IF NEW.of_vinculada IS NULL OR NEW.of_vinculada = '' THEN
            RAISE EXCEPTION 'OF vinculada é obrigatória para movimentações de empenho';
        END IF;
        
        UPDATE estoque_materiais 
        SET quantidade_disponivel = quantidade_disponivel - NEW.quantidade,
            quantidade_empenhada = quantidade_empenhada + NEW.quantidade
        WHERE id = NEW.material_id;
        
    ELSIF NEW.tipo_movimentacao = 'desempenho' THEN
        -- Validar se há quantidade empenhada suficiente
        IF material_record.quantidade_empenhada < NEW.quantidade THEN
            RAISE EXCEPTION 'Quantidade insuficiente para desempenho. Empenhado: %, Solicitado: %', 
                material_record.quantidade_empenhada, NEW.quantidade;
        END IF;
        
        -- Validar se OF foi informada
        IF NEW.of_vinculada IS NULL OR NEW.of_vinculada = '' THEN
            RAISE EXCEPTION 'OF vinculada é obrigatória para movimentações de desempenho';
        END IF;
        
        UPDATE estoque_materiais 
        SET quantidade_disponivel = quantidade_disponivel + NEW.quantidade,
            quantidade_empenhada = quantidade_empenhada - NEW.quantidade
        WHERE id = NEW.material_id;
        
    ELSIF NEW.tipo_movimentacao = 'transferencia' THEN
        -- Para transferência, apenas atualizamos a localização se informada
        -- A quantidade permanece a mesma
        NULL; -- Não altera quantidades na transferência
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Garantir que o trigger existe
DROP TRIGGER IF EXISTS trigger_processar_movimentacao_estoque ON movimentacoes_estoque;
CREATE TRIGGER trigger_processar_movimentacao_estoque
    AFTER INSERT ON movimentacoes_estoque
    FOR EACH ROW
    EXECUTE FUNCTION processar_movimentacao_estoque();
