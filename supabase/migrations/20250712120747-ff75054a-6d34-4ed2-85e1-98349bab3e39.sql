
-- Adicionar coluna de prioridade na tabela pecas
ALTER TABLE public.pecas 
ADD COLUMN prioridade text DEFAULT 'P4';

-- Adicionar comentário para documentar os valores possíveis
COMMENT ON COLUMN public.pecas.prioridade IS 'Prioridade da peça: P1 (alta), P2 (média-alta), P3 (média-baixa), P4 (baixa)';
