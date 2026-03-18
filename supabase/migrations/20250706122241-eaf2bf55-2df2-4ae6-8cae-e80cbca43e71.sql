
-- Adicionar coluna de categoria aos motivos improdutivos
ALTER TABLE public.motivos_improdutivos 
ADD COLUMN categoria TEXT DEFAULT 'Empresa Montadora' CHECK (categoria IN ('Cliente', 'Empresa Montadora', 'Contratada', 'Terceiros Indiretos'));

-- Atualizar os registros existentes com categorias apropriadas
UPDATE public.motivos_improdutivos 
SET categoria = CASE 
  WHEN motivo IN ('Chuva', 'Vento Acima do Limite', 'Garoa') THEN 'Terceiros Indiretos'
  WHEN motivo IN ('Falha de Equipamento', 'Instrução de Segurança (DDS)') THEN 'Empresa Montadora'
  WHEN motivo IN ('Problema de Acesso', 'Esperando Liberação') THEN 'Cliente'
  WHEN motivo = 'Falta de Material' THEN 'Contratada'
  ELSE 'Empresa Montadora'
END;

-- Permitir que admins gerenciem motivos improdutivos
CREATE POLICY "Admins can manage motivos_improdutivos" ON public.motivos_improdutivos FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
