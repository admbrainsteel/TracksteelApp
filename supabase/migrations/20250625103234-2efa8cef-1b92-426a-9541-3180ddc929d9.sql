
-- Add gestor_id and projetista_id columns to ficha_tecnica_contratos table
ALTER TABLE public.ficha_tecnica_contratos 
ADD COLUMN gestor_id uuid REFERENCES auth.users(id),
ADD COLUMN projetista_id uuid REFERENCES auth.users(id);

-- Create indexes for better performance
CREATE INDEX idx_ficha_tecnica_gestor_id ON public.ficha_tecnica_contratos(gestor_id);
CREATE INDEX idx_ficha_tecnica_projetista_id ON public.ficha_tecnica_contratos(projetista_id);
