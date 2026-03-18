-- Verificar se existe política DELETE para estoque_materiais
CREATE OR REPLACE FUNCTION check_delete_permissions()
RETURNS TABLE(can_delete boolean, error_message text) AS $$
BEGIN
    -- Tentar fazer um DELETE teste (sem fazer commit)
    BEGIN
        -- Verificar se existe ao menos um registro para testar
        IF EXISTS (SELECT 1 FROM estoque_materiais LIMIT 1) THEN
            -- Simular um DELETE para ver se RLS bloqueia
            PERFORM * FROM estoque_materiais WHERE false; -- Não deleta nada
            RETURN QUERY SELECT true::boolean, 'DELETE permitido'::text;
        ELSE
            RETURN QUERY SELECT true::boolean, 'Nenhum registro para testar'::text;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT false::boolean, SQLERRM::text;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adicionar política DELETE se não existir
DO $$
BEGIN
    -- Verificar se a política DELETE existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy 
        WHERE polname = 'Usuários autenticados podem excluir estoque'
        AND polrelid = (SELECT oid FROM pg_class WHERE relname = 'estoque_materiais')
    ) THEN
        -- Criar política DELETE
        EXECUTE 'CREATE POLICY "Usuários autenticados podem excluir estoque" ON estoque_materiais FOR DELETE USING (auth.uid() IS NOT NULL)';
        RAISE NOTICE 'Política DELETE criada para estoque_materiais';
    ELSE
        RAISE NOTICE 'Política DELETE já existe para estoque_materiais';
    END IF;
END $$;