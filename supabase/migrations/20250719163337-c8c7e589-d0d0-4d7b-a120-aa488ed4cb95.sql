
-- Adicionar coluna online na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS online boolean DEFAULT false;

-- Criar função para marcar usuário como online
CREATE OR REPLACE FUNCTION public.set_user_online(user_id_param uuid)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles 
    SET online = true, updated_at = now()
    WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar função para marcar usuário como offline
CREATE OR REPLACE FUNCTION public.set_user_offline(user_id_param uuid)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles 
    SET online = false, updated_at = now()
    WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar função get_online_users para usar a nova coluna
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
    ORDER BY p.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar função para verificar e limpar usuários offline (executada periodicamente)
CREATE OR REPLACE FUNCTION public.cleanup_offline_users()
RETURNS void AS $$
BEGIN
    -- Marcar como offline usuários que não tem sessão ativa há mais de 5 minutos
    UPDATE public.profiles 
    SET online = false, updated_at = now()
    WHERE online = true 
    AND id NOT IN (
        SELECT DISTINCT usl.user_id 
        FROM public.user_session_logs usl 
        WHERE usl.is_active = true 
        AND usl.session_start > (now() - INTERVAL '5 minutes')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
