-- Verificar relacionamento entre tabelas e criar trigger para reverter empenhos automaticamente

-- Primeiro, vamos limpar dados inconsistentes como solicitado
DELETE FROM empenhos_material;
DELETE FROM movimentacoes_estoque;

-- Criar trigger para reverter automaticamente empenhos quando movimentação de empenho é excluída
CREATE OR REPLACE FUNCTION reverter_empenho_na_exclusao()
RETURNS TRIGGER AS $$
BEGIN
    -- Se a movimentação excluída for do tipo 'empenho', reverter o empenho correspondente
    IF OLD.tipo_movimentacao = 'empenho' THEN
        -- Buscar e cancelar empenho vinculado a esta movimentação
        UPDATE empenhos_material 
        SET status = 'Cancelado',
            movimentacao_empenho_id = NULL
        WHERE movimentacao_empenho_id = OLD.id;
        
        -- Reverter quantidades no estoque
        UPDATE estoque_materiais 
        SET quantidade_empenhada = quantidade_empenhada - OLD.quantidade,
            quantidade_disponivel = quantidade_disponivel + OLD.quantidade
        WHERE id = OLD.material_id;
        
        RAISE NOTICE 'Empenho revertido para movimentação %', OLD.id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger que será executado ANTES da exclusão
DROP TRIGGER IF EXISTS trigger_reverter_empenho_exclusao ON movimentacoes_estoque;
CREATE TRIGGER trigger_reverter_empenho_exclusao
    BEFORE DELETE ON movimentacoes_estoque
    FOR EACH ROW
    EXECUTE FUNCTION reverter_empenho_na_exclusao();