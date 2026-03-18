
-- Remover políticas existentes para solicitacoes_compra
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar solicitações" ON public.solicitacoes_compra;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar solicitações" ON public.solicitacoes_compra;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir solicitações" ON public.solicitacoes_compra;
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar solicitações" ON public.solicitacoes_compra;

-- Criar novas políticas RLS mais específicas
CREATE POLICY "Todos podem visualizar solicitações" 
  ON public.solicitacoes_compra 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem criar suas próprias solicitações" 
  ON public.solicitacoes_compra 
  FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Usuários podem atualizar apenas suas próprias solicitações" 
  ON public.solicitacoes_compra 
  FOR UPDATE 
  USING (auth.uid() = created_by);

CREATE POLICY "Usuários podem deletar apenas suas próprias solicitações" 
  ON public.solicitacoes_compra 
  FOR DELETE 
  USING (auth.uid() = created_by);
