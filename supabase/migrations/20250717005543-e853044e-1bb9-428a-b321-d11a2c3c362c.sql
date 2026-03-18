
-- Criar tabela para logs de apontamentos automáticos
CREATE TABLE public.logs_apontamentos_automaticos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  romaneio_id UUID NOT NULL REFERENCES public.romaneios_expedicao(id),
  numero_romaneio TEXT NOT NULL,
  of_number TEXT NOT NULL,
  total_pecas_processadas INTEGER NOT NULL DEFAULT 0,
  status_operacao TEXT NOT NULL DEFAULT 'sucesso',
  detalhes_erro TEXT,
  usuario_executou UUID REFERENCES auth.users(id),
  data_execucao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.logs_apontamentos_automaticos ENABLE ROW LEVEL SECURITY;

-- Política para visualizar logs
CREATE POLICY "Authenticated users can view logs" 
  ON public.logs_apontamentos_automaticos 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Política para inserir logs
CREATE POLICY "Authenticated users can insert logs" 
  ON public.logs_apontamentos_automaticos 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Criar índices para performance
CREATE INDEX idx_logs_apontamentos_romaneio ON public.logs_apontamentos_automaticos(romaneio_id);
CREATE INDEX idx_logs_apontamentos_of ON public.logs_apontamentos_automaticos(of_number);
CREATE INDEX idx_logs_apontamentos_data ON public.logs_apontamentos_automaticos(data_execucao);
