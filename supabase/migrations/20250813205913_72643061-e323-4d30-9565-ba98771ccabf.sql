
-- Atualizar a política RLS da tabela profiles para permitir que todos vejam os nomes dos usuários
DROP POLICY IF EXISTS "Usuários podem ver seus próprios perfis" ON profiles;
DROP POLICY IF EXISTS "Usuários podem ver perfis de outros usuários" ON profiles;

-- Criar nova política que permite a todos visualizar informações básicas dos perfis
CREATE POLICY "Todos podem visualizar perfis básicos" 
  ON profiles 
  FOR SELECT 
  USING (true);

-- Manter política restritiva para updates (apenas próprio perfil ou admin)
CREATE POLICY "Usuários podem atualizar próprio perfil ou admin todos" 
  ON profiles 
  FOR UPDATE 
  USING (auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role));

-- Criar bucket para anexos de solicitações de compra
INSERT INTO storage.buckets (id, name, public) 
VALUES ('solicitacao-compras-anexos', 'solicitacao-compras-anexos', false);

-- Política para permitir usuários autenticados fazerem upload
CREATE POLICY "Usuários autenticados podem fazer upload de anexos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'solicitacao-compras-anexos' 
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política para permitir usuários visualizarem anexos
CREATE POLICY "Usuários podem visualizar anexos de solicitações"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'solicitacao-compras-anexos' 
    AND auth.uid() IS NOT NULL
  );

-- Política para permitir usuários deletarem seus próprios anexos
CREATE POLICY "Usuários podem deletar seus próprios anexos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'solicitacao-compras-anexos' 
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Adicionar coluna para armazenar URLs dos anexos na tabela solicitacoes_compra
ALTER TABLE solicitacoes_compra 
ADD COLUMN IF NOT EXISTS anexos_urls text[] DEFAULT '{}';
