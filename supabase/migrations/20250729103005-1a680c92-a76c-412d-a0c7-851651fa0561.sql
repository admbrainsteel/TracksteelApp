
-- Adicionar coluna de versão/revisão na tabela prioridades_fabricacao
ALTER TABLE public.prioridades_fabricacao 
ADD COLUMN revisao integer DEFAULT 0,
ADD COLUMN data_ultima_modificacao timestamp with time zone DEFAULT now(),
ADD COLUMN modificado_por uuid REFERENCES auth.users(id);

-- Criar índice para otimizar consultas por OF, fase e revisão
CREATE INDEX idx_prioridades_fabricacao_of_fase_revisao 
ON public.prioridades_fabricacao (of_number, etapa_fase, revisao);

-- Função para incrementar revisão automaticamente quando houver mudanças
CREATE OR REPLACE FUNCTION public.increment_prioridade_fabricacao_revision()
RETURNS TRIGGER AS $$
BEGIN
    -- Verifica se houve alteração nos itens de prioridade
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        -- Atualizar a revisão da prioridade_fabricacao correspondente
        UPDATE public.prioridades_fabricacao 
        SET 
            revisao = COALESCE(revisao, 0) + 1,
            data_ultima_modificacao = now(),
            modificado_por = auth.uid()
        WHERE id = COALESCE(NEW.prioridade_fabricacao_id, OLD.prioridade_fabricacao_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para incrementar revisão automaticamente
CREATE TRIGGER trigger_increment_prioridade_fabricacao_revision
    AFTER INSERT OR UPDATE OR DELETE
    ON public.itens_prioridade_fabricacao
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_prioridade_fabricacao_revision();
