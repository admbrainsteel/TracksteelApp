import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type Task = Database['TS_ERP']['Tables']['tasks']['Row'];
type TaskInsert = Database['TS_ERP']['Tables']['tasks']['Insert'];
type TaskUpdate = Database['TS_ERP']['Tables']['tasks']['Update'];

export const useTasks = () => {
  const queryClient = useQueryClient();

  // Fetch active tasks (not completed)
  const { 
    data: activeTasks = [], 
    isLoading: isLoadingActive,
    refetch: refetchActiveTasks,
    error: activeTasksError
  } = useQuery({
    queryKey: ['tasks', 'active'],
    queryFn: async () => {
      console.log('🔍 Fetching active tasks...');
      
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('❌ Auth error when fetching active tasks:', authError);
        throw new Error('Erro de autenticação: ' + authError.message);
      }
      
      if (!user) {
        console.error('❌ No authenticated user found');
        throw new Error('Usuário não autenticado');
      }
      
      console.log('✅ User authenticated:', user.email);

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_completed', false)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('❌ Error fetching active tasks:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw new Error('Erro ao buscar tarefas ativas: ' + error.message);
      }

      console.log('✅ Active tasks fetched successfully:', data?.length || 0, 'tasks');
      console.log('📋 Tasks data:', data);
      return data || [];
    },
  });

  // Fetch recent completed tasks (last 24 hours)
  const { 
    data: recentCompletedTasks = [], 
    isLoading: isLoadingRecentCompleted,
    refetch: refetchRecentCompleted,
    error: recentCompletedError
  } = useQuery({
    queryKey: ['tasks', 'recent-completed'],
    queryFn: async () => {
      console.log('🔍 Fetching recent completed tasks...');
      
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ Auth error when fetching recent completed tasks:', authError);
        throw new Error('Usuário não autenticado');
      }

      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_completed', true)
        .gte('completed_at', oneDayAgo.toISOString())
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching recent completed tasks:', error);
        throw new Error('Erro ao buscar tarefas concluídas: ' + error.message);
      }

      console.log('✅ Recent completed tasks fetched:', data?.length || 0);
      return data || [];
    },
  });

  // Fetch completed tasks by current user (last 30 days for history)
  const { 
    data: completedTasks = [], 
    isLoading: isLoadingCompleted,
    refetch: refetchCompletedTasks,
    error: completedTasksError
  } = useQuery({
    queryKey: ['tasks', 'completed'],
    queryFn: async () => {
      console.log('🔍 Fetching completed tasks by current user...');
      
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ Auth error when fetching completed tasks:', authError);
        throw new Error('Usuário não autenticado');
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_completed', true)
        .eq('completed_by', user.id)
        .gte('completed_at', thirtyDaysAgo.toISOString())
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching completed tasks:', error);
        throw new Error('Erro ao buscar histórico de tarefas: ' + error.message);
      }

      console.log('✅ Completed tasks by user fetched:', data?.length || 0);
      return data || [];
    },
  });

  // Fetch tasks assigned by current user and completed by others (last 30 days for history)
  const { 
    data: assignedCompletedTasks = [], 
    isLoading: isLoadingAssignedCompleted,
    refetch: refetchAssignedCompletedTasks,
    error: assignedCompletedTasksError
  } = useQuery({
    queryKey: ['tasks', 'assigned-completed'],
    queryFn: async () => {
      console.log('🔍 Fetching assigned completed tasks...');
      
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ Auth error when fetching assigned completed tasks:', authError);
        throw new Error('Usuário não autenticado');
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_completed', true)
        .eq('created_by', user.id)
        .neq('completed_by', user.id)
        .gte('completed_at', thirtyDaysAgo.toISOString())
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching assigned completed tasks:', error);
        throw new Error('Erro ao buscar tarefas atribuídas concluídas: ' + error.message);
      }

      console.log('✅ Assigned completed tasks fetched:', data?.length || 0);
      return data || [];
    },
  });

  // Fetch available OFs from ficha_tecnica_contratos table
  const { data: availableOFs = [] } = useQuery({
    queryKey: ['ofs'],
    queryFn: async () => {
      console.log('🔍 Fetching available OFs...');
      const { data, error } = await supabase
        .from('ordens_fabricacao')
        .select(`
          num_of,
          ficha_tecnica_contratos (
            cliente
          )
        `)
        .eq('status', 'ativa')
        .order('num_of');

      if (error) {
        console.error('❌ Error fetching OFs:', error);
        throw error;
      }

      const mappedData = data?.map((of: { num_of: string, ficha_tecnica_contratos?: { cliente?: string | null } | null }) => ({
        of_number: of.num_of,
        cliente: of.ficha_tecnica_contratos?.cliente
      }));

      console.log('✅ Available OFs fetched:', mappedData?.length || 0);
      return mappedData || [];
    },
  });

  // Fetch available users - use direct query with type assertion for RPC
  const { data: availableUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      console.log('🔍 Fetching available users...');
      
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ Auth error when fetching users:', authError);
        throw new Error('Usuário não autenticado');
      }

      console.log('✅ User authenticated for fetching users:', user.email);

      try {
        // Use RPC function to bypass RLS restrictions for user listing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await supabase.rpc('get_all_users_for_tasks' as any);

        if (error) {
          console.error('❌ Error fetching users via RPC:', error);
          // Fallback to direct query if RPC fails
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('status', 'active')
            .order('email');

          if (fallbackError) {
            console.error('❌ Error fetching users (fallback):', fallbackError);
            throw new Error('Erro ao buscar usuários: ' + fallbackError.message);
          }

          console.log('✅ Available users fetched (fallback):', fallbackData?.length || 0);
          return fallbackData || [];
        }

        // Type assertion for RPC result
        const typedData = data as Array<{ id: string; email: string; full_name: string }>;
        console.log('✅ Available users fetched via RPC:', typedData?.length || 0);
        return typedData || [];
      } catch (rpcError) {
        console.error('❌ RPC call failed, using fallback:', rpcError);
        // Fallback to direct query
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('status', 'active')
          .order('email');

        if (fallbackError) {
          console.error('❌ Error fetching users (fallback):', fallbackError);
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - TS expects 1 arg, eslint expects 2
          throw new Error('Erro ao buscar usuários: ' + fallbackError.message, { cause: rpcError as Error });
        }

        console.log('✅ Available users fetched (fallback):', fallbackData?.length || 0);
        return fallbackData || [];
      }
    },
  });

  // Create task mutation
  const { mutate: createTask, isPending: isCreating } = useMutation({
    mutationFn: async (taskData: Omit<TaskInsert, 'task_ref' | 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      console.log('🚀 Creating task with data:', taskData);
      
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('❌ Auth error when creating task:', authError);
        throw new Error('Erro de autenticação: ' + authError.message);
      }
      
      if (!user) {
        console.error('❌ No authenticated user found when creating task');
        throw new Error('Usuário não autenticado');
      }
      
      console.log('✅ User authenticated for task creation:', user.email);
      
      // Generate a unique task_ref using timestamp and random string
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const uniqueTaskRef = `TASK-${timestamp}-${randomString}`;
      
      // Prepare the complete task data
      const completeTaskData: TaskInsert = {
        ...taskData,
        created_by: user.id,
        task_ref: uniqueTaskRef, // Use unique task_ref instead of placeholder
      };
      
      console.log('📝 Complete task data for insertion:', completeTaskData);
      
      const { data, error } = await supabase
        .from('tasks')
        .insert(completeTaskData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating task:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw new Error('Erro ao criar tarefa: ' + error.message);
      }

      console.log('✅ Task created successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('🎉 Task creation successful, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa criada com sucesso!');
    },
    onError: (error) => {
      console.error('💥 Task creation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao criar tarefa';
      toast.error(errorMessage);
    },
  });

  // Update task mutation
  const { mutate: updateTask, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TaskUpdate }) => {
      console.log('📝 Updating task:', id, updates);
      
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating task:', error);
        throw new Error('Erro ao atualizar tarefa: ' + error.message);
      }

      console.log('✅ Task updated successfully:', data);
      return data;
    },
    onSuccess: () => {
      console.log('🎉 Task update successful, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('💥 Task update failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar tarefa';
      toast.error(errorMessage);
    },
  });

  // Complete task mutation
  const { mutate: completeTask, isPending: isCompleting } = useMutation({
    mutationFn: async (id: string) => {
      console.log('✅ Completing task:', id);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('tasks')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          completed_by: user.id,
          status: 'concluido'
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error completing task:', error);
        throw new Error('Erro ao concluir tarefa: ' + error.message);
      }

      console.log('✅ Task completed successfully:', data);
      return data;
    },
    onSuccess: () => {
      console.log('🎉 Task completion successful, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa concluída com sucesso!');
    },
    onError: (error) => {
      console.error('💥 Task completion failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao concluir tarefa';
      toast.error(errorMessage);
    },
  });

  // Delete task mutation
  const { mutate: deleteTask, isPending: isDeleting } = useMutation({
    mutationFn: async (id: string) => {
      console.log('🗑️ Deleting task:', id);
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting task:', error);
        throw new Error('Erro ao deletar tarefa: ' + error.message);
      }

      console.log('✅ Task deleted successfully');
    },
    onSuccess: () => {
      console.log('🎉 Task deletion successful, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa deletada com sucesso!');
    },
    onError: (error) => {
      console.error('💥 Task deletion failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao deletar tarefa';
      toast.error(errorMessage);
    },
  });

  // Refetch all tasks function
  const refetchTasks = () => {
    console.log('🔄 Refetching all tasks...');
    refetchActiveTasks();
    refetchRecentCompleted();
    refetchCompletedTasks();
    refetchAssignedCompletedTasks();
  };

  const isLoading = isLoadingActive || isLoadingRecentCompleted || isLoadingCompleted || isLoadingAssignedCompleted;
  
  // Log any query errors
  if (activeTasksError) {
    console.error('❌ Active tasks query error:', activeTasksError);
  }
  if (recentCompletedError) {
    console.error('❌ Recent completed tasks query error:', recentCompletedError);
  }
  if (completedTasksError) {
    console.error('❌ Completed tasks query error:', completedTasksError);
  }
  if (assignedCompletedTasksError) {
    console.error('❌ Assigned completed tasks query error:', assignedCompletedTasksError);
  }

  return {
    activeTasks,
    recentCompletedTasks,
    completedTasks,
    assignedCompletedTasks,
    availableOFs,
    availableUsers,
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    isCreating,
    isUpdating,
    isDeleting,
    isCompleting,
    refetchTasks,
    // Expose errors for debugging
    errors: {
      activeTasksError,
      recentCompletedError,
      completedTasksError,
      assignedCompletedTasksError
    }
  };
};
