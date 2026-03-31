
-- Migração: Mover de public para TS_ERP
-- Data: 2026-03-31

-- 1. Criar o schema TS_ERP
CREATE SCHEMA IF NOT EXISTS "TS_ERP";

-- 2. Garantir permissões básicas no novo schema para as roles do Supabase
GRANT USAGE ON SCHEMA "TS_ERP" TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA "TS_ERP" TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA "TS_ERP" GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA "TS_ERP" GRANT ALL ON FUNCTIONS TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA "TS_ERP" GRANT ALL ON SEQUENCES TO postgres, service_role;

-- 3. Mover Tipos Customizados (Enums) primeiro (pois tabelas podem depender deles)
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (
        SELECT t.typname 
        FROM pg_type t 
        JOIN pg_namespace n ON n.oid = t.typnamespace 
        WHERE n.nspname = 'public' 
        AND t.typtype = 'e' -- 'e' for enum
    ) 
    LOOP 
        BEGIN
            EXECUTE 'ALTER TYPE public."' || r.typname || '" SET SCHEMA "TS_ERP"';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Não foi possível mover o tipo %: %', r.typname, SQLERRM;
        END;
    END LOOP; 
END $$;

-- 4. Mover Tabelas
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP 
        BEGIN
            EXECUTE 'ALTER TABLE public."' || r.tablename || '" SET SCHEMA "TS_ERP"';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Não foi possível mover a tabela %: %', r.tablename, SQLERRM;
        END;
    END LOOP; 
END $$;

-- 5. Mover Views
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') 
    LOOP 
        BEGIN
            EXECUTE 'ALTER VIEW public."' || r.viewname || '" SET SCHEMA "TS_ERP"';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Não foi possível mover a view %: %', r.viewname, SQLERRM;
        END;
    END LOOP; 
END $$;

-- 6. Mover Sequências (que não foram movidas com as tabelas)
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') 
    LOOP 
        BEGIN
            EXECUTE 'ALTER SEQUENCE public."' || r.sequence_name || '" SET SCHEMA "TS_ERP"';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Não foi possível mover a sequência %: %', r.sequence_name, SQLERRM;
        END;
    END LOOP; 
END $$;

-- 7. Mover Funções
-- Nota: Mover funções é complexo via SQL dinâmico devido aos argumentos.
-- Aqui listamos as funções conhecidas e as movemos manualmente ou via script mais robusto.
-- Por enquanto, vamos tentar mover as funções identificadas no information_schema.
DO $$ 
DECLARE 
    r RECORD;
    v_func_signature TEXT;
BEGIN 
    FOR r IN (
        SELECT ns.nspname as schema_name, p.proname as function_name, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace ns ON ns.oid = p.pronamespace
        WHERE ns.nspname = 'public'
    ) 
    LOOP 
        BEGIN
            EXECUTE 'ALTER FUNCTION public."' || r.function_name || '"(' || r.args || ') SET SCHEMA "TS_ERP"';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Não foi possível mover a função %(%): %', r.function_name, r.args, SQLERRM;
        END;
    END LOOP; 
END $$;
