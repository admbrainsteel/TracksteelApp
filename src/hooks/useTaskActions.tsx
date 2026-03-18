
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export const useTaskActions = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { mutate: updateTaskStatus, isPending: isUpdatingStatus } = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'concluido') {
        updates.is_completed = true;
        updates.completed_at = new Date().toISOString();
        updates.completed_by = user?.id;
      } else if (status === 'em_andamento') {
        updates.is_completed = false;
        updates.completed_at = null;
        updates.completed_by = null;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Status da tarefa atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating task status:', error);
      toast.error('Erro ao atualizar status da tarefa');
    },
  });

  const { mutate: deleteTask, isPending: isDeleting } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa deletada com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast.error('Erro ao deletar tarefa');
    },
  });

  const canEdit = (task: any) => {
    return user?.id === task.created_by;
  };

  const canDelete = (task: any) => {
    return user?.id === task.created_by;
  };

  const canMarkComplete = (task: any) => {
    return task.assigned_to?.includes(user?.id) || user?.id === task.created_by;
  };

  const canAccept = (task: any) => {
    return task.assigned_to?.includes(user?.id) && task.status === 'a_fazer';
  };

  return {
    updateTaskStatus,
    deleteTask,
    canEdit,
    canDelete,
    canMarkComplete,
    canAccept,
    isUpdatingStatus,
    isDeleting,
  };
};
