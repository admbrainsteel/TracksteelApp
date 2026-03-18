
-- Criar a tabela sugestoes
CREATE TABLE public.sugestoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sugestao TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  user_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Implementada', 'Rejeitada')),
  developer_notes TEXT
);

-- Habilitar Row Level Security
ALTER TABLE public.sugestoes ENABLE ROW LEVEL SECURITY;

-- Política para INSERT - qualquer usuário autenticado pode inserir
CREATE POLICY "Usuários autenticados podem inserir sugestões" 
  ON public.sugestoes 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Política para SELECT - qualquer usuário autenticado pode ler todas as sugestões
CREATE POLICY "Usuários autenticados podem ver todas as sugestões" 
  ON public.sugestoes 
  FOR SELECT 
  TO authenticated
  USING (true);

-- Política para UPDATE - apenas admins podem atualizar status e developer_notes
CREATE POLICY "Apenas admins podem atualizar sugestões" 
  ON public.sugestoes 
  FOR UPDATE 
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Criar Edge Function para obter informações do banco de dados
CREATE OR REPLACE FUNCTION public.get_database_info()
RETURNS TABLE (
  database_size TEXT,
  table_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    pg_size_pretty(pg_database_size(current_database())) as database_size,
    COUNT(*) as table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public';
$$;
