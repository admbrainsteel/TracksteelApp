
-- Verificar e adicionar campo created_by na tabela solicitacoes_compra se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'solicitacoes_compra' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.solicitacoes_compra 
        ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Atualizar registros existentes para adicionar o usuário atual (opcional)
-- UPDATE public.solicitacoes_compra 
-- SET created_by = (SELECT id FROM auth.users LIMIT 1)
-- WHERE created_by IS NULL;
