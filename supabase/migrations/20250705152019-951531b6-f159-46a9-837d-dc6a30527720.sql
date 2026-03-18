
-- Adicionar campos que estão faltando na tabela estoque_materiais
ALTER TABLE estoque_materiais 
ADD COLUMN IF NOT EXISTS comprimento numeric,
ADD COLUMN IF NOT EXISTS largura numeric,
ADD COLUMN IF NOT EXISTS espessura numeric,
ADD COLUMN IF NOT EXISTS qualidade_aco text;

-- Atualizar trigger para incluir os novos campos
CREATE OR REPLACE FUNCTION public.atualizar_status_estoque()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Atualizar status baseado na quantidade disponível vs mínima
    IF NEW.quantidade_disponivel <= NEW.quantidade_minima THEN
        NEW.status = 'Crítico';
    ELSIF NEW.quantidade_maxima IS NOT NULL AND NEW.quantidade_disponivel >= NEW.quantidade_maxima THEN
        NEW.status = 'Excesso';
    ELSE
        NEW.status = 'Normal';
    END IF;
    
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;
