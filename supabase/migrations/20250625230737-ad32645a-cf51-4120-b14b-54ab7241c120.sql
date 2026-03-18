
-- Criar tabela para armazenar os catálogos
CREATE TABLE public.catalogos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  disciplina TEXT NOT NULL,
  palavras_chave TEXT[],
  conteudo TEXT NOT NULL,
  numero_paginas INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.catalogos ENABLE ROW LEVEL SECURITY;

-- Política para leitura (todos os usuários autenticados podem ler)
CREATE POLICY "Todos podem ver catalogos" 
  ON public.catalogos 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Política para inserção (apenas admins)
CREATE POLICY "Admins podem criar catalogos" 
  ON public.catalogos 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Política para atualização (apenas admins)
CREATE POLICY "Admins podem atualizar catalogos" 
  ON public.catalogos 
  FOR UPDATE 
  TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- Política para exclusão (apenas admins)
CREATE POLICY "Admins podem excluir catalogos" 
  ON public.catalogos 
  FOR DELETE 
  TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_catalogos_updated_at
  BEFORE UPDATE ON public.catalogos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
