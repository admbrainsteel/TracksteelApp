CREATE OR REPLACE FUNCTION "TS_ERP".sync_of_data()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Atualizar dados na tabela ordens_fabricacao quando ficha_tecnica_contratos for alterada
  IF TG_TABLE_NAME = 'ficha_tecnica_contratos' THEN
    UPDATE "TS_ERP".ordens_fabricacao
    SET
      gestor = NEW.gestor,
      data_termino_prev = NEW.data_termino_prev,
      peso_total = NEW.quantidade,
      descritivo = NEW.descricao_resumida
    WHERE num_of = NEW.of_number;
  END IF;

  RETURN NEW;
END;
$function$;
