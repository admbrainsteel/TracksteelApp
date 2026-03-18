
-- Atualizar o trigger para processar exclusões de movimentações
DROP TRIGGER IF EXISTS trigger_processar_movimentacao_estoque ON public.movimentacoes_estoque;

-- Recriar a função com lógica de reversão para DELETE
CREATE OR REPLACE FUNCTION public.processar_movimentacao_estoque()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Lógica para INSERT (nova movimentação)
    IF TG_OP = 'INSERT' THEN
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
            UPDATE estoque_materiais 
            SET quantidade_disponivel = quantidade_disponivel - NEW.quantidade,
                quantidade_empenhada = quantidade_empenhada + NEW.quantidade
            WHERE id = NEW.material_id;
        ELSIF NEW.tipo_movimentacao = 'desempenho' THEN
            UPDATE estoque_materiais 
            SET quantidade_disponivel = quantidade_disponivel + NEW.quantidade,
                quantidade_empenhada = quantidade_empenhada - NEW.quantidade
            WHERE id = NEW.material_id;
        ELSIF NEW.tipo_movimentacao = 'ajuste' THEN
            -- Para ajustes, a quantidade pode ser positiva ou negativa
            UPDATE estoque_materiais 
            SET quantidade_total = quantidade_total + NEW.quantidade,
                quantidade_disponivel = quantidade_disponivel + NEW.quantidade
            WHERE id = NEW.material_id;
        ELSIF NEW.tipo_movimentacao = 'transferencia' THEN
            -- Para transferências, apenas atualiza as quantidades disponíveis
            UPDATE estoque_materiais 
            SET quantidade_disponivel = quantidade_disponivel - NEW.quantidade
            WHERE id = NEW.material_id;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Lógica para DELETE (reversão da movimentação)
    IF TG_OP = 'DELETE' THEN
        IF OLD.tipo_movimentacao = 'entrada' THEN
            -- Reverter entrada: diminuir do total e disponível
            UPDATE estoque_materiais 
            SET quantidade_total = quantidade_total - OLD.quantidade,
                quantidade_disponivel = quantidade_disponivel - OLD.quantidade
            WHERE id = OLD.material_id;
        ELSIF OLD.tipo_movimentacao = 'saida' THEN
            -- Reverter saída: aumentar no total e disponível
            UPDATE estoque_materiais 
            SET quantidade_total = quantidade_total + OLD.quantidade,
                quantidade_disponivel = quantidade_disponivel + OLD.quantidade
            WHERE id = OLD.material_id;
        ELSIF OLD.tipo_movimentacao = 'empenho' THEN
            -- Reverter empenho: aumentar disponível e diminuir empenhada
            UPDATE estoque_materiais 
            SET quantidade_disponivel = quantidade_disponivel + OLD.quantidade,
                quantidade_empenhada = quantidade_empenhada - OLD.quantidade
            WHERE id = OLD.material_id;
        ELSIF OLD.tipo_movimentacao = 'desempenho' THEN
            -- Reverter desempenho: diminuir disponível e aumentar empenhada
            UPDATE estoque_materiais 
            SET quantidade_disponivel = quantidade_disponivel - OLD.quantidade,
                quantidade_empenhada = quantidade_empenhada + OLD.quantidade
            WHERE id = OLD.material_id;
        ELSIF OLD.tipo_movimentacao = 'ajuste' THEN
            -- Reverter ajuste
            UPDATE estoque_materiais 
            SET quantidade_total = quantidade_total - OLD.quantidade,
                quantidade_disponivel = quantidade_disponivel - OLD.quantidade
            WHERE id = OLD.material_id;
        ELSIF OLD.tipo_movimentacao = 'transferencia' THEN
            -- Reverter transferência
            UPDATE estoque_materiais 
            SET quantidade_disponivel = quantidade_disponivel + OLD.quantidade
            WHERE id = OLD.material_id;
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$function$;

-- Recriar o trigger para INSERT e DELETE
CREATE TRIGGER trigger_processar_movimentacao_estoque
    AFTER INSERT OR DELETE ON public.movimentacoes_estoque
    FOR EACH ROW
    EXECUTE FUNCTION processar_movimentacao_estoque();
