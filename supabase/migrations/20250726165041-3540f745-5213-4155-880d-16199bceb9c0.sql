
-- Corrigir a função para buscar prioridades corretamente pela configuração
CREATE OR REPLACE FUNCTION public.calcular_prioridades_pecas_bulk()
RETURNS TABLE(peca_id uuid, prioridade_mais_alta text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH prioridades_hierarquia AS (
    SELECT 'P1' as prioridade, 1 as ordem
    UNION ALL
    SELECT 'P2' as prioridade, 2 as ordem
    UNION ALL
    SELECT 'P3' as prioridade, 3 as ordem
    UNION ALL
    SELECT 'P4' as prioridade, 4 as ordem
  ),
  pecas_com_prioridades AS (
    SELECT 
      p.id as peca_id,
      COALESCE(
        (
          SELECT pc.codigo
          FROM itens_prioridade_fabricacao ipf
          JOIN prioridades_fabricacao pf ON ipf.prioridade_fabricacao_id = pf.id
          JOIN prioridades_config pc ON pf.prioridade_id = pc.id
          JOIN prioridades_hierarquia ph ON pc.codigo = ph.prioridade
          WHERE ipf.peca_id = p.id
          ORDER BY ph.ordem ASC
          LIMIT 1
        ),
        'P4'
      ) as prioridade_mais_alta
    FROM pecas p
  )
  SELECT 
    pcp.peca_id,
    pcp.prioridade_mais_alta
  FROM pecas_com_prioridades pcp;
END;
$$;
