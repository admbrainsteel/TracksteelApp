-- Criar tabela qualidades_aco se não existir
CREATE TABLE IF NOT EXISTS public.qualidades_aco (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.qualidades_aco ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Todos podem visualizar qualidades_aco" 
ON public.qualidades_aco 
FOR SELECT 
USING (true);

CREATE POLICY "Usuários autenticados podem gerenciar qualidades_aco" 
ON public.qualidades_aco 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_updated_at_qualidades_aco
  BEFORE UPDATE ON public.qualidades_aco
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_qualidades_aco();

-- Inserir dados padrão das qualidades mostradas na imagem
INSERT INTO public.qualidades_aco (nome, descricao) VALUES
('ASTM A500', 'Aço carbono para tubos'),
('SAE 1020', 'Aço carbono baixo teor'),
('ASTM A572', 'Aço carbono alta resistência'),
('SAE 1045', 'Aço carbono médio teor'),
('ASTM A36', 'Aço carbono estrutural')
ON CONFLICT DO NOTHING;