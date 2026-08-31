-- Migration para corrigir a trigger atualizar_datas_reais_processo e prevenir erros 409 (Conflict) em inserções concorrentes de apontamentos

CREATE OR REPLACE FUNCTION public.atualizar_datas_reais_processo()
RETURNS TRIGGER AS $$
DECLARE
    total_produzido NUMERIC;
    total_planejado NUMERIC;
BEGIN
    -- Se peca_id for nulo (ex: apontamento de componente sem peca_id vinculada), ignorar processamento de datas por peça
    IF NEW.peca_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Buscar quantidade total planejada da peça
    SELECT COALESCE(quantidade, 0) INTO total_planejado
    FROM public.pecas 
    WHERE id = NEW.peca_id;

    -- Inserir novo registro ou atualizar existente usando ON CONFLICT para evitar erro 409 (Constraint UNIQUE peca_id + processo_id)
    INSERT INTO public.processos_pecas_datas (
        peca_id, 
        processo_id, 
        data_inicio_real, 
        quantidade_total_planejada,
        quantidade_total_produzida
    ) VALUES (
        NEW.peca_id, 
        NEW.processo_id, 
        NEW.data_apontamento, 
        total_planejado,
        NEW.quantidade_produzida
    )
    ON CONFLICT (peca_id, processo_id) DO UPDATE
    SET 
        quantidade_total_produzida = (
            SELECT COALESCE(SUM(quantidade_produzida), 0)
            FROM public.apontamentos_producao 
            WHERE peca_id = NEW.peca_id AND processo_id = NEW.processo_id
        ),
        data_conclusao_real = CASE 
            WHEN (
                SELECT COALESCE(SUM(quantidade_produzida), 0)
                FROM public.apontamentos_producao 
                WHERE peca_id = NEW.peca_id AND processo_id = NEW.processo_id
            ) >= processos_pecas_datas.quantidade_total_planejada THEN NEW.data_apontamento
            ELSE processos_pecas_datas.data_conclusao_real
        END,
        updated_at = now();
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
