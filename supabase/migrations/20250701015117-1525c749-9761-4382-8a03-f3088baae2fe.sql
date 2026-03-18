
-- Atualizar a função que calcula dados consolidados para usar pesos corretamente
CREATE OR REPLACE FUNCTION public.get_dashboard_consolidated_data(of_number_param text)
 RETURNS TABLE(processo_id uuid, processo_nome text, processo_cor text, data_apontamento date, peso_acumulado numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH apontamentos_com_peso AS (
    SELECT 
      ap.processo_id,
      pf.nome as processo_nome,
      COALESCE(pf.cor, '#8884d8') as processo_cor,
      ap.data_apontamento,
      -- Calcular peso corretamente baseado no tipo de apontamento
      CASE 
        WHEN ap.tipo_apontamento = 'componente' THEN 
          ap.quantidade_produzida * COALESCE(cp.peso_unitario, 0)
        ELSE 
          ap.quantidade_produzida * COALESCE(p.peso_unitario, 0)
      END as peso_produzido,
      ROW_NUMBER() OVER (PARTITION BY ap.processo_id ORDER BY ap.data_apontamento) as rn
    FROM apontamentos_producao ap
    JOIN processos_fabricacao pf ON ap.processo_id = pf.id
    LEFT JOIN pecas p ON ap.peca_id = p.id AND ap.tipo_apontamento = 'peca'
    LEFT JOIN componentes_peca cp ON ap.componente_id = cp.id AND ap.tipo_apontamento = 'componente'
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
    FROM apontamentos_com_peso a1
    JOIN apontamentos_com_peso a2 ON a1.processo_id = a2.processo_id AND a2.rn <= a1.rn
    GROUP BY a1.processo_id, a1.processo_nome, a1.processo_cor, a1.data_apontamento, a1.rn
    ORDER BY a1.processo_id, a1.data_apontamento
  )
  SELECT * FROM peso_acumulado_por_processo;
END;
$function$
