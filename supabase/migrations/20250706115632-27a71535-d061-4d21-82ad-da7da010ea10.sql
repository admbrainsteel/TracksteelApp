
-- Criar tabelas para o módulo de Obra

-- Tabela de contratos de obra (baseada nas OFs existentes)
CREATE TABLE public.contratos_obra (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  of_number TEXT NOT NULL UNIQUE,
  nome_obra TEXT,
  cliente TEXT,
  data_inicio_contratual DATE,
  data_termino_prevista DATE,
  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Pausado', 'Concluído')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de recursos de obra (CRUD)
CREATE TABLE public.recursos_obra (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_recurso TEXT NOT NULL, -- "Mão de Obra", "Equipamento"
  nome_recurso TEXT NOT NULL, -- "Montador", "Guindaste 50t"
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de condições climáticas (CRUD)
CREATE TABLE public.condicoes_climaticas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE, -- "Ensolarado", "Nublado", "Chuvoso", "Vento Forte", "Garoa"
  icone TEXT, -- nome do ícone para exibição
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de motivos improdutivos (CRUD)
CREATE TABLE public.motivos_improdutivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  motivo TEXT NOT NULL UNIQUE, -- "Chuva", "Vento Acima do Limite", etc.
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela principal do Diário de Obra (RDO)
CREATE TABLE public.diario_obra_rdo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  of_number TEXT NOT NULL,
  usuario_rdo UUID REFERENCES auth.users(id),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  condicao_climatica_id UUID REFERENCES public.condicoes_climaticas(id),
  temperatura_aproximada INTEGER, -- em °C
  observacoes_gerais TEXT,
  finalizado BOOLEAN DEFAULT false,
  sincronizado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(of_number, data) -- Um RDO por OF por dia
);

-- Tabela de apontamentos de peças
CREATE TABLE public.apontamentos_peca_obra (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rdo_id UUID NOT NULL REFERENCES public.diario_obra_rdo(id) ON DELETE CASCADE,
  marca_peca TEXT NOT NULL,
  status TEXT DEFAULT 'Recebida em Canteiro' CHECK (status IN ('Recebida em Canteiro', 'Preparada', 'Montada', 'Inspecionada')),
  periodo TEXT DEFAULT 'manha' CHECK (periodo IN ('manha', 'tarde', 'noite')),
  quantidade INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de apontamentos de recursos
CREATE TABLE public.apontamentos_recursos_obra (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rdo_id UUID NOT NULL REFERENCES public.diario_obra_rdo(id) ON DELETE CASCADE,
  recurso_id UUID NOT NULL REFERENCES public.recursos_obra(id),
  horas_trabalhadas NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de apontamentos improdutivos
CREATE TABLE public.apontamentos_improdutivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rdo_id UUID NOT NULL REFERENCES public.diario_obra_rdo(id) ON DELETE CASCADE,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  duracao_total INTERVAL GENERATED ALWAYS AS (hora_fim - hora_inicio) STORED,
  motivo_id UUID NOT NULL REFERENCES public.motivos_improdutivos(id),
  descricao TEXT, -- obrigatória se motivo = "Outro"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de registros fotográficos
CREATE TABLE public.registros_fotograficos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fk_associada UUID NOT NULL, -- pode ser RDO_ID, apontamento_peca_id ou desvio_id
  tipo_associacao TEXT NOT NULL CHECK (tipo_associacao IN ('rdo', 'apontamento_peca', 'desvio')),
  arquivo_url TEXT NOT NULL,
  legenda TEXT,
  timestamp_foto TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de registros de desvios
CREATE TABLE public.registros_desvios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rdo_id UUID NOT NULL REFERENCES public.diario_obra_rdo(id) ON DELETE CASCADE,
  descricao_desvio TEXT NOT NULL,
  referencia_projeto TEXT, -- ex: "Folha de Desenho 15-B"
  status TEXT DEFAULT 'Aberto' CHECK (status IN ('Aberto', 'Em Análise', 'Resolvido')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir dados iniciais para as tabelas de configuração
INSERT INTO public.condicoes_climaticas (nome, icone) VALUES
('Ensolarado', 'sun'),
('Nublado', 'cloud'),
('Chuvoso', 'cloud-rain'),
('Vento Forte', 'wind'),
('Garoa', 'cloud-drizzle');

INSERT INTO public.motivos_improdutivos (motivo, descricao) VALUES
('Chuva', 'Parada devido à chuva'),
('Vento Acima do Limite', 'Vento acima dos limites de segurança'),
('Falha de Equipamento', 'Problema técnico em equipamentos'),
('Falta de Material', 'Material não disponível no canteiro'),
('Instrução de Segurança (DDS)', 'Diálogo Diário de Segurança'),
('Problema de Acesso', 'Dificuldade de acesso ao local de trabalho'),
('Esperando Liberação', 'Aguardando autorização para prosseguir'),
('Outro', 'Outros motivos não listados');

-- Habilitar RLS para todas as tabelas
ALTER TABLE public.contratos_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recursos_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condicoes_climaticas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motivos_improdutivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diario_obra_rdo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apontamentos_peca_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apontamentos_recursos_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apontamentos_improdutivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_fotograficos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_desvios ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para permitir acesso a usuários autenticados
CREATE POLICY "Authenticated users can manage contratos_obra" ON public.contratos_obra FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage recursos_obra" ON public.recursos_obra FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Everyone can view condicoes_climaticas" ON public.condicoes_climaticas FOR SELECT USING (true);
CREATE POLICY "Everyone can view motivos_improdutivos" ON public.motivos_improdutivos FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage diario_obra_rdo" ON public.diario_obra_rdo FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage apontamentos_peca_obra" ON public.apontamentos_peca_obra FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage apontamentos_recursos_obra" ON public.apontamentos_recursos_obra FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage apontamentos_improdutivos" ON public.apontamentos_improdutivos FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage registros_fotograficos" ON public.registros_fotograficos FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage registros_desvios" ON public.registros_desvios FOR ALL USING (auth.uid() IS NOT NULL);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contratos_obra_updated_at BEFORE UPDATE ON public.contratos_obra FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_recursos_obra_updated_at BEFORE UPDATE ON public.recursos_obra FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_diario_obra_rdo_updated_at BEFORE UPDATE ON public.diario_obra_rdo FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_registros_desvios_updated_at BEFORE UPDATE ON public.registros_desvios FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
