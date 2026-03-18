
-- Verificar as políticas atuais da tabela solicitacoes_compra
-- e criar/ajustar políticas para permitir que compradores atualizem status

-- Primeiro, vamos remover políticas existentes que possam estar bloqueando
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar solicitações" ON public.solicitacoes_compra;
DROP POLICY IF EXISTS "Usuarios podem atualizar suas solicitacoes" ON public.solicitacoes_compra;

-- Criar política específica para compradores poderem atualizar qualquer solicitação
CREATE POLICY "Compradores podem atualizar status de solicitações"
ON public.solicitacoes_compra
FOR UPDATE
USING (
  -- Permitir se é o criador da solicitação OU se é comprador
  (auth.uid() = created_by) OR 
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.functions f ON p.function_id = f.id
    WHERE p.id = auth.uid() 
    AND (
      lower(f.name) LIKE '%compra%' OR 
      lower(f.name) LIKE '%comprador%' OR
      lower(f.name) LIKE '%suprimento%'
    )
  ) OR
  -- Também permitir se tem role admin
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Criar política para inserção (caso não exista)
CREATE POLICY IF NOT EXISTS "Usuários autenticados podem criar solicitações"
ON public.solicitacoes_compra
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

-- Criar política para visualização (caso não exista)
CREATE POLICY IF NOT EXISTS "Usuários autenticados podem visualizar solicitações"
ON public.solicitacoes_compra
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Criar política para deletar (apenas criador, comprador ou admin)
CREATE POLICY IF NOT EXISTS "Compradores e criadores podem deletar solicitações"
ON public.solicitacoes_compra
FOR DELETE
USING (
  (auth.uid() = created_by) OR 
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.functions f ON p.function_id = f.id
    WHERE p.id = auth.uid() 
    AND (
      lower(f.name) LIKE '%compra%' OR 
      lower(f.name) LIKE '%comprador%' OR
      lower(f.name) LIKE '%suprimento%'
    )
  ) OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);
