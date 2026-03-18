
-- Adicionar política para permitir que usuários deletem seus próprios apontamentos
CREATE POLICY "Usuários podem deletar seus apontamentos" 
ON public.apontamentos_producao
FOR DELETE 
USING (auth.uid() = created_by);
