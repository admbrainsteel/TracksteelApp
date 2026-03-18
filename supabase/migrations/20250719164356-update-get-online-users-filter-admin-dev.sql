
-- Atualizar função para filtrar admins e desenvolvedores dos usuários online
CREATE OR REPLACE FUNCTION public.get_online_users()
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    session_start TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.full_name,
        p.profile_image_url as avatar_url,
        p.updated_at as session_start
    FROM public.profiles p
    WHERE p.online = true
    -- Excluir usuários com role de admin
    AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = p.id AND ur.role = 'admin'
    )
    -- Excluir usuários com função de Desenvolvedor
    AND NOT EXISTS (
        SELECT 1 FROM public.functions f 
        WHERE f.id = p.function_id AND f.name = 'Desenvolvedor'
    )
    ORDER BY p.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
