
-- Migração: Restaurar tabelas do Logto para o public
-- Data: 2026-03-31

-- 1. Identificar e mover tabelas do Logto de volta para o schema public
-- Estas tabelas foram movidas inadvertidamente para o TS_ERP
DO $$ 
DECLARE 
    r RECORD;
    logto_tables TEXT[] := ARRAY[
        'account_identities',
        'applications',
        'connectors',
        'hook_events',
        'logs',
        'organization_members',
        'organizations',
        'password_reset_codes',
        'rbac_permissions',
        'rbac_resource_scopes',
        'rbac_resources',
        'rbac_roles',
        'sessions',
        'sso_configs',
        'sso_connectors',
        'system_config',
        'user_identities',
        'users' -- Se o Logto estava usando public.users, esta tabela deve voltar
    ];
BEGIN 
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'TS_ERP' 
        AND tablename = ANY(logto_tables)
    ) 
    LOOP 
        BEGIN
            EXECUTE 'ALTER TABLE "TS_ERP"."' || r.tablename || '" SET SCHEMA public';
            RAISE NOTICE 'Restaurando tabela do Logto: %', r.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao restaurar tabela %: %', r.tablename, SQLERRM;
        END;
    END LOOP; 
END $$;

-- 2. Restaurar permissões necessárias para o Logto no schema public
GRANT ALL ON SCHEMA public TO postgres, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;

-- 3. Garantir que a tabela users (do Logto) tenha as permissões corretas no public
-- (Muitas vezes o Logto conecta com um usuário específico ou service_role)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        GRANT ALL ON TABLE public.users TO postgres, service_role;
    END IF;
END $$;
