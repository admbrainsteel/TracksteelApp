-- Corrigir lógica de empenhos e relacionamentos entre tabelas

-- Primeiro, corrigir a função trigger para atualizar estoque
CREATE OR REPLACE FUNCTION atualizar_estoque_movimentacao()
RETURNS TRIGGER AS $$
DECLARE
    empenho_record RECORD;
    new_empenho_id UUID;
BEGIN
  -- Para movimentações do tipo empenho
  IF NEW.tipo_movimentacao = 'empenho' THEN
    -- Atualizar estoque
    UPDATE estoque_materiais 
    SET quantidade_empenhada = quantidade_empenhada + NEW.quantidade,
        quantidade_disponivel = quantidade_disponivel - NEW.quantidade
    WHERE id = NEW.material_id;
    
    -- Criar registro na tabela empenhos_material DEPOIS da movimentação ser criada
    INSERT INTO empenhos_material (
      material_id,
      of_number,
      quantidade_empenhada,
      data_empenho,
      lote,
      observacoes,
      created_by,
      status,
      movimentacao_empenho_id
    ) VALUES (
      NEW.material_id,
      NEW.of_vinculada,
      NEW.quantidade,
      NEW.data_movimentacao,
      NEW.lote,
      NEW.observacoes,
      NEW.created_by,
      'Empenhado',
      NEW.id
    ) RETURNING id INTO new_empenho_id;
    
  -- Para movimentações do tipo desempenho
  ELSIF NEW.tipo_movimentacao = 'desempenho' THEN
    UPDATE estoque_materiais 
    SET quantidade_empenhada = quantidade_empenhada - NEW.quantidade,
        quantidade_disponivel = quantidade_disponivel + NEW.quantidade
    WHERE id = NEW.material_id;
    
    -- Buscar empenho mais antigo para atualizar
    SELECT * INTO empenho_record
    FROM empenhos_material 
    WHERE material_id = NEW.material_id 
      AND of_number = NEW.of_vinculada 
      AND status = 'Empenhado'
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Atualizar empenho encontrado
    IF FOUND THEN
      UPDATE empenhos_material 
      SET quantidade_utilizada = quantidade_utilizada + NEW.quantidade,
          status = CASE 
            WHEN quantidade_utilizada + NEW.quantidade >= quantidade_empenhada THEN 'Finalizado'
            ELSE 'Empenhado'
          END
      WHERE id = empenho_record.id;
    END IF;
    
  -- Para entradas
  ELSIF NEW.tipo_movimentacao = 'entrada' THEN
    UPDATE estoque_materiais 
    SET quantidade_total = quantidade_total + NEW.quantidade,
        quantidade_disponivel = quantidade_disponivel + NEW.quantidade
    WHERE id = NEW.material_id;
    
  -- Para saídas
  ELSIF NEW.tipo_movimentacao = 'saida' THEN
    UPDATE estoque_materiais 
    SET quantidade_total = quantidade_total - NEW.quantidade,
        quantidade_disponivel = quantidade_disponivel - NEW.quantidade
    WHERE id = NEW.material_id;
    
  -- Para ajustes
  ELSIF NEW.tipo_movimentacao = 'ajuste' THEN
    UPDATE estoque_materiais 
    SET quantidade_total = quantidade_total + NEW.quantidade,
        quantidade_disponivel = quantidade_disponivel + NEW.quantidade
    WHERE id = NEW.material_id;
    
  -- Para transferências
  ELSIF NEW.tipo_movimentacao = 'transferencia' THEN
    -- Apenas registra a movimentação, sem alterar quantidades
    NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antigo e criar novo para AFTER INSERT
DROP TRIGGER IF EXISTS trigger_atualizar_estoque_movimentacao ON movimentacoes_estoque;
CREATE TRIGGER trigger_atualizar_estoque_movimentacao
    AFTER INSERT ON movimentacoes_estoque
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_estoque_movimentacao();

-- Recalcular automaticamente quantidade_empenhada baseado na tabela empenhos
UPDATE estoque_materiais 
SET quantidade_empenhada = COALESCE(
    (SELECT SUM(quantidade_empenhada - quantidade_utilizada) 
     FROM empenhos_material 
     WHERE material_id = estoque_materiais.id 
     AND status IN ('Empenhado')), 
    0
);

-- Corrigir quantidade_disponivel baseado no total menos empenhado
UPDATE estoque_materiais 
SET quantidade_disponivel = quantidade_total - quantidade_empenhada
WHERE quantidade_total >= quantidade_empenhada;