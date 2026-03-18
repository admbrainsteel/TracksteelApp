
-- Corrigir dados existentes: definir lote padrão para materiais sem lote
UPDATE estoque_materiais 
SET lote_atual = 'LOTE-001' 
WHERE lote_atual IS NULL OR lote_atual = '';

-- Corrigir a regra de quantidade disponível = quantidade total - quantidade empenhada
UPDATE estoque_materiais 
SET quantidade_disponivel = quantidade_total - quantidade_empenhada
WHERE quantidade_disponivel != (quantidade_total - quantidade_empenhada);

-- Garantir que não há valores negativos
UPDATE estoque_materiais 
SET quantidade_disponivel = 0 
WHERE quantidade_disponivel < 0;
