
import { useState } from 'react';
import { Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AcceptTaskButtonProps {
  taskId: string;
  onAccept: (taskId: string) => void;
  isLoading?: boolean;
}

export function AcceptTaskButton({ taskId, onAccept, isLoading }: AcceptTaskButtonProps) {
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    try {
      setAccepting(true);
      await onAccept(taskId);
      toast.success('Tarefa aceita com sucesso!');
    } catch (error) {
      console.error('Erro ao aceitar tarefa:', error);
      toast.error('Erro ao aceitar tarefa');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <Button
      onClick={handleAccept}
      disabled={accepting || isLoading}
      className="bg-green-600 hover:bg-green-700 text-white"
      size="sm"
    >
      {accepting ? (
        <>
          <Clock className="h-4 w-4 mr-2 animate-spin" />
          Aceitando...
        </>
      ) : (
        <>
          <Check className="h-4 w-4 mr-2" />
          Aceitar
        </>
      )}
    </Button>
  );
}
