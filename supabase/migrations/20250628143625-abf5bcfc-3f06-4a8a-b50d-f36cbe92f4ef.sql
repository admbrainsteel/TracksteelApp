
-- Alterar campos de peso na tabela pecas para aceitar decimais com precisão adequada
ALTER TABLE public.pecas 
ALTER COLUMN peso_unitario TYPE NUMERIC(10,3),
ALTER COLUMN peso_total TYPE NUMERIC(10,3);

-- Permitir valores nulos nos campos de texto opcionais da tabela pecas
ALTER TABLE public.pecas 
ALTER COLUMN tratamento_superficial DROP NOT NULL,
ALTER COLUMN material DROP NOT NULL, 
ALTER COLUMN perfil_principal DROP NOT NULL,
ALTER COLUMN descricao DROP NOT NULL;

-- Permitir valores nulos nos campos de texto opcionais da tabela componentes_peca
ALTER TABLE public.componentes_peca
ALTER COLUMN descricao DROP NOT NULL,
ALTER COLUMN perfil DROP NOT NULL;

-- Alterar campo peso_unitario na tabela componentes_peca para aceitar decimais
ALTER TABLE public.componentes_peca
ALTER COLUMN peso_unitario TYPE NUMERIC(10,3);
