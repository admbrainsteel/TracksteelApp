
-- Adicionar novos campos à tabela romaneios_expedicao
ALTER TABLE public.romaneios_expedicao 
ADD COLUMN data_criacao date DEFAULT CURRENT_DATE,
ADD COLUMN revisao integer DEFAULT 1,
ADD COLUMN motivo_revisao text,
ADD COLUMN data_prevista_entrega date,
ADD COLUMN previsao_kg numeric,
ADD COLUMN maior_dimensao text,
ADD COLUMN tipo_transporte text,
ADD COLUMN frete_tipo text,
ADD COLUMN nome_motorista text;

-- Alterar o tipo da coluna prioridade de integer para text
ALTER TABLE public.romaneios_expedicao 
ALTER COLUMN prioridade TYPE text USING 
  CASE 
    WHEN prioridade = 1 THEN 'Normal'
    WHEN prioridade = 2 THEN 'Urgente'
    ELSE 'Normal'
  END;

-- Definir valor padrão para prioridade
ALTER TABLE public.romaneios_expedicao 
ALTER COLUMN prioridade SET DEFAULT 'Normal';

-- Atualizar status existentes para os novos valores
UPDATE public.romaneios_expedicao 
SET status = CASE 
  WHEN status = 'Em Preparação' THEN 'Em planejamento'
  ELSE status
END;
