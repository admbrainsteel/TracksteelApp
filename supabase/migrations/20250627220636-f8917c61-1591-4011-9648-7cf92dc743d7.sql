
-- Criar tabela para processos de fabricação
CREATE TABLE public.processos_fabricacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Criar tabela para apontamentos de produção
CREATE TABLE public.apontamentos_producao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  of_number TEXT NOT NULL,
  peca_id UUID REFERENCES public.pecas(id),
  processo_id UUID NOT NULL REFERENCES public.processos_fabricacao(id),
  quantidade_produzida NUMERIC NOT NULL DEFAULT 0,
  data_apontamento DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT quantidade_positiva CHECK (quantidade_produzida > 0)
);

-- Criar tabela para controle de datas reais dos processos por peça
CREATE TABLE public.processos_pecas_datas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  peca_id UUID NOT NULL REFERENCES public.pecas(id),
  processo_id UUID NOT NULL REFERENCES public.processos_fabricacao(id),
  data_inicio_real DATE,
  data_conclusao_real DATE,
  quantidade_total_planejada NUMERIC NOT NULL DEFAULT 0,
  quantidade_total_produzida NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(peca_id, processo_id)
);

-- Criar índices para performance
CREATE INDEX idx_apontamentos_of_number ON public.apontamentos_producao(of_number);
CREATE INDEX idx_apontamentos_peca_processo ON public.apontamentos_producao(peca_id, processo_id);
CREATE INDEX idx_apontamentos_data ON public.apontamentos_producao(data_apontamento);
CREATE INDEX idx_processos_pecas_datas_peca ON public.processos_pecas_datas(peca_id);

-- Habilitar RLS nas tabelas
ALTER TABLE public.processos_fabricacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apontamentos_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processos_pecas_datas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para processos_fabricacao (todos podem ver, apenas usuários autenticados podem modificar)
CREATE POLICY "Todos podem visualizar processos" ON public.processos_fabricacao
  FOR SELECT USING (true);

CREATE POLICY "Usuários autenticados podem inserir processos" ON public.processos_fabricacao
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar processos" ON public.processos_fabricacao
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Políticas RLS para apontamentos_producao
CREATE POLICY "Usuários podem visualizar apontamentos" ON public.apontamentos_producao
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem inserir apontamentos" ON public.apontamentos_producao
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem atualizar seus apontamentos" ON public.apontamentos_producao
  FOR UPDATE USING (auth.uid() = created_by);

-- Políticas RLS para processos_pecas_datas
CREATE POLICY "Usuários podem visualizar processos_pecas_datas" ON public.processos_pecas_datas
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem inserir processos_pecas_datas" ON public.processos_pecas_datas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem atualizar processos_pecas_datas" ON public.processos_pecas_datas
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_processos_fabricacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_processos_fabricacao_updated_at
    BEFORE UPDATE ON public.processos_fabricacao
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_processos_fabricacao();

CREATE TRIGGER trigger_update_apontamentos_producao_updated_at
    BEFORE UPDATE ON public.apontamentos_producao
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_processos_pecas_datas_updated_at
    BEFORE UPDATE ON public.processos_pecas_datas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Função para atualizar datas reais após inserção de apontamento
CREATE OR REPLACE FUNCTION atualizar_datas_reais_processo()
RETURNS TRIGGER AS $$
DECLARE
    total_produzido NUMERIC;
    total_planejado NUMERIC;
    registro_existente BOOLEAN;
BEGIN
    -- Verificar se já existe registro na tabela processos_pecas_datas
    SELECT EXISTS(
        SELECT 1 FROM public.processos_pecas_datas 
        WHERE peca_id = NEW.peca_id AND processo_id = NEW.processo_id
    ) INTO registro_existente;
    
    -- Se não existe, criar registro inicial
    IF NOT registro_existente THEN
        -- Buscar quantidade total planejada da peça
        SELECT COALESCE(quantidade, 0) INTO total_planejado
        FROM public.pecas 
        WHERE id = NEW.peca_id;
        
        INSERT INTO public.processos_pecas_datas (
            peca_id, 
            processo_id, 
            data_inicio_real, 
            quantidade_total_planejada,
            quantidade_total_produzida
        ) VALUES (
            NEW.peca_id, 
            NEW.processo_id, 
            NEW.data_apontamento, 
            total_planejado,
            NEW.quantidade_produzida
        );
    ELSE
        -- Calcular total produzido para esta peça+processo
        SELECT COALESCE(SUM(quantidade_produzida), 0) INTO total_produzido
        FROM public.apontamentos_producao 
        WHERE peca_id = NEW.peca_id AND processo_id = NEW.processo_id;
        
        -- Buscar quantidade total planejada
        SELECT quantidade_total_planejada INTO total_planejado
        FROM public.processos_pecas_datas 
        WHERE peca_id = NEW.peca_id AND processo_id = NEW.processo_id;
        
        -- Atualizar registro existente
        UPDATE public.processos_pecas_datas 
        SET 
            quantidade_total_produzida = total_produzido,
            data_conclusao_real = CASE 
                WHEN total_produzido >= total_planejado THEN NEW.data_apontamento
                ELSE data_conclusao_real
            END,
            updated_at = now()
        WHERE peca_id = NEW.peca_id AND processo_id = NEW.processo_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar datas reais
CREATE TRIGGER trigger_atualizar_datas_reais
    AFTER INSERT ON public.apontamentos_producao
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_datas_reais_processo();

-- Inserir alguns processos padrão
INSERT INTO public.processos_fabricacao (nome, descricao, ordem) VALUES
('Corte', 'Processo de corte de materiais', 1),
('Solda', 'Processo de soldagem', 2),
('Usinagem', 'Processo de usinagem e acabamento', 3),
('Pintura', 'Processo de pintura e acabamento', 4),
('Montagem', 'Processo de montagem final', 5),
('Inspeção', 'Inspeção de qualidade', 6);
