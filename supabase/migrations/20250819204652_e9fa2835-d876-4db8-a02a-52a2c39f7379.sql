
-- 1) Sequência para geração do código "EQ-001"
CREATE SEQUENCE IF NOT EXISTS public.equipamentos_codigo_seq START 1;

-- 2) Tabela principal
CREATE TABLE IF NOT EXISTS public.equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  descricao text NOT NULL,
  capacidade text,
  quantidade integer NOT NULL DEFAULT 1,
  local_estoque text NOT NULL,
  propriedade text NOT NULL DEFAULT 'proprio',
  validade_calibracao date,
  certificado_calibracao text,
  periodicidade_calibracao integer,
  of_number text,
  destino_outro text,
  data_saida date,
  retirado_por uuid,
  data_retorno date,
  devolvido_por uuid,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Função/trigger para definir codigo e created_by no insert
CREATE OR REPLACE FUNCTION public.equipamentos_before_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.codigo IS NULL OR length(trim(NEW.codigo)) = 0 THEN
    NEW.codigo := 'EQ-' || lpad(nextval('public.equipamentos_codigo_seq')::text, 3, '0');
  END IF;

  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

-- 4) Função/trigger para atualizar updated_at no update
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 5) Criação dos triggers
DROP TRIGGER IF EXISTS equipamentos_set_defaults ON public.equipamentos;
CREATE TRIGGER equipamentos_set_defaults
BEFORE INSERT ON public.equipamentos
FOR EACH ROW
EXECUTE FUNCTION public.equipamentos_before_insert();

DROP TRIGGER IF EXISTS equipamentos_updated_at ON public.equipamentos;
CREATE TRIGGER equipamentos_updated_at
BEFORE UPDATE ON public.equipamentos
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 6) RLS e políticas
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Equipamentos select" ON public.equipamentos;
CREATE POLICY "Equipamentos select"
ON public.equipamentos
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Equipamentos insert" ON public.equipamentos;
CREATE POLICY "Equipamentos insert"
ON public.equipamentos
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Equipamentos update" ON public.equipamentos;
CREATE POLICY "Equipamentos update"
ON public.equipamentos
FOR UPDATE
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Equipamentos delete" ON public.equipamentos;
CREATE POLICY "Equipamentos delete"
ON public.equipamentos
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- 7) Registrar recurso na tabela de interface (para controle de acesso por recurso)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.interface_resources WHERE resource_key = 'equipamentos'
  ) THEN
    INSERT INTO public.interface_resources (resource_name, resource_key, route_path, icon_name, created_at, updated_at)
    VALUES ('Equipamentos', 'equipamentos', '/equipamentos', 'Wrench', now(), now());
  END IF;
END $$;
