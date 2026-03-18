
-- Adicionar coluna para identificar se o apontamento é de um componente
ALTER TABLE public.apontamentos_producao 
ADD COLUMN componente_id uuid REFERENCES public.componentes_peca(id);

-- Adicionar coluna para identificar o tipo do apontamento
ALTER TABLE public.apontamentos_producao 
ADD COLUMN tipo_apontamento text DEFAULT 'peca' CHECK(tipo_apontamento IN ('peca', 'componente'));

-- Criar índice para melhor performance
CREATE INDEX idx_apontamentos_componente_id ON public.apontamentos_producao(componente_id);
CREATE INDEX idx_apontamentos_tipo ON public.apontamentos_producao(tipo_apontamento);

-- Atualizar registros existentes para definir o tipo como 'peca'
UPDATE public.apontamentos_producao 
SET tipo_apontamento = 'peca' 
WHERE tipo_apontamento IS NULL;
