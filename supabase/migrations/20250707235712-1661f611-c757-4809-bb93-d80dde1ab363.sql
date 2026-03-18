
-- Adicionar novos campos à tabela ordens_fabricacao
ALTER TABLE public.ordens_fabricacao 
ADD COLUMN prioridade text DEFAULT 'Normal',
ADD COLUMN nivel_qualidade text DEFAULT 'Normal',
ADD COLUMN gestor text,
ADD COLUMN data_termino_prev date;

-- Criar índices para otimizar consultas por of_number
CREATE INDEX IF NOT EXISTS idx_ordens_fabricacao_num_of ON public.ordens_fabricacao(num_of);
CREATE INDEX IF NOT EXISTS idx_ficha_tecnica_of_number ON public.ficha_tecnica_contratos(of_number);
CREATE INDEX IF NOT EXISTS idx_cronogramas_of_num ON public.cronogramas_of(of_id);

-- Função para sincronizar dados entre tabelas relacionadas
CREATE OR REPLACE FUNCTION sync_of_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar dados na tabela ordens_fabricacao quando ficha_tecnica_contratos for alterada
  IF TG_TABLE_NAME = 'ficha_tecnica_contratos' THEN
    UPDATE ordens_fabricacao 
    SET 
      gestor = NEW.gestor,
      data_termino_prev = NEW.data_termino_prev,
      peso_total = NEW.quantidade,
      descritivo = NEW.descricao_resumida
    WHERE num_of = NEW.of_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para sincronizar dados
CREATE TRIGGER sync_ficha_to_of
  AFTER UPDATE ON ficha_tecnica_contratos
  FOR EACH ROW
  EXECUTE FUNCTION sync_of_data();
