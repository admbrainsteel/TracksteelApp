
-- Criar tabela para ficha técnica de contratos
CREATE TABLE public.ficha_tecnica_contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  of_number TEXT UNIQUE NOT NULL,
  gestor TEXT,
  revisao TEXT,
  quantidade NUMERIC,
  data_criacao DATE DEFAULT CURRENT_DATE,
  
  -- Dados do Cliente
  cliente TEXT,
  cnpj TEXT,
  ie TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  contato_contrato TEXT,
  fone_contrato TEXT,
  cel_contrato TEXT,
  email_contrato TEXT,
  contato_obra TEXT,
  fone_obra TEXT,
  cel_obra TEXT,
  email_obra TEXT,
  contato_qualid TEXT,
  fone_qualid TEXT,
  cel_qualid TEXT,
  email_qualid TEXT,
  
  -- Dados do Projeto
  descricao_resumida TEXT,
  endereco_projeto TEXT,
  bairro_projeto TEXT,
  cep_projeto TEXT,
  cidade_projeto TEXT,
  estado_projeto TEXT,
  horarios_trabalho TEXT,
  condicoes_acesso TEXT,
  
  -- Tipo de Projeto (checkboxes)
  tipo_estrutural BOOLEAN DEFAULT FALSE,
  tipo_residencial BOOLEAN DEFAULT FALSE,
  tipo_espacial BOOLEAN DEFAULT FALSE,
  tipo_comercial BOOLEAN DEFAULT FALSE,
  tipo_grades BOOLEAN DEFAULT FALSE,
  tipo_industrial BOOLEAN DEFAULT FALSE,
  tipo_cobertura BOOLEAN DEFAULT FALSE,
  tipo_com_montagem BOOLEAN DEFAULT FALSE,
  
  -- Documentos fornecidos pelo cliente (checkboxes)
  doc_calculo BOOLEAN DEFAULT FALSE,
  doc_projeto BOOLEAN DEFAULT FALSE,
  doc_detalhamento BOOLEAN DEFAULT FALSE,
  doc_cronograma BOOLEAN DEFAULT FALSE,
  doc_normas BOOLEAN DEFAULT FALSE,
  doc_especif_tecnicas BOOLEAN DEFAULT FALSE,
  doc_catalogo BOOLEAN DEFAULT FALSE,
  doc_fotos BOOLEAN DEFAULT FALSE,
  
  -- Informações do projeto (E/C/NA para cada item)
  info_calculo_estrutural JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_projeto_basico JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_detalhamento JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_materia_prima JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_fabricacao JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_grades_piso JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_jateamento JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_pintura_base JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_pintura_inter JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_pintura_acabamento JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_galvanizacao JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_embalagem JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_transporte JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_inspecao JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_ensaios_lab JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_databook JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_pre_montagem JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_placa_engenetal JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_parafusos JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_chumbadores JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_stud_bolt JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_fornec_telhas JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_montagem_telhas JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_forn_calhas JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_mont_calhas JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_steel_deck JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_fornec_wall JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_mont_wall JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  info_outros_materiais JSONB DEFAULT '{"e": false, "c": false, "na": false, "info": ""}',
  
  -- Validação pós detalhamento
  necessita_validacao_pos_detalh BOOLEAN DEFAULT FALSE,
  
  -- Grades de piso
  grades_modelo TEXT,
  grades_padrao_comercial BOOLEAN DEFAULT FALSE,
  grades_padrao_sa2 BOOLEAN DEFAULT FALSE,
  grades_padrao_sa2_meio BOOLEAN DEFAULT FALSE,
  grades_padrao_sa3 BOOLEAN DEFAULT FALSE,
  
  -- Requisitos ambientais
  req_ambientais_existem BOOLEAN DEFAULT FALSE,
  req_ambientais_quais TEXT,
  req_saude_seguranca_existem BOOLEAN DEFAULT FALSE,
  req_saude_seguranca_quais TEXT,
  
  -- Alteração no contrato
  alteracao_descritivo TEXT,
  alteracao_motivo TEXT,
  alteracao_impacto TEXT,
  alteracao_custo NUMERIC,
  alteracao_cronograma TEXT,
  alteracao_pecas_prontas TEXT,
  alteracao_detalh_projeto TEXT,
  
  -- Cronograma (semanas)
  cronograma_semanas JSONB DEFAULT '{}',
  
  -- Visto dos responsáveis
  visto_gestor TEXT,
  visto_pcp TEXT,
  visto_eng TEXT,
  visto_fab TEXT,
  visto_exp TEXT,
  visto_qual TEXT,
  visto_colunas JSONB DEFAULT '{"1": false, "2": false, "3": false, "4": false}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.ficha_tecnica_contratos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own fichas"
  ON public.ficha_tecnica_contratos
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own fichas"
  ON public.ficha_tecnica_contratos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fichas"
  ON public.ficha_tecnica_contratos
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fichas"
  ON public.ficha_tecnica_contratos
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_ficha_tecnica_of_number ON public.ficha_tecnica_contratos(of_number);
CREATE INDEX idx_ficha_tecnica_user_id ON public.ficha_tecnica_contratos(user_id);
