-- Índices adicionais para otimização de performance
-- Baseado na análise de performance do sistema de apontamentos

-- Índices para tabela pecas
CREATE INDEX IF NOT EXISTS idx_pecas_of_number_marca 
  ON pecas(of_number, marca);

CREATE INDEX IF NOT EXISTS idx_pecas_etapa_fase 
  ON pecas(etapa_fase) 
  WHERE etapa_fase IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pecas_quantidade 
  ON pecas(quantidade) 
  WHERE quantidade > 0;

CREATE INDEX IF NOT EXISTS idx_pecas_created_at 
  ON pecas(created_at DESC);

-- Índices para tabela componentes_peca
CREATE INDEX IF NOT EXISTS idx_componentes_peca_marca 
  ON componentes_peca(marca_componente);

CREATE INDEX IF NOT EXISTS idx_componentes_peca_peca_marca 
  ON componentes_peca(peca_id, marca_componente);

CREATE INDEX IF NOT EXISTS idx_componentes_quantidade_por_peca 
  ON componentes_peca(quantidade_por_peca) 
  WHERE quantidade_por_peca > 0;

-- Índices para tabela apontamentos_producao (otimizações específicas)
CREATE INDEX IF NOT EXISTS idx_apontamentos_data_of 
  ON apontamentos_producao(data_apontamento DESC, of_number);

CREATE INDEX IF NOT EXISTS idx_apontamentos_created_at_desc 
  ON apontamentos_producao(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_apontamentos_peca_data 
  ON apontamentos_producao(peca_id, data_apontamento DESC) 
  WHERE peca_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_apontamentos_componente_data 
  ON apontamentos_producao(componente_id, data_apontamento DESC) 
  WHERE componente_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_apontamentos_quantidade_produzida 
  ON apontamentos_producao(quantidade_produzida) 
  WHERE quantidade_produzida > 0;

-- Índice composto para consultas complexas de apontamentos
CREATE INDEX IF NOT EXISTS idx_apontamentos_of_tipo_data 
  ON apontamentos_producao(of_number, tipo_apontamento, data_apontamento DESC);

-- Índices para tabela processos_fabricacao
CREATE INDEX IF NOT EXISTS idx_processos_ativo_ordem_nome 
  ON processos_fabricacao(ativo, ordem, nome) 
  WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_processos_nome 
  ON processos_fabricacao(nome) 
  WHERE ativo = true;

-- Índices para otimizar JOINs frequentes
CREATE INDEX IF NOT EXISTS idx_apontamentos_peca_processo_of 
  ON apontamentos_producao(peca_id, processo_id, of_number) 
  WHERE peca_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_apontamentos_componente_processo_of 
  ON apontamentos_producao(componente_id, processo_id, of_number) 
  WHERE componente_id IS NOT NULL;

-- Índice para consultas de estatísticas por período
CREATE INDEX IF NOT EXISTS idx_apontamentos_data_created_at 
  ON apontamentos_producao(data_apontamento, created_at);

-- Índice para busca rápida de últimos apontamentos
CREATE INDEX IF NOT EXISTS idx_apontamentos_of_created_desc 
  ON apontamentos_producao(of_number, created_at DESC);

-- Comentários sobre os índices criados
COMMENT ON INDEX idx_pecas_of_number_marca IS 'Otimiza consultas por OF e marca de peça';
COMMENT ON INDEX idx_apontamentos_data_of IS 'Otimiza consultas por data e OF nos apontamentos';
COMMENT ON INDEX idx_apontamentos_of_tipo_data IS 'Índice composto para consultas complexas de apontamentos';
COMMENT ON INDEX idx_processos_ativo_ordem_nome IS 'Otimiza listagem de processos ativos ordenados';

-- Análise de estatísticas das tabelas para o otimizador
ANALYZE pecas;
ANALYZE componentes_peca;
ANALYZE apontamentos_producao;
ANALYZE processos_fabricacao;

-- Função para monitorar uso dos índices
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE (
  schemaname TEXT,
  relname TEXT,
  indexrelname TEXT,
  idx_scan BIGINT,
  idx_tup_read BIGINT,
  idx_tup_fetch BIGINT,
  usage_ratio NUMERIC
)
LANGUAGE sql
AS $$
  SELECT 
    schemaname,
    relname,
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    CASE 
      WHEN idx_scan = 0 THEN 0
      ELSE ROUND((idx_tup_fetch::NUMERIC / idx_tup_read::NUMERIC) * 100, 2)
    END as usage_ratio
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
    AND relname IN ('pecas', 'componentes_peca', 'apontamentos_producao', 'processos_fabricacao')
  ORDER BY idx_scan DESC, usage_ratio DESC;
$$;

COMMENT ON FUNCTION get_index_usage_stats IS 'Função para monitorar estatísticas de uso dos índices';

-- Função simplificada para análise de performance (pg_stat_statements pode não estar disponível)
CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE (
  schemaname TEXT,
  relname TEXT,
  seq_scan BIGINT,
  seq_tup_read BIGINT,
  idx_scan BIGINT,
  idx_tup_fetch BIGINT,
  n_tup_ins BIGINT,
  n_tup_upd BIGINT,
  n_tup_del BIGINT
)
LANGUAGE sql
AS $$
  SELECT 
    schemaname,
    relname,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_tup_ins,
    n_tup_upd,
    n_tup_del
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
    AND relname IN ('pecas', 'componentes_peca', 'apontamentos_producao', 'processos_fabricacao')
  ORDER BY seq_scan DESC, idx_scan DESC;
$$;

COMMENT ON FUNCTION get_table_stats IS 'Fornece estatísticas de uso das tabelas do sistema de apontamentos';