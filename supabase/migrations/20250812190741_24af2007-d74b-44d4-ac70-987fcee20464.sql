
-- Criar tabela para solicitações de compra
CREATE TABLE public.solicitacoes_compra (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_sc text NOT NULL UNIQUE,
  data_solicitacao date NOT NULL DEFAULT CURRENT_DATE,
  of_number text,
  objetivo text,
  justificativa text,
  status text NOT NULL DEFAULT 'Em planejamento',
  revisao integer NOT NULL DEFAULT 0,
  data_previsao_chegada date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Criar tabela para itens da solicitação de compra
CREATE TABLE public.itens_solicitacao_compra (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_id uuid NOT NULL REFERENCES public.solicitacoes_compra(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.estoque_materiais(id),
  quantidade numeric NOT NULL DEFAULT 0,
  prazo_recebimento date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Criar função para gerar número automático da SC
CREATE OR REPLACE FUNCTION public.generate_sc_number()
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  next_num INTEGER;
  current_year TEXT;
  new_sc_number TEXT;
BEGIN
  -- Obter o ano atual (últimos 2 dígitos)
  current_year := RIGHT(EXTRACT(YEAR FROM CURRENT_DATE)::text, 2);
  
  -- Buscar próximo número sequencial para o ano atual
  SELECT COALESCE(MAX(CAST(SPLIT_PART(SPLIT_PART(numero_sc, '-', 2), '/', 1) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.solicitacoes_compra
  WHERE numero_sc ~ ('^SC-\d+/' || current_year || '$');
  
  -- Gerar número da SC no formato SC-0001/25
  new_sc_number := 'SC-' || LPAD(next_num::TEXT, 4, '0') || '/' || current_year;
  RETURN new_sc_number;
END;
$function$;

-- Criar trigger para gerar número da SC automaticamente
CREATE OR REPLACE FUNCTION public.handle_sc_number()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.numero_sc IS NULL OR NEW.numero_sc = '' THEN
    NEW.numero_sc := generate_sc_number();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_handle_sc_number
  BEFORE INSERT ON public.solicitacoes_compra
  FOR EACH ROW EXECUTE FUNCTION public.handle_sc_number();

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_solicitacoes_compra_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_update_solicitacoes_compra_updated_at
  BEFORE UPDATE ON public.solicitacoes_compra
  FOR EACH ROW EXECUTE FUNCTION public.update_solicitacoes_compra_updated_at();

-- Habilitar RLS
ALTER TABLE public.solicitacoes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_solicitacao_compra ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para solicitacoes_compra
CREATE POLICY "Usuários autenticados podem visualizar solicitações"
  ON public.solicitacoes_compra FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir solicitações"
  ON public.solicitacoes_compra FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Usuários podem atualizar suas solicitações"
  ON public.solicitacoes_compra FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Usuários podem deletar suas solicitações"
  ON public.solicitacoes_compra FOR DELETE
  USING (auth.uid() = created_by);

-- Políticas RLS para itens_solicitacao_compra
CREATE POLICY "Usuários autenticados podem visualizar itens"
  ON public.itens_solicitacao_compra FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir itens"
  ON public.itens_solicitacao_compra FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar itens"
  ON public.itens_solicitacao_compra FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar itens"
  ON public.itens_solicitacao_compra FOR DELETE
  USING (auth.uid() IS NOT NULL);
