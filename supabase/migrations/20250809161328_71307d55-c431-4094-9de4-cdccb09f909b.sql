
-- 1) Tipos (enums) para os campos de seleção
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'atribuicao_frequencia') THEN
    CREATE TYPE public.atribuicao_frequencia AS ENUM ('horaria','2xdia','diaria','2xsemanal','semanal','quinzenal','mensal');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'atribuicao_metodo') THEN
    CREATE TYPE public.atribuicao_metodo AS ENUM ('impresso','sistema','sistema-impresso','email','verbal');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'atribuicao_cliente') THEN
    CREATE TYPE public.atribuicao_cliente AS ENUM ('interno','processo','obra','contrato','geral');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'atribuicao_importancia') THEN
    CREATE TYPE public.atribuicao_importancia AS ENUM ('essencial','estrategico','suporte','informativo');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'atribuicao_duracao') THEN
    CREATE TYPE public.atribuicao_duracao AS ENUM ('<=1 hora','2 horas','4 horas','8 horas');
  END IF;
END$$;

-- 2) Função para checar admin ou função Diretoria
CREATE OR REPLACE FUNCTION public.is_admin_or_diretoria(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
     OR EXISTS (
       SELECT 1
       FROM public.profiles p
       JOIN public.functions f ON f.id = p.function_id
       WHERE p.id = _user_id
         AND lower(f.name) LIKE 'diretoria%'
     );
$$;

-- 3) Função para gerar abreviação (3 letras) do usuário
CREATE OR REPLACE FUNCTION public.generate_user_abbrev(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  name_text text;
  abbrev text;
BEGIN
  SELECT COALESCE(NULLIF(trim(p.full_name), ''), split_part(p.email, '@', 1))
  INTO name_text
  FROM public.profiles p
  WHERE p.id = _user_id;

  IF name_text IS NULL OR name_text = '' THEN
    RETURN 'USR';
  END IF;

  abbrev := upper(substring(regexp_replace(name_text, '[^A-Za-z0-9]', '', 'g') from 1 for 3));
  IF length(abbrev) < 3 THEN
    abbrev := rpad(abbrev, 3, 'X');
  END IF;

  RETURN abbrev;
END;
$function$;

-- 4) Tabela de Atribuições
CREATE TABLE IF NOT EXISTS public.atribuicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_abbrev char(3) NOT NULL DEFAULT 'USR',
  attribution varchar(300) NOT NULL,
  frequency public.atribuicao_frequencia NOT NULL,
  method public.atribuicao_metodo NOT NULL,
  client public.atribuicao_cliente NOT NULL,
  importance public.atribuicao_importancia NOT NULL,
  duration public.atribuicao_duracao NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_atribuicoes_user_id ON public.atribuicoes(user_id);
CREATE INDEX IF NOT EXISTS idx_atribuicoes_created_by ON public.atribuicoes(created_by);
CREATE INDEX IF NOT EXISTS idx_atribuicoes_created_at ON public.atribuicoes(created_at);

-- 5) Trigger para defaults (abreviação + updated_at)
CREATE OR REPLACE FUNCTION public.set_atribuicoes_defaults()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Ajustar abreviação se vier vazia ou inválida
  IF NEW.user_abbrev IS NULL OR length(btrim(NEW.user_abbrev)) <> 3 THEN
    NEW.user_abbrev := upper(substring(public.generate_user_abbrev(NEW.user_id) from 1 for 3));
  ELSE
    NEW.user_abbrev := upper(NEW.user_abbrev);
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_atribuicoes_defaults ON public.atribuicoes;
CREATE TRIGGER trg_atribuicoes_defaults
BEFORE INSERT OR UPDATE ON public.atribuicoes
FOR EACH ROW
EXECUTE FUNCTION public.set_atribuicoes_defaults();

-- 6) RLS
ALTER TABLE public.atribuicoes ENABLE ROW LEVEL SECURITY;

-- SELECT: Admin/Diretoria veem tudo; demais apenas suas próprias
DROP POLICY IF EXISTS "View own or admin/diretoria all" ON public.atribuicoes;
CREATE POLICY "View own or admin/diretoria all"
ON public.atribuicoes
FOR SELECT
USING ( public.is_admin_or_diretoria(auth.uid()) OR user_id = auth.uid() );

-- INSERT: apenas Admin/Diretoria e exige created_by = auth.uid()
DROP POLICY IF EXISTS "Only admin/diretoria can insert atribuições" ON public.atribuicoes;
CREATE POLICY "Only admin/diretoria can insert atribuições"
ON public.atribuicoes
FOR INSERT
WITH CHECK ( public.is_admin_or_diretoria(auth.uid()) AND created_by = auth.uid() );

-- UPDATE: apenas Admin/Diretoria
DROP POLICY IF EXISTS "Only admin/diretoria can update atribuições" ON public.atribuicoes;
CREATE POLICY "Only admin/diretoria can update atribuições"
ON public.atribuicoes
FOR UPDATE
USING ( public.is_admin_or_diretoria(auth.uid()) );

-- DELETE: apenas Admin/Diretoria
DROP POLICY IF EXISTS "Only admin/diretoria can delete atribuições" ON public.atribuicoes;
CREATE POLICY "Only admin/diretoria can delete atribuições"
ON public.atribuicoes
FOR DELETE
USING ( public.is_admin_or_diretoria(auth.uid()) );
