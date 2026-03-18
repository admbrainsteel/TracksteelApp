
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskInsert, TaskUpdate, TaskFilters, TaskCounters } from '@/types/tasks';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export const useTasksEnhanced = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Helper function to apply filters to a query
  const applyFilters = (query: any, filters: TaskFilters) => {
    if (filters.of_number) {
      query = query.eq('of_number', filters.of_number);
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.assigned_to) {
      query = query.contains('assigned_to', [filters.assigned_to]);
    }
    if (filters.task_ref) {
      query = query.ilike('task_ref', `%${filters.task_ref}%`);
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,task_ref.ilike.%${filters.search}%`);
    }
    if (filters.due_date_range) {
      const now = new Date();
      switch (filters.due_date_range) {
        case 'week':
          const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          query = query.gte('due_date', now.toISOString()).lte('due_date', nextWeek.toISOString());
          break;
        case 'month':
          const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
          query = query.gte('due_date', now.toISOString()).lte('due_date', nextMonth.toISOString());
          break;
        case 'overdue':
          query = query.lt('due_date', now.toISOString());
          break;
      }
    }
    return query;
  };

  // Fetch "Minhas Tarefas" (tasks assigned to current user, not completed)
  const fetchMyTasks = async (filters: TaskFilters = {}) => {
    if (!user) throw new Error('User not authenticated');

    console.log('🔍 Fetching my tasks with filters:', filters);

    let query = supabase
      .from('tasks')
      .select(`
        *,
        task_comments(count),
        task_attachments(count),
        task_subtasks(count)
      `)
      .contains('assigned_to', [user.id])
      .eq('is_completed', false)
      .is('archived_at', null);

    query = applyFilters(query, filters);
    
    const { data: tasks, error } = await query.order('due_date', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('❌ Error fetching my tasks:', error);
      throw error;
    }

    console.log('✅ My tasks fetched:', tasks?.length || 0, 'tasks');

    // Fetch creator profiles separately to avoid join issues
    const creatorIds = [...new Set(tasks?.map(task => task.created_by).filter(Boolean) || [])];
    
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, profile_image_url')
        .in('id', creatorIds);

      // Combine tasks with creator profiles
      const tasksWithProfiles = tasks?.map(task => ({
        ...task,
        creator_profile: profiles?.find(profile => profile.id === task.created_by) || null
      })) || [];

      return tasksWithProfiles;
    }

    return tasks?.map(task => ({
      ...task,
      creator_profile: null
    })) || [];
  };

  // Fetch "Minhas Tarefas Concluídas" (completed tasks assigned to current user)
  const fetchMyCompletedTasks = async (filters: TaskFilters = {}) => {
    if (!user) throw new Error('User not authenticated');

    console.log('🔍 Fetching my completed tasks with filters:', filters);

    let query = supabase
      .from('tasks')
      .select(`
        *,
        task_comments(count),
        task_attachments(count),
        task_subtasks(count)
      `)
      .contains('assigned_to', [user.id])
      .eq('is_completed', true)
      .is('archived_at', null);

    query = applyFilters(query, filters);

    const { data: tasks, error } = await query.order('completed_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching my completed tasks:', error);
      throw error;
    }

    console.log('✅ My completed tasks fetched:', tasks?.length || 0, 'tasks');

    // Fetch creator profiles separately
    const creatorIds = [...new Set(tasks?.map(task => task.created_by).filter(Boolean) || [])];
    
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, profile_image_url')
        .in('id', creatorIds);

      // Combine tasks with creator profiles
      const tasksWithProfiles = tasks?.map(task => ({
        ...task,
        creator_profile: profiles?.find(profile => profile.id === task.created_by) || null
      })) || [];

      return tasksWithProfiles;
    }

    return tasks?.map(task => ({
      ...task,
      creator_profile: null
    })) || [];
  };

  // Fetch "Tarefas Atribuídas" (tasks created by current user and assigned to others)
  const fetchAssignedTasks = async (filters: TaskFilters = {}) => {
    if (!user) throw new Error('User not authenticated');

    console.log('🔍 Fetching assigned tasks with filters:', filters);

    let query = supabase
      .from('tasks')
      .select(`
        *,
        task_comments(count),
        task_attachments(count),
        task_subtasks(count)
      `)
      .eq('created_by', user.id)
      .is('archived_at', null);

    query = applyFilters(query, filters);

    const { data: tasks, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching assigned tasks:', error);
      throw error;
    }

    console.log('✅ Assigned tasks fetched:', tasks?.length || 0, 'tasks');

    // For assigned tasks, fetch assigned user profiles
    const assignedUserIds = [...new Set(tasks?.flatMap(task => task.assigned_to || []).filter(Boolean) || [])];
    
    if (assignedUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, profile_image_url')
        .in('id', assignedUserIds);

      // Combine tasks with creator and assigned profiles
      const tasksWithProfiles = tasks?.map(task => ({
        ...task,
        creator_profile: { 
          id: user.id, 
          full_name: user.user_metadata?.full_name || null, 
          email: user.email || null, 
          profile_image_url: null 
        },
        assigned_profiles: task.assigned_to?.map(userId => 
          profiles?.find(profile => profile.id === userId) || null
        ).filter(Boolean) || []
      })) || [];

      return tasksWithProfiles;
    }

    return tasks?.map(task => ({
      ...task,
      creator_profile: { 
        id: user.id, 
        full_name: user.user_metadata?.full_name || null, 
        email: user.email || null, 
        profile_image_url: null 
      },
      assigned_profiles: []
    })) || [];
  };

  // Fetch task counters
  const fetchTaskCounters = async (): Promise<TaskCounters> => {
    if (!user) throw new Error('User not authenticated');

    const [myTasksResult, assignedTasksResult] = await Promise.all([
      supabase
        .from('tasks')
        .select('id', { count: 'exact' })
        .contains('assigned_to', [user.id])
        .eq('is_completed', false),
      supabase
        .from('tasks')
        .select('id', { count: 'exact' })
        .eq('created_by', user.id)
        .eq('is_completed', false)
    ]);

    if (myTasksResult.error) throw myTasksResult.error;
    if (assignedTasksResult.error) throw assignedTasksResult.error;

    return {
      myPendingTasks: myTasksResult.count || 0,
      tasksIAssigned: assignedTasksResult.count || 0,
    };
  };

  // Fetch available users - use type assertion for RPC function
  const { data: availableUsers = [] } = useQuery({
    queryKey: ['users-for-tasks'],
    queryFn: async () => {
      console.log('🔍 Fetching available users for tasks...');
      
      if (!user) {
        console.error('❌ No authenticated user');
        throw new Error('Usuário não autenticado');
      }

      console.log('✅ User authenticated for fetching users:', user.email);

      try {
        // Use RPC function to bypass RLS restrictions
        const { data, error } = await supabase.rpc('get_all_users_for_tasks');

        if (error) {
          console.error('❌ Error fetching users via RPC:', error);
          // Fallback to direct query
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('status', 'active')
            .order('full_name', { nullsFirst: false })
            .order('email');

          if (fallbackError) {
            console.error('❌ Error fetching users (fallback):', fallbackError);
            throw new Error('Erro ao buscar usuários: ' + fallbackError.message);
          }

          console.log('✅ Available users fetched (fallback):', fallbackData?.length || 0);
          return fallbackData || [];
        }

        console.log('✅ Available users fetched via RPC:', data?.length || 0);
        return data || [];
      } catch (rpcError) {
        console.error('❌ RPC call failed, using fallback:', rpcError);
        // Fallback to direct query
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('status', 'active')
          .order('full_name', { nullsFirst: false })
          .order('email');

        if (fallbackError) {
          console.error('❌ Error fetching users (fallback):', fallbackError);
          throw new Error('Erro ao buscar usuários: ' + fallbackError.message);
        }

        console.log('✅ Available users fetched (fallback):', fallbackData?.length || 0);
        return fallbackData || [];
      }
    },
    enabled: !!user,
  });

  // Fetch available OFs
  const { data: availableOFs = [] } = useQuery({
    queryKey: ['ofs-for-tasks'],
    queryFn: async () => {
      console.log('🔍 Fetching available OFs for tasks...');
      
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('ficha_tecnica_contratos')
        .select('of_number, cliente')
        .order('of_number');

      if (error) {
        console.error('❌ Error fetching OFs:', error);
        throw error;
      }

      console.log('✅ Available OFs fetched:', data?.length || 0);
      return data || [];
    },
    enabled: !!user,
  });

  // Accept task mutation
  const { mutate: acceptTask, isPending: isAccepting } = useMutation({
    mutationFn: async (taskId: string) => {
      if (!user) throw new Error('User not authenticated');

      console.log('✅ Accepting task:', taskId);

      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: 'em_andamento',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error accepting task:', error);
        throw error;
      }
      
      console.log('✅ Task accepted successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-counters'] });
      toast.success('Tarefa aceita com sucesso!');
    },
    onError: (error) => {
      console.error('❌ Error accepting task:', error);
      toast.error('Erro ao aceitar tarefa');
    },
  });

  // Create task mutation
  const { mutate: createTask, isPending: isCreating } = useMutation({
    mutationFn: async (taskData: Omit<TaskInsert, 'task_ref' | 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      if (!user) throw new Error('User not authenticated');

      console.log('📝 Creating task with data:', taskData);

      // Generate a unique task_ref using timestamp and random string
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const uniqueTaskRef = `TASK-${timestamp}-${randomString}`;

      const completeTaskData: TaskInsert = {
        ...taskData,
        created_by: user.id,
        task_ref: uniqueTaskRef, // Use unique task_ref instead of placeholder
      };

      console.log('📤 Sending complete task data to database:', completeTaskData);

      const { data, error } = await supabase
        .from('tasks')
        .insert(completeTaskData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating task in database:', error);
        throw error;
      }
      
      console.log('✅ Task created successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('🎉 Task creation successful, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-counters'] });
      toast.success(`Tarefa ${data.task_ref} criada com sucesso!`);
      
      // Force refresh of assigned tasks specifically
      setTimeout(() => {
        console.log('🔄 Force refreshing assigned tasks...');
        queryClient.invalidateQueries({ queryKey: ['tasks', 'assigned_tasks'] });
      }, 500);
    },
    onError: (error) => {
      console.error('❌ Error creating task:', error);
      toast.error('Erro ao criar tarefa. Verifique os dados e tente novamente.');
    },
  });

  // Update task mutation
  const { mutate: updateTask, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TaskUpdate }) => {
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
      queryClient.invalidateQueries({ queryKey: ['task-counters'] });
      toast.success('Tarefa atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      toast.error('Erro ao atualizar tarefa');
    },
  });

  // Complete task mutation
  const { mutate: completeTask, isPending: isCompleting } = useMutation({
    mutationFn: async (id: string) => {
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

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-counters'] });
      toast.success('Tarefa concluída com sucesso!');
    },
    onError: (error) => {
      console.error('Error completing task:', error);
      toast.error('Erro ao concluir tarefa');
    },
  });

  // Archive task mutation
  const { mutate: archiveTask, isPending: isArchiving } = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('tasks')
        .update({
          archived_at: new Date().toISOString(),
          archived_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-counters'] });
      toast.success('Tarefa arquivada com sucesso!');
    },
    onError: (error) => {
      console.error('Error archiving task:', error);
      toast.error('Erro ao arquivar tarefa');
    },
  });

  // Delete task mutation
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
      queryClient.invalidateQueries({ queryKey: ['task-counters'] });
      toast.success('Tarefa deletada com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast.error('Erro ao deletar tarefa');
    },
  });

  return {
    fetchMyTasks,
    fetchMyCompletedTasks,
    fetchAssignedTasks,
    fetchTaskCounters,
    availableUsers,
    availableOFs,
    acceptTask,
    createTask,
    updateTask,
    completeTask,
    archiveTask,
    deleteTask,
    isAccepting,
    isCreating,
    isUpdating,
    isCompleting,
    isArchiving,
    isDeleting,
  };
};
