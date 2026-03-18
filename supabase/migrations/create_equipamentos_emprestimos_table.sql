-- Criar tabela para histórico de empréstimos de equipamentos
CREATE TABLE public.equipamentos_emprestimos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  of_number TEXT,
  destino_outro TEXT,
  data_saida DATE NOT NULL,
  retirado_por UUID NOT NULL REFERENCES auth.users(id),
  data_retorno DATE,
  devolvido_por UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'emprestado' CHECK (status IN ('emprestado', 'devolvido')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraint para garantir que pelo menos um destino seja preenchido
  CONSTRAINT check_destino CHECK (
    (of_number IS NOT NULL AND of_number != '') OR 
    (destino_outro IS NOT NULL AND destino_outro != '')
  )
);

-- Índices para melhorar performance
CREATE INDEX idx_equipamentos_emprestimos_equipamento_id ON public.equipamentos_emprestimos(equipamento_id);
CREATE INDEX idx_equipamentos_emprestimos_status ON public.equipamentos_emprestimos(status);
CREATE INDEX idx_equipamentos_emprestimos_data_saida ON public.equipamentos_emprestimos(data_saida);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_equipamentos_emprestimos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_equipamentos_emprestimos_updated_at
    BEFORE UPDATE ON public.equipamentos_emprestimos
    FOR EACH ROW EXECUTE FUNCTION update_equipamentos_emprestimos_updated_at();

-- Habilitar RLS
ALTER TABLE public.equipamentos_emprestimos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários autenticados podem visualizar empréstimos" 
  ON public.equipamentos_emprestimos FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem criar empréstimos" 
  ON public.equipamentos_emprestimos FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar empréstimos" 
  ON public.equipamentos_emprestimos FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar empréstimos" 
  ON public.equipamentos_emprestimos FOR DELETE 
  USING (auth.uid() IS NOT NULL);