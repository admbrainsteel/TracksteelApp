
-- Criar bucket para documentos dos catálogos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'catalogo-documents',
  'catalogo-documents',
  true,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/tiff', 'image/bmp']
);

-- Política para permitir que usuários façam upload de documentos
CREATE POLICY "Users can upload catalog documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'catalogo-documents' 
  AND auth.uid() IS NOT NULL
);

-- Política para permitir que usuários atualizem seus próprios documentos
CREATE POLICY "Users can update catalog documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'catalogo-documents' 
  AND auth.uid() IS NOT NULL
);

-- Política para permitir que usuários deletem seus próprios documentos
CREATE POLICY "Users can delete catalog documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'catalogo-documents' 
  AND auth.uid() IS NOT NULL
);

-- Política para permitir que todos vejam os documentos dos catálogos (públicos)
CREATE POLICY "Catalog documents are publicly viewable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'catalogo-documents');

-- Adicionar coluna para armazenar URLs dos arquivos na tabela catalogos
ALTER TABLE public.catalogos 
ADD COLUMN IF NOT EXISTS arquivo_urls TEXT[];
