-- Atualizar os dados padrão da tabela localizacoes_estoque
-- Substituir os dados atuais pelos da figura 1

-- Primeiro, desativar todos os registros existentes
UPDATE localizacoes_estoque SET ativo = false;

-- Inserir as novas localizações baseadas na figura 1
INSERT INTO localizacoes_estoque (nome, codigo, descricao, ativo) VALUES
('Área de Expedição', 'AE', 'Área destinada para expedição de materiais', true),
('Área de Recebimento', 'AR', 'Área destinada para recebimento de materiais', true),
('Área Externa', 'AEX', 'Área externa para armazenamento', true),
('Depósito Pequeno', 'DP', 'Depósito de pequeno porte', true),
('Galpão Principal', 'GP', 'Galpão principal de armazenamento', true)

ON CONFLICT (nome) DO UPDATE SET
  codigo = EXCLUDED.codigo,
  descricao = EXCLUDED.descricao,
  ativo = EXCLUDED.ativo;