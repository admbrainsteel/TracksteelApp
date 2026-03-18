-- Função RPC otimizada para buscar itens disponíveis para apontamento
-- Esta função substitui múltiplas queries por uma única consulta otimizada

CREATE OR REPLACE FUNCTION get_itens_disponiveis(
  p_of_number TEXT DEFAULT NULL,
  p_processo_id UUID DEFAULT NULL,
  p_include_componentes BOOLEAN DEFAULT TRUE,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  item_id UUID,
  item_type TEXT, -- 'peca' ou 'componente'
  marca TEXT,
  descricao TEXT,
  peso_unitario NUMERIC,
  quantidade_total NUMERIC,
  quantidade_processada NUMERIC,
  quantidade_disponivel NUMERIC,
  etapa_fase TEXT,
  processo_atual_id UUID,
  processo_atual_nome TEXT,
  processo_atual_ordem INTEGER,
  proximos_processos JSONB,
  peca_pai_id UUID,
  peca_pai_marca TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- CTE para buscar peças da OF
  pecas_of AS (
    SELECT 
      p.id,
      p.marca,
      p.descricao,
      p.peso_unitario,
      p.quantidade,
      p.etapa_fase,
      p.of_number
    FROM pecas p
    WHERE (p_of_number IS NULL OR p.of_number = p_of_number)
  ),
  
  -- CTE para buscar componentes das peças (se solicitado)
  componentes_of AS (
    SELECT 
      c.id,
      c.marca_componente as marca,
      c.descricao,
      c.peso_unitario,
      (c.quantidade_por_peca * p.quantidade) as quantidade,
      c.peca_id,
      p.marca as peca_pai_marca,
      p.of_number
    FROM componentes_peca c
    INNER JOIN pecas_of p ON c.peca_id = p.id
    WHERE p_include_componentes = true
  ),
  
  -- CTE para calcular quantidades já processadas de peças
  pecas_processadas AS (
    SELECT 
      ap.peca_id,
      ap.processo_id,
      SUM(ap.quantidade_produzida) as quantidade_processada
    FROM apontamentos_producao ap
    INNER JOIN pecas_of p ON ap.peca_id = p.id
    WHERE ap.tipo_apontamento = 'peca'
      AND (p_of_number IS NULL OR ap.of_number = p_of_number)
      AND (p_processo_id IS NULL OR ap.processo_id = p_processo_id)
    GROUP BY ap.peca_id, ap.processo_id
  ),
  
  -- CTE para calcular quantidades já processadas de componentes
  componentes_processados AS (
    SELECT 
      ap.componente_id,
      ap.processo_id,
      SUM(ap.quantidade_produzida) as quantidade_processada
    FROM apontamentos_producao ap
    INNER JOIN componentes_of c ON ap.componente_id = c.id
    WHERE ap.tipo_apontamento = 'componente'
      AND (p_of_number IS NULL OR ap.of_number = p_of_number)
      AND (p_processo_id IS NULL OR ap.processo_id = p_processo_id)
    GROUP BY ap.componente_id, ap.processo_id
  ),
  
  -- CTE para buscar processos disponíveis
  processos_disponiveis AS (
    SELECT 
      pf.id,
      pf.nome,
      pf.ordem,
      pf.ativo
    FROM processos_fabricacao pf
    WHERE pf.ativo = true
      AND (p_processo_id IS NULL OR pf.id = p_processo_id)
    ORDER BY pf.ordem
  ),
  
  -- CTE para determinar próximos processos para cada item
  proximos_processos_cte AS (
    SELECT 
      pd.id as processo_id,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', pd_next.id,
            'nome', pd_next.nome,
            'ordem', pd_next.ordem
          ) ORDER BY pd_next.ordem
        ) FILTER (WHERE pd_next.id IS NOT NULL),
        '[]'::jsonb
      ) as proximos_processos
    FROM processos_disponiveis pd
    LEFT JOIN processos_disponiveis pd_next ON pd_next.ordem > pd.ordem
    GROUP BY pd.id
  )
  
  -- Query principal: UNION de peças e componentes
  SELECT 
    -- Peças
    p.id as item_id,
    'peca'::TEXT as item_type,
    p.marca,
    p.descricao,
    p.peso_unitario,
    p.quantidade as quantidade_total,
    COALESCE(pp.quantidade_processada, 0) as quantidade_processada,
    GREATEST(p.quantidade - COALESCE(pp.quantidade_processada, 0), 0) as quantidade_disponivel,
    p.etapa_fase,
    pd.id as processo_atual_id,
    pd.nome as processo_atual_nome,
    pd.ordem as processo_atual_ordem,
    COALESCE(ppc.proximos_processos, '[]'::jsonb) as proximos_processos,
    NULL::UUID as peca_pai_id,
    NULL::TEXT as peca_pai_marca
  FROM pecas_of p
  CROSS JOIN processos_disponiveis pd
  LEFT JOIN pecas_processadas pp ON p.id = pp.peca_id AND pd.id = pp.processo_id
  LEFT JOIN proximos_processos_cte ppc ON pd.id = ppc.processo_id
  WHERE GREATEST(p.quantidade - COALESCE(pp.quantidade_processada, 0), 0) > 0
  
  UNION ALL
  
  SELECT 
    -- Componentes
    c.id as item_id,
    'componente'::TEXT as item_type,
    c.marca,
    c.descricao,
    c.peso_unitario,
    c.quantidade as quantidade_total,
    COALESCE(cp.quantidade_processada, 0) as quantidade_processada,
    GREATEST(c.quantidade - COALESCE(cp.quantidade_processada, 0), 0) as quantidade_disponivel,
    NULL::TEXT as etapa_fase, -- Componentes não têm etapa_fase
    pd.id as processo_atual_id,
    pd.nome as processo_atual_nome,
    pd.ordem as processo_atual_ordem,
    COALESCE(ppc.proximos_processos, '[]'::jsonb) as proximos_processos,
    c.peca_id as peca_pai_id,
    c.peca_pai_marca
  FROM componentes_of c
  CROSS JOIN processos_disponiveis pd
  LEFT JOIN componentes_processados cp ON c.id = cp.componente_id AND pd.id = cp.processo_id
  LEFT JOIN proximos_processos_cte ppc ON pd.id = ppc.processo_id
  WHERE p_include_componentes = true
    AND GREATEST(c.quantidade - COALESCE(cp.quantidade_processada, 0), 0) > 0
  
  ORDER BY 
    item_type DESC, -- Peças primeiro, depois componentes
    processo_atual_ordem ASC,
    marca ASC
  LIMIT p_limit;
