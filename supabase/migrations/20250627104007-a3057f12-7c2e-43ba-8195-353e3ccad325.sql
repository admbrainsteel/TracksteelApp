
-- Adicionar campo para indicar se a peça tem componentes
ALTER TABLE public.pecas ADD COLUMN tem_componentes BOOLEAN DEFAULT FALSE;

-- Criar índice para melhor performance nas consultas
CREATE INDEX idx_pecas_tem_componentes ON public.pecas(tem_componentes);
