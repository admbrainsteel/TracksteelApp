
-- Adicionar campo status_detalhado à tabela ofs_concluidas para diferenciar entre concluídas e entregues
ALTER TABLE public.ofs_concluidas 
ADD COLUMN status_detalhado text DEFAULT 'concluida';

-- Atualizar registros existentes
UPDATE public.ofs_concluidas 
SET status_detalhado = 'concluida' 
WHERE status_detalhado IS NULL;

-- Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_ofs_concluidas_status ON public.ofs_concluidas(status_detalhado);

-- Função para mover OF de ativa para concluída
CREATE OR REPLACE FUNCTION concluir_of(of_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  of_record ordens_fabricacao%ROWTYPE;
  ficha_data jsonb;
BEGIN
  -- Buscar dados da OF ativa
  SELECT * INTO of_record
  FROM ordens_fabricacao 
  WHERE id = of_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'OF não encontrada';
  END IF;

  -- Buscar dados da ficha técnica
  SELECT to_jsonb(ft.*) INTO ficha_data
  FROM ficha_tecnica_contratos ft
  WHERE of_number = of_record.num_of;

  -- Inserir na tabela ofs_concluidas com status 'concluida'
  INSERT INTO ofs_concluidas (
    num_of,
    descritivo,
    peso_total,
    data_abertura,
    data_prazo,
    criterio_qualidade,
    tratamento_final,
    local_uf,
    user_id,
    ficha_tecnica_data,
    status_detalhado,
    arquivado_por
  ) VALUES (
    of_record.num_of,
    of_record.descritivo,
    of_record.peso_total,
    of_record.data_abertura,
    of_record.data_prazo,
    of_record.criterio_qualidade,
    of_record.tratamento_final,
    of_record.local_uf,
    of_record.user_id,
    ficha_data,
    'concluida',
    auth.uid()
  );

  -- Remover da tabela de ordens ativas
  DELETE FROM ordens_fabricacao WHERE id = of_id_param;
END;
$function$;

-- Função para mover OF de concluída para entregue
CREATE OR REPLACE FUNCTION entregar_of(of_concluida_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Atualizar status para 'entregue'
  UPDATE ofs_concluidas 
  SET 
    status_detalhado = 'entregue',
    data_arquivamento = now(),
    arquivado_por = auth.uid()
  WHERE id = of_concluida_id AND status_detalhado = 'concluida';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'OF concluída não encontrada ou já entregue';
  END IF;
END;
$function$;

-- Atualizar políticas RLS para incluir o novo campo
-- (As políticas existentes já cobrem o acesso, apenas garantindo que estão corretas)
