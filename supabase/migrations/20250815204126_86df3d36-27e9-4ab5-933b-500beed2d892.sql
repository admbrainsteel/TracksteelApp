
-- Adicionar coluna gestao_estoque_critico na tabela tipos_materia_prima
ALTER TABLE public.tipos_materia_prima
ADD COLUMN gestao_estoque_critico boolean NOT NULL DEFAULT true;

-- Comentário explicativo
COMMENT ON COLUMN public.tipos_materia_prima.gestao_estoque_critico IS 'Define se este tipo de material passa pela gestão de estoque crítico';
