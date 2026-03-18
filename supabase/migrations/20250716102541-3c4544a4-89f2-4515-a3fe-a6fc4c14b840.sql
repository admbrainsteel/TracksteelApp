
-- Create function to allow admins to create new users with default password
CREATE OR REPLACE FUNCTION public.admin_create_user(
  user_email TEXT,
  user_full_name TEXT DEFAULT NULL,
  user_function_id UUID DEFAULT NULL,
  user_privilege_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id UUID;
  temp_password TEXT := '1234';
BEGIN
  -- Check if current user is admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can create new users';
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    RAISE EXCEPTION 'User with this email already exists';
  END IF;

  -- Create user in auth.users (this will trigger the profile creation)
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
    crypt(temp_password, gen_salt('bf')),
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

-- Grant execute permission to authenticated users (the function itself checks for admin role)
GRANT EXECUTE ON FUNCTION public.admin_create_user TO authenticated;
