-- Função para reverter OF de entregue para concluída (apenas admin)
CREATE OR REPLACE FUNCTION reverter_of_entregue_para_concluida(of_concluida_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Verificar se o usuário é admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem reverter OFs entregues';
  END IF;

  -- Atualizar status para 'concluida'
  UPDATE ofs_concluidas 
  SET 
    status_detalhado = 'concluida',
    data_arquivamento = NULL,
    arquivado_por = NULL
  WHERE id = of_concluida_id AND status_detalhado = 'entregue';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'OF entregue não encontrada';
  END IF;
END;
$function$;

-- Função para reverter OF de concluída para ativa (apenas admin)
CREATE OR REPLACE FUNCTION reverter_of_concluida_para_ativa(of_concluida_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  of_record ofs_concluidas%ROWTYPE;
BEGIN
  -- Verificar se o usuário é admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem reverter OFs concluídas';
  END IF;

  -- Buscar dados da OF concluída
  SELECT * INTO of_record
  FROM ofs_concluidas 
  WHERE id = of_concluida_id AND status_detalhado = 'concluida';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'OF concluída não encontrada';
  END IF;

  -- Inserir de volta na tabela ordens_fabricacao como ativa
  INSERT INTO ordens_fabricacao (
    num_of,
    descritivo,
    peso_total,
    data_abertura,
    data_prazo,
    criterio_qualidade,
    tratamento_final,
    local_uf,
    user_id,
    status
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
    'ativa'
  );

  -- Remover da tabela ofs_concluidas
  DELETE FROM ofs_concluidas WHERE id = of_concluida_id;
END;
$function$;