-- Verificar e corrigir políticas RLS para solicitacoes_compra
-- Primeiro, remover todas as políticas existentes
DROP POLICY IF EXISTS "Todos podem visualizar solicitações" ON public.solicitacoes_compra;
DROP POLICY IF EXISTS "Usuários podem criar suas próprias solicitações" ON public.solicitacoes_compra;
DROP POLICY IF EXISTS "Usuários podem atualizar apenas suas próprias solicitações" ON public.solicitacoes_compra;
DROP POLICY IF EXISTS "Usuários podem deletar apenas suas próprias solicitações" ON public.solicitacoes_compra;

-- Criar políticas RLS corretas e simples
CREATE POLICY "Todos usuários autenticados podem visualizar solicitações" 
  ON public.solicitacoes_compra 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem criar solicitações" 
  ON public.solicitacoes_compra 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Criador pode atualizar suas solicitações" 
  ON public.solicitacoes_compra 
  FOR UPDATE 
  USING (auth.uid() = created_by);

CREATE POLICY "Criador pode deletar suas solicitações" 
  ON public.solicitacoes_compra 
  FOR DELETE 
  USING (auth.uid() = created_by);