-- Add new columns to diario_obra_rdo table for enhanced functionality
ALTER TABLE public.diario_obra_rdo ADD COLUMN IF NOT EXISTS hora_inicio TIME;
ALTER TABLE public.diario_obra_rdo ADD COLUMN IF NOT EXISTS hora_fim TIME;
ALTER TABLE public.diario_obra_rdo ADD COLUMN IF NOT EXISTS total_horas_trabalhadas NUMERIC;

-- Create unique index to ensure sequential RDO numbering per OF
CREATE UNIQUE INDEX IF NOT EXISTS idx_diario_obra_rdo_numero_per_of 
ON public.diario_obra_rdo (of_number, numero_rdo) 
WHERE numero_rdo IS NOT NULL;

-- Update the generate_rdo_number function to be more robust
CREATE OR REPLACE FUNCTION public.generate_rdo_number_sequential(of_number_param text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  new_rdo_number TEXT;
  of_digits TEXT;
BEGIN
  -- Extract apenas os dígitos da OF
  of_digits := regexp_replace(of_number_param, '[^0-9]', '', 'g');
  
  -- Buscar próximo número sequencial para esta OF considerando apenas RDOs finalizados
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(numero_rdo FROM '\-(\d+)$') AS INTEGER
    )
  ), 0) + 1
  INTO next_num
  FROM public.diario_obra_rdo
  WHERE of_number = of_number_param 
    AND numero_rdo IS NOT NULL
    AND numero_rdo ~ ('^RDO' || of_digits || '\-\d+$');
  
  -- Gerar número do RDO no formato RDO[digits]-[seq]
  new_rdo_number := 'RDO' || of_digits || '-' || LPAD(next_num::TEXT, 3, '0');
  RETURN new_rdo_number;
END;
$$;

-- Update the trigger function to use the new sequential function
CREATE OR REPLACE FUNCTION public.handle_rdo_number_sequential()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only generate number when RDO is finalized and doesn't have a number yet
  IF NEW.finalizado = true AND (OLD.numero_rdo IS NULL OR OLD.numero_rdo = '') THEN
    NEW.numero_rdo := generate_rdo_number_sequential(NEW.of_number);
  END IF;
  RETURN NEW;
END;
$$;

-- Drop the old trigger if it exists and create the new one
DROP TRIGGER IF EXISTS handle_rdo_number_trigger ON public.diario_obra_rdo;
CREATE TRIGGER handle_rdo_number_trigger_sequential
    BEFORE UPDATE ON public.diario_obra_rdo
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_rdo_number_sequential();