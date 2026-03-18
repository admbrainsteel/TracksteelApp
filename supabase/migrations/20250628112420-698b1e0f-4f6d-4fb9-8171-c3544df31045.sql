
-- Adicionar colunas que estão faltando na tabela ficha_tecnica_contratos
ALTER TABLE public.ficha_tecnica_contratos 
ADD COLUMN IF NOT EXISTS bairro_obra TEXT,
ADD COLUMN IF NOT EXISTS email_obra_responsavel TEXT,
ADD COLUMN IF NOT EXISTS telefone_obra TEXT,
ADD COLUMN IF NOT EXISTS projetista TEXT;
