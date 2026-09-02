DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conrelid::regclass AS table_name, conname AS constraint_name
        FROM pg_constraint 
        WHERE confrelid = 'auth.users'::regclass
        AND conrelid::regclass::text LIKE '"TS_ERP"%'
    ) LOOP
        EXECUTE 'ALTER TABLE ' || r.table_name || ' DROP CONSTRAINT IF EXISTS ' || r.constraint_name || ' CASCADE;';
        RAISE NOTICE 'Dropped constraint % on %', r.constraint_name, r.table_name;
    END LOOP;
END $$;
