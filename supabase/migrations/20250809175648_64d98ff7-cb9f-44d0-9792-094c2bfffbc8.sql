
-- 1. Remover tabela e tipos existentes se existirem
DROP TABLE IF EXISTS public.atribuicoes CASCADE;
DROP TYPE IF EXISTS public.frequency_type CASCADE;
DROP TYPE IF EXISTS public.method_type CASCADE;
DROP TYPE IF EXISTS public.client_type CASCADE;
DROP TYPE IF EXISTS public.importance_type CASCADE;
DROP TYPE IF EXISTS public.duration_type CASCADE;

-- 2. Criar novos tipos ENUM
CREATE TYPE public.frequency_type AS ENUM (
  'horaria',
  '2xdia', 
  'diaria',
  '2xsemanal',
  'semanal',
  'quinzenal',
  'mensal'
);

CREATE TYPE public.method_type AS ENUM (
  'impresso',
  'sistema',
  'sistema-impresso',
  'email',
  'verbal'
);

CREATE TYPE public.client_type AS ENUM (
  'interno',
  'processo',
  'obra',
  'contrato',
  'geral'
);

CREATE TYPE public.importance_type AS ENUM (
  'essencial',
  'estrategico',
  'suporte',
  'informativo'
);

CREATE TYPE public.duration_type AS ENUM (
  '<=1 hora',
  '2 horas',
  '4 horas',
  '8 horas'
);

-- 3. Criar nova tabela atribuicoes
CREATE TABLE public.atribuicoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_abbrev CHAR(3) NOT NULL DEFAULT 'USR',
  attribution VARCHAR(300) NOT NULL,
  frequency frequency_type NOT NULL,
  method method_type NOT NULL,
  client client_type NOT NULL,
  importance importance_type NOT NULL,
  duration duration_type NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Habilitar RLS
ALTER TABLE public.atribuicoes ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas RLS
CREATE POLICY "View own or admin/diretoria all" ON public.atribuicoes
  FOR SELECT USING (
    is_admin_or_diretoria(auth.uid()) OR user_id = auth.uid()
  );

CREATE POLICY "Only admin/diretoria can insert atribuições" ON public.atribuicoes
  FOR INSERT WITH CHECK (
    is_admin_or_diretoria(auth.uid()) AND created_by = auth.uid()
  );

CREATE POLICY "Only admin/diretoria can update atribuições" ON public.atribuicoes
  FOR UPDATE USING (is_admin_or_diretoria(auth.uid()));

CREATE POLICY "Only admin/diretoria can delete atribuições" ON public.atribuicoes
  FOR DELETE USING (is_admin_or_diretoria(auth.uid()));

-- 6. Função para gerar abreviação automática do usuário
CREATE OR REPLACE FUNCTION public.generate_user_abbrev(_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  name_text TEXT;
  abbrev TEXT;
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
$$;

-- 7. Trigger para definir valores padrão
CREATE OR REPLACE FUNCTION public.set_atribuicoes_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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
$$;

CREATE TRIGGER set_atribuicoes_defaults_trigger
  BEFORE INSERT OR UPDATE ON public.atribuicoes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_atribuicoes_defaults();
