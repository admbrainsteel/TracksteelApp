
-- Criar tabela para registrar pedidos de redefinição de senha
CREATE TABLE public.password_reset_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Adicionar RLS (Row Level Security)
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Política para admins visualizarem todos os pedidos
CREATE POLICY "Admins can view all password reset requests" 
  ON public.password_reset_requests 
  FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Política para permitir inserção de pedidos (qualquer um pode solicitar)
CREATE POLICY "Anyone can create password reset requests" 
  ON public.password_reset_requests 
  FOR INSERT 
  WITH CHECK (true);

-- Índice para melhorar performance nas consultas por email e data
CREATE INDEX idx_password_reset_requests_email ON public.password_reset_requests(email);
CREATE INDEX idx_password_reset_requests_requested_at ON public.password_reset_requests(requested_at DESC);
