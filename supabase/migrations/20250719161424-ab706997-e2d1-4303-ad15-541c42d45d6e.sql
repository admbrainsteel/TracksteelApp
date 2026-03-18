
-- Corrigir a função get_online_users para usar profile_image_url em vez de avatar_url
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
        usl.session_start
    FROM public.profiles p
    INNER JOIN public.user_session_logs usl ON p.id = usl.user_id
    WHERE usl.is_active = true
    AND usl.session_start > (now() - INTERVAL '30 minutes')
    ORDER BY usl.session_start DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
