
-- Adicionar o campo "corrida" à tabela rastreabilidade_materiais
ALTER TABLE public.rastreabilidade_materiais 
ADD COLUMN corrida text;

-- Adicionar política de UPDATE para rastreabilidade_materiais (estava faltando)
CREATE POLICY "Usuários autenticados podem atualizar rastreabilidade" 
ON public.rastreabilidade_materiais 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);
