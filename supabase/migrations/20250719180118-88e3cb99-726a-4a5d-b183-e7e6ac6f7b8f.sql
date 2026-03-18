
-- Corrigir políticas RLS da tabela user_session_logs para permitir inserção e atualização pelo sistema
DROP POLICY IF EXISTS "System can insert session logs" ON public.user_session_logs;
DROP POLICY IF EXISTS "System can update session logs" ON public.user_session_logs;

-- Permitir que qualquer usuário autenticado insira logs (o sistema controlará via código quem pode inserir)
CREATE POLICY "Authenticated users can insert session logs"
ON public.user_session_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Permitir que usuários atualizem seus próprios logs de sessão
CREATE POLICY "Users can update their own session logs"
ON public.user_session_logs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Permitir que admins vejam todos os logs, e usuários vejam apenas os seus próprios
DROP POLICY IF EXISTS "Admins can view all session logs" ON public.user_session_logs;

CREATE POLICY "Users can view session logs"
ON public.user_session_logs
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = user_id
);