END;
$$;

-- Comentários sobre a função
COMMENT ON FUNCTION get_itens_disponiveis IS 'Função otimizada para buscar itens (peças e componentes) disponíveis para apontamento de produção';

-- Criar índices para otimizar a performance da função RPC
CREATE INDEX IF NOT EXISTS idx_apontamentos_producao_of_tipo_processo 
  ON apontamentos_producao(of_number, tipo_apontamento, processo_id);

CREATE INDEX IF NOT EXISTS idx_apontamentos_producao_peca_processo 
  ON apontamentos_producao(peca_id, processo_id) 
  WHERE tipo_apontamento = 'peca';

CREATE INDEX IF NOT EXISTS idx_apontamentos_producao_componente_processo 
  ON apontamentos_producao(componente_id, processo_id) 
  WHERE tipo_apontamento = 'componente';

CREATE INDEX IF NOT EXISTS idx_pecas_of_number 
  ON pecas(of_number);

CREATE INDEX IF NOT EXISTS idx_componentes_peca_peca_id 
  ON componentes_peca(peca_id);

CREATE INDEX IF NOT EXISTS idx_processos_fabricacao_ativo_ordem 
  ON processos_fabricacao(ativo, ordem) 
  WHERE ativo = true;

-- Função auxiliar para buscar estatísticas de performance
CREATE OR REPLACE FUNCTION get_apontamentos_stats(
  p_of_number TEXT DEFAULT NULL,
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL
)
RETURNS TABLE (
  total_apontamentos BIGINT,
  total_pecas BIGINT,
  total_componentes BIGINT,
  processos_utilizados BIGINT,
  quantidade_total_produzida NUMERIC,
  periodo_inicio DATE,
  periodo_fim DATE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_apontamentos,
    COUNT(*) FILTER (WHERE ap.tipo_apontamento = 'peca') as total_pecas,
    COUNT(*) FILTER (WHERE ap.tipo_apontamento = 'componente') as total_componentes,
    COUNT(DISTINCT ap.processo_id) as processos_utilizados,
    SUM(ap.quantidade_produzida) as quantidade_total_produzida,
    MIN(ap.data_apontamento::DATE) as periodo_inicio,
    MAX(ap.data_apontamento::DATE) as periodo_fim
  FROM apontamentos_producao ap
  WHERE (p_of_number IS NULL OR ap.of_number = p_of_number)
    AND (p_data_inicio IS NULL OR ap.data_apontamento::DATE >= p_data_inicio)
    AND (p_data_fim IS NULL OR ap.data_apontamento::DATE <= p_data_fim);
END;
$$;

COMMENT ON FUNCTION get_apontamentos_stats IS 'Função para obter estatísticas de apontamentos de produção';

-- Função para validação sequencial otimizada
CREATE OR REPLACE FUNCTION validate_sequencia_processos(
  p_of_number TEXT,
  p_peca_id UUID DEFAULT NULL,
  p_componente_id UUID DEFAULT NULL
)
RETURNS TABLE (
  item_id UUID,
  item_type TEXT,
  marca TEXT,
  processo_atual_id UUID,
  processo_atual_nome TEXT,
  processo_atual_ordem INTEGER,
  pode_apontar BOOLEAN,
  motivo_bloqueio TEXT,
  processos_pendentes JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- Buscar todos os processos ordenados
  processos_ordenados AS (
    SELECT id, nome, ordem
    FROM processos_fabricacao
    WHERE ativo = true
    ORDER BY ordem
  ),
  
  -- Buscar apontamentos existentes
  apontamentos_existentes AS (
    SELECT 
      ap.peca_id,
      ap.componente_id,
      ap.processo_id,
      pf.ordem as processo_ordem,
      SUM(ap.quantidade_produzida) as quantidade_apontada
    FROM apontamentos_producao ap
    INNER JOIN processos_fabricacao pf ON ap.processo_id = pf.id
    WHERE ap.of_number = p_of_number
      AND (p_peca_id IS NULL OR ap.peca_id = p_peca_id)
      AND (p_componente_id IS NULL OR ap.componente_id = p_componente_id)
    GROUP BY ap.peca_id, ap.componente_id, ap.processo_id, pf.ordem
  ),
  
  -- Determinar próximo processo válido para cada item
  proximos_processos_validos AS (
    SELECT 
      COALESCE(ae.peca_id, p_peca_id) as peca_id,
      COALESCE(ae.componente_id, p_componente_id) as componente_id,
      CASE 
        WHEN ae.processo_id IS NULL THEN (
          SELECT id FROM processos_ordenados ORDER BY ordem LIMIT 1
        )
        ELSE (
          SELECT po.id 
          FROM processos_ordenados po
          WHERE po.ordem > ae.processo_ordem
          ORDER BY po.ordem 
          LIMIT 1
        )
      END as proximo_processo_id
    FROM (
      SELECT DISTINCT 
        peca_id, 
        componente_id,
        MAX(processo_ordem) as processo_ordem,
        MAX(processo_id) as processo_id
      FROM apontamentos_existentes
      GROUP BY peca_id, componente_id
      
      UNION ALL
      
      -- Incluir itens que ainda não têm apontamentos
      SELECT p_peca_id, p_componente_id, NULL, NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM apontamentos_existentes 
        WHERE peca_id = p_peca_id OR componente_id = p_componente_id
      )
    ) ae
  )
  
  SELECT 
    COALESCE(ppv.peca_id, ppv.componente_id) as item_id,
    CASE WHEN ppv.peca_id IS NOT NULL THEN 'peca' ELSE 'componente' END as item_type,
    COALESCE(p.marca, c.marca_componente) as marca,
    po.id as processo_atual_id,
    po.nome as processo_atual_nome,
    po.ordem as processo_atual_ordem,
    (ppv.proximo_processo_id IS NOT NULL) as pode_apontar,
    CASE 
      WHEN ppv.proximo_processo_id IS NULL THEN 'Todos os processos já foram concluídos'
      ELSE NULL
    END as motivo_bloqueio,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', po_pendente.id,
          'nome', po_pendente.nome,
          'ordem', po_pendente.ordem
        ) ORDER BY po_pendente.ordem
      ) FILTER (WHERE po_pendente.id IS NOT NULL),
      '[]'::jsonb
    ) as processos_pendentes
  FROM proximos_processos_validos ppv
  LEFT JOIN pecas p ON ppv.peca_id = p.id
  LEFT JOIN componentes_peca c ON ppv.componente_id = c.id
  LEFT JOIN processos_ordenados po ON ppv.proximo_processo_id = po.id
  LEFT JOIN processos_ordenados po_pendente ON po_pendente.ordem >= po.ordem
  GROUP BY 
    ppv.peca_id, ppv.componente_id, p.marca, c.marca_componente,
    po.id, po.nome, po.ordem, ppv.proximo_processo_id;
END;
$$;

COMMENT ON FUNCTION validate_sequencia_processos IS 'Função para validar sequência de processos e determinar próximos passos válidos';