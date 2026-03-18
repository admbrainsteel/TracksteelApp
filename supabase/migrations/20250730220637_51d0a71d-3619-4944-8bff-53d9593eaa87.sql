
-- Adicionar política RLS para permitir DELETE na tabela movimentacoes_estoque
CREATE POLICY "Usuários autenticados podem excluir movimentações" 
ON public.movimentacoes_estoque 
FOR DELETE 
TO authenticated 
USING (auth.uid() IS NOT NULL);

-- Adicionar política RLS para permitir UPDATE na tabela movimentacoes_estoque (caso seja necessário no futuro)
CREATE POLICY "Usuários autenticados podem atualizar movimentações" 
ON public.movimentacoes_estoque 
FOR UPDATE 
TO authenticated 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
