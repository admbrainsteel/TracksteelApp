-- Criar tabela para logs de sessão dos usuários
CREATE TABLE public.user_session_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_end TIMESTAMP WITH TIME ZONE NULL,
  duration_minutes INTEGER NULL,
  ip_address INET NULL,
  user_agent TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_user_session_logs_user_id ON public.user_session_logs(user_id);
CREATE INDEX idx_user_session_logs_session_start ON public.user_session_logs(session_start);
CREATE INDEX idx_user_session_logs_is_active ON public.user_session_logs(is_active);

-- Habilitar RLS
ALTER TABLE public.user_session_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can view all session logs"
ON public.user_session_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert session logs"
ON public.user_session_logs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update session logs"
ON public.user_session_logs
FOR UPDATE
USING (true);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_user_session_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_session_logs_updated_at
    BEFORE UPDATE ON public.user_session_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_session_logs_updated_at();

-- Função para finalizar sessão automaticamente
CREATE OR REPLACE FUNCTION public.end_user_session(session_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.user_session_logs 
    SET 
        session_end = now(),
        duration_minutes = EXTRACT(EPOCH FROM (now() - session_start)) / 60,
        is_active = false
    WHERE id = session_id AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter usuários online
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
        p.avatar_url,
        usl.session_start
    FROM public.profiles p
    INNER JOIN public.user_session_logs usl ON p.id = usl.user_id
    WHERE usl.is_active = true
    AND usl.session_start > (now() - INTERVAL '30 minutes')
    ORDER BY usl.session_start DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;