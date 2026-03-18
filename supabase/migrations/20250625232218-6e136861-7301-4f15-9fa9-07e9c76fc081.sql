
-- Adicionar coluna para arquivamento na tabela sugestoes
ALTER TABLE public.sugestoes 
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN archived_by UUID REFERENCES auth.users(id);

-- Criar tabela para notificações de sugestões
CREATE TABLE public.sugestao_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  sugestao_id UUID REFERENCES public.sugestoes(id) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS para notificações
ALTER TABLE public.sugestao_notifications ENABLE ROW LEVEL SECURITY;

-- Política para que usuários vejam apenas suas próprias notificações
CREATE POLICY "Usuários podem ver suas próprias notificações" 
  ON public.sugestao_notifications 
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

-- Política para que usuários possam marcar suas notificações como lidas
CREATE POLICY "Usuários podem atualizar suas próprias notificações" 
  ON public.sugestao_notifications 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Função para criar notificação quando sugestão é implementada/rejeitada
CREATE OR REPLACE FUNCTION public.create_sugestao_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se o status mudou para 'Implementada' ou 'Rejeitada'
  IF NEW.status IN ('Implementada', 'Rejeitada') AND OLD.status = 'Pendente' THEN
    INSERT INTO public.sugestao_notifications (user_id, sugestao_id, message)
    VALUES (
      NEW.user_id,
      NEW.id,
      CASE 
        WHEN NEW.status = 'Implementada' THEN 'Sua sugestão foi implementada!'
        WHEN NEW.status = 'Rejeitada' THEN 'Sua sugestão foi rejeitada.'
      END
    );
    
    -- Arquivar automaticamente a sugestão
    NEW.archived_at = now();
    NEW.archived_by = auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para notificações
CREATE TRIGGER sugestao_status_notification
  BEFORE UPDATE ON public.sugestoes
  FOR EACH ROW
  EXECUTE FUNCTION public.create_sugestao_notification();

-- Política para inserir notificações (via trigger)
CREATE POLICY "Sistema pode criar notificações" 
  ON public.sugestao_notifications 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);
