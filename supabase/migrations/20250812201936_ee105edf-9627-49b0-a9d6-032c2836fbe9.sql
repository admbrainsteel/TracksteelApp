
-- Primeiro vamos criar a tabela tipos_materia_prima se ela não existir
CREATE TABLE IF NOT EXISTS public.tipos_materia_prima (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  descricao text,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.tipos_materia_prima ENABLE ROW LEVEL SECURITY;

-- Política para visualizar tipos
CREATE POLICY "Todos podem visualizar tipos_materia_prima" 
  ON public.tipos_materia_prima 
  FOR SELECT 
  USING (true);

-- Política para gerenciar tipos (apenas usuários autenticados)
CREATE POLICY "Usuários autenticados podem gerenciar tipos_materia_prima" 
  ON public.tipos_materia_prima 
  FOR ALL 
  USING (auth.uid() IS NOT NULL);

-- Adicionar alguns tipos padrão se a tabela estiver vazia
INSERT INTO public.tipos_materia_prima (nome, descricao) 
SELECT 'Tubos diversos', 'Tubos redondos, quadrados, retangulares, etc'
WHERE NOT EXISTS (SELECT 1 FROM public.tipos_materia_prima WHERE nome = 'Tubos diversos');

INSERT INTO public.tipos_materia_prima (nome, descricao) 
SELECT 'Embalagens', 'Embalagens e apoios de carga'
WHERE NOT EXISTS (SELECT 1 FROM public.tipos_materia_prima WHERE nome = 'Embalagens');

INSERT INTO public.tipos_materia_prima (nome, descricao) 
SELECT 'Chapas', 'Chapas diversas'
WHERE NOT EXISTS (SELECT 1 FROM public.tipos_materia_prima WHERE nome = 'Chapas');

INSERT INTO public.tipos_materia_prima (nome, descricao) 
SELECT 'Perfis Soldados', 'VS, CS, CVS, T, Caixão, etc'
WHERE NOT EXISTS (SELECT 1 FROM public.tipos_materia_prima WHERE nome = 'Perfis Soldados');

INSERT INTO public.tipos_materia_prima (nome, descricao) 
SELECT 'Adesivos químicos', 'Colas, ampolas, chumbadores químicos, etc'
WHERE NOT EXISTS (SELECT 1 FROM public.tipos_materia_prima WHERE nome = 'Adesivos químicos');

INSERT INTO public.tipos_materia_prima (nome, descricao) 
SELECT 'Perfis Laminados', 'W, HP, Chato, Redondo, L, quadrado'
WHERE NOT EXISTS (SELECT 1 FROM public.tipos_materia_prima WHERE nome = 'Perfis Laminados');

INSERT INTO public.tipos_materia_prima (nome, descricao) 
SELECT 'Perfis Especiais', 'Perfis não usuais ou fora de catálogo'
WHERE NOT EXISTS (SELECT 1 FROM public.tipos_materia_prima WHERE nome = 'Perfis Especiais');

INSERT INTO public.tipos_materia_prima (nome, descricao) 
SELECT 'Tintas e Solventes', 'Tintas, solventes'
WHERE NOT EXISTS (SELECT 1 FROM public.tipos_materia_prima WHERE nome = 'Tintas e Solventes');

INSERT INTO public.tipos_materia_prima (nome, descricao) 
SELECT 'Insumos de Soldagem', 'Arames, eletrodos, fluxo, etc'
WHERE NOT EXISTS (SELECT 1 FROM public.tipos_materia_prima WHERE nome = 'Insumos de Soldagem');

INSERT INTO public.tipos_materia_prima (nome, descricao) 
SELECT 'Chapas Lisas', 'Chapas Lisas'
WHERE NOT EXISTS (SELECT 1 FROM public.tipos_materia_prima WHERE nome = 'Chapas Lisas');

INSERT INTO public.tipos_materia_prima (nome, descricao) 
SELECT 'Abrasivos', 'Granalhas, lixa, discos de desbastes, etc'
WHERE NOT EXISTS (SELECT 1 FROM public.tipos_materia_prima WHERE nome = 'Abrasivos');

INSERT INTO public.tipos_materia_prima (nome, descricao) 
SELECT 'Insumos de fabrica', 'Gases, discos de corte, de desbaste, etc'
WHERE NOT EXISTS (SELECT 1 FROM public.tipos_materia_prima WHERE nome = 'Insumos de fabrica');

INSERT INTO public.tipos_materia_prima (nome, descricao) 
SELECT 'Perfis Dobrados', 'L, U, UE, C'
WHERE NOT EXISTS (SELECT 1 FROM public.tipos_materia_prima WHERE nome = 'Perfis Dobrados');

INSERT INTO public.tipos_materia_prima (nome, descricao) 
SELECT 'Chapas Dobradas', 'Calhas, rufos, ch.especiais'
WHERE NOT EXISTS (SELECT 1 FROM public.tipos_materia_prima WHERE nome = 'Chapas Dobradas');

INSERT INTO public.tipos_materia_prima (nome, descricao) 
SELECT 'Fixadores em Geral', 'Parafusos, porcas, arruelas, barras roscadas, etc'
WHERE NOT EXISTS (SELECT 1 FROM public.tipos_materia_prima WHERE nome = 'Fixadores em Geral');

INSERT INTO public.tipos_materia_prima (nome, descricao) 
SELECT 'Insumos de Qualidade', 'Insumos utilizados para controle de qualidade'
WHERE NOT EXISTS (SELECT 1 FROM public.tipos_materia_prima WHERE nome = 'Insumos de Qualidade');

-- Atualizar a tabela estoque_materiais para referenciar a tabela tipos_materia_prima
-- Primeiro vamos adicionar a coluna tipo_material_nome se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estoque_materiais' AND column_name = 'tipo_material_nome') THEN
        ALTER TABLE public.estoque_materiais ADD COLUMN tipo_material_nome text;
    END IF;
END $$;

-- Atualizar os materiais existentes com base nos nomes dos tipos
UPDATE public.estoque_materiais 
SET tipo_material_nome = 'Tubos diversos' 
WHERE tipo_material_id = '3efd355f-4698-4728-95cd-456e912f68bf';

UPDATE public.estoque_materiais 
SET tipo_material_nome = 'Embalagens' 
WHERE tipo_material_id = '3e4bd7d2-ac4e-435f-aa77-432ef2b47ed3';

UPDATE public.estoque_materiais 
SET tipo_material_nome = 'Chapas' 
WHERE tipo_material_id = '3f636e44-dd43-412c-a6f7-d9a6f843b42c';

UPDATE public.estoque_materiais 
SET tipo_material_nome = 'Perfis Soldados' 
WHERE tipo_material_id = '624443d4-d4e4-45d6-ae6c-0b5d05f2b7f';

UPDATE public.estoque_materiais 
SET tipo_material_nome = 'Adesivos químicos' 
WHERE tipo_material_id = '662bdda2-461c-425a-ab68-a9b58303ffda';

UPDATE public.estoque_materiais 
SET tipo_material_nome = 'Perfis Laminados' 
WHERE tipo_material_id = '76cbb3b0-b518-4c64-870a-d3a49cc2754f';

UPDATE public.estoque_materiais 
SET tipo_material_nome = 'Perfis Especiais' 
WHERE tipo_material_id = '9b04fe9b-2db3-4804-b382-d721ec90ac6';

UPDATE public.estoque_materiais 
SET tipo_material_nome = 'Tintas e Solventes' 
WHERE tipo_material_id = '9f18138d-e34c-4b08-a962-e34f21d6e0b3';

UPDATE public.estoque_materiais 
SET tipo_material_nome = 'Insumos de Soldagem' 
WHERE tipo_material_id = 'acd60fde-7c2b-488f-97d3-75e832933649';

UPDATE public.estoque_materiais 
SET tipo_material_nome = 'Chapas Lisas' 
WHERE tipo_material_id = 'c44e3f53-3f4a-4f64-a19f-2d97d1cde50d';

UPDATE public.estoque_materiais 
SET tipo_material_nome = 'Abrasivos' 
WHERE tipo_material_id = 'cd96b8e3-e489-437b-983c-5604ca5b52e7';

UPDATE public.estoque_materiais 
SET tipo_material_nome = 'Insumos de fabrica' 
WHERE tipo_material_id = 'd2e9fe6d-fd41-49ce-b4cc-90877af1e4bc';

UPDATE public.estoque_materiais 
SET tipo_material_nome = 'Perfis Dobrados' 
WHERE tipo_material_id = 'dab105cf-e3ee-4630-a9ab-e36d24ff3540';

UPDATE public.estoque_materiais 
SET tipo_material_nome = 'Chapas Dobradas' 
WHERE tipo_material_id = 'e30b0e4c-4bcf-4303-85a6-51016798241e';

UPDATE public.estoque_materiais 
SET tipo_material_nome = 'Fixadores em Geral' 
WHERE tipo_material_id = 'e329cedb-2fc3-4dc5-8fd5-304234322720';

UPDATE public.estoque_materiais 
SET tipo_material_nome = 'Insumos de Qualidade' 
WHERE tipo_material_id = 'ffcfff58-a6d4-4ec2-baef-26e5bb1a0451';

-- Criar função para gerar número de tarefa automaticamente
CREATE OR REPLACE FUNCTION public.generate_task_ref()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  new_task_ref TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(tasks.task_ref FROM 'T-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.tasks
  WHERE tasks.task_ref ~ '^T-\d+$';
  
  new_task_ref := 'T-' || LPAD(next_num::TEXT, 4, '0');
  RETURN new_task_ref;
END;
$$;

-- Trigger para definir task_ref automaticamente
CREATE OR REPLACE FUNCTION public.handle_task_ref()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.task_ref IS NULL OR NEW.task_ref = '' OR NEW.task_ref = 'TEMP' THEN
    NEW.task_ref := public.generate_task_ref();
  END IF;
  RETURN NEW;
END;
$$;

-- Aplicar trigger na tabela tasks se não existir
DROP TRIGGER IF EXISTS set_task_ref ON public.tasks;
CREATE TRIGGER set_task_ref
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_ref();
