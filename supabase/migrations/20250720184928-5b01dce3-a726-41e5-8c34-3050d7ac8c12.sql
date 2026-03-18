
-- Criar função para admins alterarem senhas de usuários
CREATE OR REPLACE FUNCTION public.admin_change_user_password(
  user_id_param uuid,
  new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar senhas de usuários';
  END IF;

  -- Atualizar a senha do usuário na tabela auth.users
  UPDATE auth.users 
  SET 
    encrypted_password = crypt(new_password, gen_salt('bf')),
    updated_at = now()
  WHERE id = user_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  RETURN true;
END;
$$;

-- Atualizar função de criação de usuário para usar senha padrão "usuario"
CREATE OR REPLACE FUNCTION public.admin_create_user(
  user_email text, 
  user_full_name text DEFAULT NULL::text, 
  user_function_id uuid DEFAULT NULL::uuid, 
  user_privilege_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_user_id UUID;
  temp_password TEXT := 'usuario'; -- Alterado de '1234' para 'usuario'
  hashed_password TEXT;
BEGIN
  -- Check if current user is admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can create new users';
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    RAISE EXCEPTION 'User with this email already exists';
  END IF;

  -- Generate a hash for the password
  hashed_password := crypt(temp_password, gen_salt('bf'));

  -- Create user in auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    user_email,
    hashed_password,
    now(),
    now(),
    now(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO new_user_id;

  -- Update the profile with additional information
  UPDATE public.profiles 
  SET 
    full_name = user_full_name,
    function_id = user_function_id,
    privilege_id = user_privilege_id,
    status = 'active'
  WHERE id = new_user_id;

  RETURN new_user_id;
END;
$$;
