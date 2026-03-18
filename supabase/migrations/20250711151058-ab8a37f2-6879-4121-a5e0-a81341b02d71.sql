
-- Remover a constraint de chave estrangeira que impede a exclusão de peças
ALTER TABLE processos_pecas_datas DROP CONSTRAINT IF EXISTS processos_pecas_datas_peca_id_fkey;

-- Recriar a constraint com CASCADE para permitir exclusão automática dos registros relacionados
ALTER TABLE processos_pecas_datas 
ADD CONSTRAINT processos_pecas_datas_peca_id_fkey 
FOREIGN KEY (peca_id) REFERENCES pecas(id) ON DELETE CASCADE;

-- Fazer o mesmo para a tabela componentes_peca se necessário
ALTER TABLE componentes_peca DROP CONSTRAINT IF EXISTS componentes_peca_peca_id_fkey;
ALTER TABLE componentes_peca 
ADD CONSTRAINT componentes_peca_peca_id_fkey 
FOREIGN KEY (peca_id) REFERENCES pecas(id) ON DELETE CASCADE;

-- E para apontamentos_producao
ALTER TABLE apontamentos_producao DROP CONSTRAINT IF EXISTS apontamentos_producao_peca_id_fkey;
ALTER TABLE apontamentos_producao 
ADD CONSTRAINT apontamentos_producao_peca_id_fkey 
FOREIGN KEY (peca_id) REFERENCES pecas(id) ON DELETE CASCADE;
