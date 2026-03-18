
-- Criar função RPC para calcular o range dinâmico de datas do dashboard
CREATE OR REPLACE FUNCTION get_dashboard_date_range(of_number_param text)
RETURNS TABLE(
  data_inicio_grafico date,
  data_fim_grafico date
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  min_data_inicio date;
  max_data_fim date;
  max_apontamento date;
  data_atual date := CURRENT_DATE;
BEGIN
  -- Buscar data de início e fim da OF
  SELECT 
    COALESCE(data_abertura, CURRENT_DATE),
    COALESCE(data_prazo, CURRENT_DATE + INTERVAL '30 days')
  INTO min_data_inicio, max_data_fim
  FROM ordens_fabricacao 
  WHERE num_of = of_number_param;

  -- Buscar data máxima de apontamento para esta OF
  SELECT MAX(data_apontamento)
  INTO max_apontamento
  FROM apontamentos_producao
  WHERE of_number = of_number_param;

  -- Calcular data final do gráfico
  data_fim_grafico := GREATEST(
    COALESCE(max_data_fim, data_atual),
    COALESCE(max_apontamento, data_atual),
    data_atual
  );

  -- Retornar o range
  data_inicio_grafico := min_data_inicio;
  
  RETURN NEXT;
END;
$$;

-- Criar função para buscar dados consolidados de todos os processos
CREATE OR REPLACE FUNCTION get_dashboard_consolidated_data(of_number_param text)
RETURNS TABLE(
  processo_id uuid,
  processo_nome text,
  processo_cor text,
  data_apontamento date,
  peso_acumulado numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH apontamentos_ordenados AS (
    SELECT 
      ap.processo_id,
      pf.nome as processo_nome,
      COALESCE(pf.cor, '#8884d8') as processo_cor,
      ap.data_apontamento,
      ap.quantidade_produzida * COALESCE(p.peso_unitario, 0) as peso_produzido,
      ROW_NUMBER() OVER (PARTITION BY ap.processo_id ORDER BY ap.data_apontamento) as rn
    FROM apontamentos_producao ap
    JOIN processos_fabricacao pf ON ap.processo_id = pf.id
    LEFT JOIN pecas p ON ap.peca_id = p.id
    WHERE ap.of_number = of_number_param
    ORDER BY ap.processo_id, ap.data_apontamento
  ),
  peso_acumulado_por_processo AS (
    SELECT 
      a1.processo_id,
      a1.processo_nome,
      a1.processo_cor,
      a1.data_apontamento,
      SUM(a2.peso_produzido) as peso_acumulado
    FROM apontamentos_ordenados a1
    JOIN apontamentos_ordenados a2 ON a1.processo_id = a2.processo_id AND a2.rn <= a1.rn
    GROUP BY a1.processo_id, a1.processo_nome, a1.processo_cor, a1.data_apontamento, a1.rn
    ORDER BY a1.processo_id, a1.data_apontamento
  )
  SELECT * FROM peso_acumulado_por_processo;
END;
$$;

-- Adicionar coluna de cor na tabela processos_fabricacao se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'processos_fabricacao' AND column_name = 'cor') THEN
    ALTER TABLE processos_fabricacao ADD COLUMN cor text DEFAULT '#8884d8';
  END IF;
END $$;

-- Atualizar alguns processos com cores diferentes para melhor visualização
UPDATE processos_fabricacao SET cor = '#8884d8' WHERE nome ILIKE '%corte%';
UPDATE processos_fabricacao SET cor = '#82ca9d' WHERE nome ILIKE '%solda%';
UPDATE processos_fabricacao SET cor = '#ffc658' WHERE nome ILIKE '%pintura%';
UPDATE processos_fabricacao SET cor = '#ff7300' WHERE nome ILIKE '%montagem%';
UPDATE processos_fabricacao SET cor = '#00ff88' WHERE nome ILIKE '%expedi%';
