
-- Criar tabela para logs de backup
CREATE TABLE public.backup_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_type text NOT NULL CHECK (operation_type IN ('backup', 'restore')),
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  file_name text NOT NULL,
  file_size bigint,
  tables_count integer,
  records_count integer,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  error_message text,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

-- Política para admins poderem gerenciar logs de backup
CREATE POLICY "Only admins can manage backup logs"
ON public.backup_logs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_backup_logs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.completed_at = now();
    RETURN NEW;
END;
$function$;

-- Trigger para atualizar completed_at quando status muda para completed ou failed
CREATE TRIGGER update_backup_logs_completed_at
  BEFORE UPDATE ON public.backup_logs
  FOR EACH ROW
  WHEN (OLD.status = 'in_progress' AND NEW.status IN ('completed', 'failed'))
  EXECUTE FUNCTION public.update_backup_logs_updated_at();
