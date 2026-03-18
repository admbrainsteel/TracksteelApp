
-- Criar tabela para cronogramas das OFs
CREATE TABLE public.cronogramas_of (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  of_id uuid REFERENCES public.ordens_fabricacao(id) ON DELETE CASCADE,
  gestor_id uuid REFERENCES public.profiles(id),
  revisao integer DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  UNIQUE(of_id) -- Uma OF pode ter apenas um cronograma ativo
);

-- Criar tabela para processos do cronograma
CREATE TABLE public.processos_cronograma (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cronograma_id uuid REFERENCES public.cronogramas_of(id) ON DELETE CASCADE,
  nome_processo text NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Adicionar RLS às novas tabelas
ALTER TABLE public.cronogramas_of ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processos_cronograma ENABLE ROW LEVEL SECURITY;

-- Políticas para cronogramas_of
CREATE POLICY "Authenticated users can view cronogramas_of" 
  ON public.cronogramas_of 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert cronogramas_of" 
  ON public.cronogramas_of 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update cronogramas_of" 
  ON public.cronogramas_of 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete cronogramas_of" 
  ON public.cronogramas_of 
  FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Políticas para processos_cronograma
CREATE POLICY "Authenticated users can view processos_cronograma" 
  ON public.processos_cronograma 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert processos_cronograma" 
  ON public.processos_cronograma 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update processos_cronograma" 
  ON public.processos_cronograma 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete processos_cronograma" 
  ON public.processos_cronograma 
  FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Trigger para atualizar updated_at
CREATE TRIGGER update_cronogramas_of_updated_at 
  BEFORE UPDATE ON cronogramas_of 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processos_cronograma_updated_at 
  BEFORE UPDATE ON processos_cronograma 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
