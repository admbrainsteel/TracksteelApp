
-- Adicionar nova coluna sem_componentes na tabela pecas
ALTER TABLE pecas ADD COLUMN sem_componentes boolean DEFAULT false;
