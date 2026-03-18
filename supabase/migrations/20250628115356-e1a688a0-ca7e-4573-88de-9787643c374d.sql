
-- Adicionar todas as colunas que estão faltando na tabela ficha_tecnica_contratos
ALTER TABLE public.ficha_tecnica_contratos 
ADD COLUMN IF NOT EXISTS eng_responsavel TEXT,
ADD COLUMN IF NOT EXISTS endereco_obra TEXT,
ADD COLUMN IF NOT EXISTS cep_obra TEXT,
ADD COLUMN IF NOT EXISTS cidade_obra TEXT,
ADD COLUMN IF NOT EXISTS estado_obra TEXT,
ADD COLUMN IF NOT EXISTS observacoes_obra TEXT;

-- Verificar se existe a coluna data_criacao, se não, adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ficha_tecnica_contratos' 
                   AND column_name = 'data_criacao') THEN
        ALTER TABLE public.ficha_tecnica_contratos ADD COLUMN data_criacao DATE DEFAULT CURRENT_DATE;
    END IF;
END $$;
