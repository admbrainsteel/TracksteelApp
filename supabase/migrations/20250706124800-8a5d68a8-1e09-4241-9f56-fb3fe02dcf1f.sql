
-- Adicionar colunas necessárias na tabela diario_obra_rdo
ALTER TABLE public.diario_obra_rdo 
ADD COLUMN numero_rdo TEXT,
ADD COLUMN usuario_nome TEXT;

-- Função para gerar numeração automática do RDO
CREATE OR REPLACE FUNCTION generate_rdo_number(of_number_param TEXT)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  new_rdo_number TEXT;
  of_digits TEXT;
BEGIN
  -- Extrair apenas os dígitos da OF
  of_digits := regexp_replace(of_number_param, '[^0-9]', '', 'g');
  
  -- Buscar próximo número sequencial para esta OF
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_rdo FROM '\-(\d+)$') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.diario_obra_rdo
  WHERE of_number = of_number_param AND numero_rdo IS NOT NULL;
  
  -- Gerar número do RDO no formato RDO[digits]-[seq]
  new_rdo_number := 'RDO' || of_digits || '-' || LPAD(next_num::TEXT, 2, '0');
  RETURN new_rdo_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar automaticamente o número do RDO
CREATE OR REPLACE FUNCTION handle_rdo_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_rdo IS NULL OR NEW.numero_rdo = '' THEN
    NEW.numero_rdo := generate_rdo_number(NEW.of_number);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_rdo_number
  BEFORE INSERT ON public.diario_obra_rdo
  FOR EACH ROW EXECUTE FUNCTION handle_rdo_number();
