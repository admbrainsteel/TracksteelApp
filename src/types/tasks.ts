
import { Database } from '@/integrations/supabase/types';

export type Task = Database['public']['Tables']['tasks']['Row'] & {
  assigned_users?: {
    id: string;
    full_name: string;
    email: string;
    profile_image_url?: string;
  }[];
  creator?: {
    id: string;
    full_name: string;
    email: string;
    profile_image_url?: string;
  };
  of?: {
    numero: string;
  };
  task_comments?: Array<{ count: number }>;
  task_attachments?: Array<{ count: number }>;
  task_subtasks?: Array<{ count: number }>;
  creator_profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
    profile_image_url?: string | null;
  };
  assigned_profiles?: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    profile_image_url?: string | null;
  }>;
};

export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

export type TaskStatus = 'a_fazer' | 'em_andamento' | 'revisao' | 'pendente' | 'bloqueado' | 'concluido' | 'comprado';

export type TaskPriority = 'baixa' | 'media' | 'alta' | 'urgente';

export type TaskCategory = 'geral' | 'producao' | 'qualidade' | 'manutencao' | 'compras' | 'vendas' | 'administrativo';

export interface CreateTaskData {
  title: string;
  description?: string;
  assigned_to: string[];
  priority: TaskPriority;
  category: TaskCategory;
  status?: TaskStatus;
  of_number?: string;
  due_date?: string;
}

export interface UpdateTaskData {
  id: string;
  updates: Partial<{
    title: string;
    description: string;
    assigned_to: string[];
    priority: TaskPriority;
    category: TaskCategory;
    status: TaskStatus;
    of_number: string;
    due_date: string;
    is_completed: boolean;
    completed_at: string | null;
    completed_by: string | null;
    updated_at: string;
  }>;
}

export interface TaskFilters {
  of_number?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  assigned_to?: string;
  due_date_range?: 'week' | 'month' | 'overdue' | 'all';
  search?: string;
  task_ref?: string;
}

export interface TaskCounters {
  myPendingTasks: number;
  tasksIAssigned: number;
}
