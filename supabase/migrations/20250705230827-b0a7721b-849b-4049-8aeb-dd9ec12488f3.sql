
-- Adicionar coluna kg_por_metro na tabela estoque_materiais
ALTER TABLE public.estoque_materiais 
ADD COLUMN kg_por_metro numeric;

-- Adicionar coluna nota_fiscal na tabela rastreabilidade_materiais
ALTER TABLE public.rastreabilidade_materiais 
ADD COLUMN nota_fiscal text;
