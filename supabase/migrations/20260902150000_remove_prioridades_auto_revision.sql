-- Remover o gatilho que incrementava automaticamente a revisão do quadro de prioridades
DROP TRIGGER IF EXISTS trigger_increment_prioridade_fabricacao_revision ON "TS_ERP".itens_prioridade_fabricacao;
DROP TRIGGER IF EXISTS trigger_increment_prioridade_fabricacao_revision ON public.itens_prioridade_fabricacao;

-- Remover a função associada
DROP FUNCTION IF EXISTS public.increment_prioridade_fabricacao_revision();
