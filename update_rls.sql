BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "Users with permissions can view fichas" ON "TS_ERP".ficha_tecnica_contratos;
DROP POLICY IF EXISTS "Users with permissions can create fichas" ON "TS_ERP".ficha_tecnica_contratos;
DROP POLICY IF EXISTS "Users with permissions can update fichas" ON "TS_ERP".ficha_tecnica_contratos;
DROP POLICY IF EXISTS "Users with permissions can delete fichas" ON "TS_ERP".ficha_tecnica_contratos;

-- Function for view access (can_view_only or better)
CREATE OR REPLACE FUNCTION "TS_ERP".user_can_view_ofs(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_is_admin boolean := false;
  user_permissions record;
BEGIN
  -- Admin bypass
  SELECT EXISTS (
    SELECT 1 FROM "TS_ERP".user_roles
    WHERE user_id = _user_id AND role = 'admin'
  ) INTO user_is_admin;
  
  IF user_is_admin THEN RETURN true; END IF;

  SELECT p.permissions INTO user_permissions
  FROM "TS_ERP".profiles pr
  JOIN "TS_ERP".privileges p ON pr.privilege_id = p.id
  WHERE pr.id = _user_id;

  IF user_permissions.permissions IS NOT NULL THEN
    -- If they have ANY of these, they can view things
    IF (user_permissions.permissions->>'can_admin')::boolean = true OR
       (user_permissions.permissions->>'can_create_update_delete')::boolean = true OR
       (user_permissions.permissions->>'can_create_only')::boolean = true OR
       (user_permissions.permissions->>'can_view_only')::boolean = true THEN
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$;

-- Function for write access (can_create_only or better)
CREATE OR REPLACE FUNCTION "TS_ERP".user_can_write_ofs(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_is_admin boolean := false;
  user_permissions record;
BEGIN
  -- Admin bypass
  SELECT EXISTS (
    SELECT 1 FROM "TS_ERP".user_roles
    WHERE user_id = _user_id AND role = 'admin'
  ) INTO user_is_admin;
  
  IF user_is_admin THEN RETURN true; END IF;

  SELECT p.permissions INTO user_permissions
  FROM "TS_ERP".profiles pr
  JOIN "TS_ERP".privileges p ON pr.privilege_id = p.id
  WHERE pr.id = _user_id;

  IF user_permissions.permissions IS NOT NULL THEN
    -- They need these to write
    IF (user_permissions.permissions->>'can_admin')::boolean = true OR
       (user_permissions.permissions->>'can_create_update_delete')::boolean = true OR
       (user_permissions.permissions->>'can_create_only')::boolean = true THEN
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$;

-- Function for full edit/delete (can_create_update_delete or better)
CREATE OR REPLACE FUNCTION "TS_ERP".user_can_edit_delete_ofs(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_is_admin boolean := false;
  user_permissions record;
BEGIN
  -- Admin bypass
  SELECT EXISTS (
    SELECT 1 FROM "TS_ERP".user_roles
    WHERE user_id = _user_id AND role = 'admin'
  ) INTO user_is_admin;
  
  IF user_is_admin THEN RETURN true; END IF;

  SELECT p.permissions INTO user_permissions
  FROM "TS_ERP".profiles pr
  JOIN "TS_ERP".privileges p ON pr.privilege_id = p.id
  WHERE pr.id = _user_id;

  IF user_permissions.permissions IS NOT NULL THEN
    -- They need these to edit or delete
    IF (user_permissions.permissions->>'can_admin')::boolean = true OR
       (user_permissions.permissions->>'can_create_update_delete')::boolean = true THEN
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$;

-- Create policies with new granular rules
CREATE POLICY "Users can view fichas if they have view privileges" 
ON "TS_ERP".ficha_tecnica_contratos FOR SELECT 
USING ("TS_ERP".user_can_view_ofs(auth.uid()));

CREATE POLICY "Users can create fichas if they have write privileges" 
ON "TS_ERP".ficha_tecnica_contratos FOR INSERT 
WITH CHECK ("TS_ERP".user_can_write_ofs(auth.uid()));

-- For updates, we let full editors update, or the creator themselves if they retain write permissions
CREATE POLICY "Users can update fichas" 
ON "TS_ERP".ficha_tecnica_contratos FOR UPDATE 
USING (
  "TS_ERP".user_can_edit_delete_ofs(auth.uid()) OR 
  (auth.uid() = user_id AND "TS_ERP".user_can_write_ofs(auth.uid()))
);

CREATE POLICY "Users can delete fichas" 
ON "TS_ERP".ficha_tecnica_contratos FOR DELETE 
USING (
  "TS_ERP".user_can_edit_delete_ofs(auth.uid()) OR 
  (auth.uid() = user_id AND "TS_ERP".user_can_write_ofs(auth.uid()))
);

COMMIT;
