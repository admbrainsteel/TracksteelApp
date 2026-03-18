
-- Primeiro, vamos alterar a tabela tasks para remover a restrição de chave estrangeira com ficha_tecnica_contratos
-- e tornar of_number apenas um campo de texto para vinculação
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_of_number_fkey;

-- Vamos ajustar a coluna of_number para permitir valores que podem não existir em ficha_tecnica_contratos
-- (caso o usuário digite um número de OF que ainda não foi cadastrado)
ALTER TABLE public.tasks ALTER COLUMN of_number DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN of_number SET NOT NULL;

-- Vamos criar um índice para melhorar a performance de busca por OF
CREATE INDEX IF NOT EXISTS idx_tasks_of_number ON public.tasks(of_number);

-- Vamos também criar um índice para o task_ref para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_tasks_task_ref ON public.tasks(task_ref);

-- Vamos atualizar a função de geração de referência para um formato mais claro
CREATE OR REPLACE FUNCTION public.generate_task_ref()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  task_ref TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(task_ref FROM 'T-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.tasks
  WHERE task_ref ~ '^T-\d+$';
  
  task_ref := 'T-' || LPAD(next_num::TEXT, 4, '0');
  RETURN task_ref;
END;
$$;

-- Vamos atualizar a função trigger para usar o novo formato
CREATE OR REPLACE FUNCTION public.handle_task_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.task_ref IS NULL OR NEW.task_ref = '' OR NEW.task_ref = 'TEMP' THEN
    NEW.task_ref := public.generate_task_ref();
  END IF;
  RETURN NEW;
END;
$$;
