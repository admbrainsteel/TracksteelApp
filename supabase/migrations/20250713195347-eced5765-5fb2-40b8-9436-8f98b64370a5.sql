-- Fase 2: Índices Estratégicos para Performance
-- Identificados através da análise dos hooks principais

-- Índices para queries frequentes em peças
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pecas_of_number ON pecas(of_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pecas_marca ON pecas(marca);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pecas_user_id ON pecas(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pecas_created_at ON pecas(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pecas_prioridade ON pecas(prioridade);

-- Índices para componentes de peças
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_componentes_peca_peca_id ON componentes_peca(peca_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_componentes_marca ON componentes_peca(marca_componente);

-- Índices para apontamentos de produção (queries críticas)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apontamentos_of_number ON apontamentos_producao(of_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apontamentos_processo_id ON apontamentos_producao(processo_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apontamentos_peca_id ON apontamentos_producao(peca_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apontamentos_componente_id ON apontamentos_producao(componente_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apontamentos_data ON apontamentos_producao(data_apontamento DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apontamentos_created_by ON apontamentos_producao(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apontamentos_tipo ON apontamentos_producao(tipo_apontamento);

-- Índice composto para busca de quantidade processada (query frequente)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apontamentos_busca_quantidade 
ON apontamentos_producao(processo_id, of_number, tipo_apontamento, peca_id, componente_id);

-- Índices para estoque (queries pesadas)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estoque_codigo ON estoque_materiais(codigo);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estoque_status ON estoque_materiais(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estoque_tipo_material ON estoque_materiais(tipo_material_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estoque_localizacao ON estoque_materiais(localizacao);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estoque_fornecedor ON estoque_materiais(fornecedor);

-- Índices para movimentações de estoque
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movimentacoes_material_id ON movimentacoes_estoque(material_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movimentacoes_data ON movimentacoes_estoque(data_movimentacao DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movimentacoes_tipo ON movimentacoes_estoque(tipo_movimentacao);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movimentacoes_created_at ON movimentacoes_estoque(created_at DESC);

-- Índices para tasks (performance crítica)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_is_completed ON tasks(is_completed);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_completed_by ON tasks(completed_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Índice composto para tasks ativas ordenadas por prioridade e prazo
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_active_priority 
ON tasks(is_completed, priority, due_date) WHERE is_completed = false;

-- Índice composto para tasks concluídas recentes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_completed_recent 
ON tasks(is_completed, completed_at DESC) WHERE is_completed = true;

-- Índices para ordens de fabricação
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_of_num_of ON ordens_fabricacao(num_of);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_of_status ON ordens_fabricacao(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_of_data_prazo ON ordens_fabricacao(data_prazo);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_of_gestor ON ordens_fabricacao(gestor);

-- Índices para ficha técnica
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ficha_tecnica_of_number ON ficha_tecnica_contratos(of_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ficha_tecnica_cliente ON ficha_tecnica_contratos(cliente);

-- Índices para processos de fabricação
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processos_ativo ON processos_fabricacao(ativo);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processos_ordem ON processos_fabricacao(ordem);

-- Índices para profiles (autenticação e autorização)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_privilege_id ON profiles(privilege_id);

-- Índices para melhor performance de join entre apontamentos e processos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apontamentos_join_processo 
ON apontamentos_producao(processo_id, data_apontamento DESC);

-- Índices para melhor performance de join entre peças e componentes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pecas_join_componentes 
ON pecas(id, tem_componentes) WHERE tem_componentes = true;

-- Estatísticas para melhor planejamento de queries
ANALYZE pecas;
ANALYZE componentes_peca;
ANALYZE apontamentos_producao;
ANALYZE estoque_materiais;
ANALYZE movimentacoes_estoque;
ANALYZE tasks;
ANALYZE ordens_fabricacao;
ANALYZE processos_fabricacao;