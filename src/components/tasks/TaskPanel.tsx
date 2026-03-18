
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskCard } from './TaskCard';
import { TaskFilters } from './TaskFilters';
import { AcceptTaskButton } from './AcceptTaskButton';
import { TaskModal } from './TaskModal';
import { TaskViewModal } from './TaskViewModal';
import { useTasksEnhanced } from '@/hooks/useTasksEnhanced';
import { useAuth } from '@/hooks/useAuth';
import { Task, TaskFilters as TaskFiltersType } from '@/types/tasks';

interface TaskPanelProps {
  type: 'my_tasks' | 'my_completed' | 'assigned_tasks';
  title: string;
  description?: string;
  availableOFs: Array<{ of_number: string; cliente: string }>;
  availableUsers?: Array<{ id: string; full_name: string; email: string }>;
}

export function TaskPanel({ type, title, description, availableOFs, availableUsers }: TaskPanelProps) {
  const { user } = useAuth();
  const { fetchMyTasks, fetchMyCompletedTasks, fetchAssignedTasks, acceptTask, updateTask, archiveTask, isAccepting, isUpdating, isArchiving } = useTasksEnhanced();
  const [filters, setFilters] = useState<TaskFiltersType>({});
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  const fetchFunction = async (filters: TaskFiltersType): Promise<Task[]> => {
    if (type === 'my_tasks') {
      const tasks = await fetchMyTasks(filters);
      return tasks.map(task => ({
        ...task,
        assigned_profiles: []
      }));
    } else if (type === 'my_completed') {
      const tasks = await fetchMyCompletedTasks(filters);
      return tasks.map(task => ({
        ...task,
        assigned_profiles: []
      }));
    } else {
      return await fetchAssignedTasks(filters);
    }
  };

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks', type, filters],
    queryFn: () => fetchFunction(filters),
    enabled: !!user,
  });

  const sortTasks = (tasks: Task[]) => {
    return tasks.sort((a, b) => {
      // First by due date (nulls last)
      if (a.due_date && !b.due_date) return -1;
      if (!a.due_date && b.due_date) return 1;
      if (a.due_date && b.due_date) {
        const dateCompare = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        if (dateCompare !== 0) return dateCompare;
      }
      // Then by priority
      const priorityOrder = { urgente: 0, alta: 1, media: 2, baixa: 3 };
      return priorityOrder[a.priority || 'media'] - priorityOrder[b.priority || 'media'];
    });
  };

  const handleAcceptTask = (taskId: string) => {
    acceptTask(taskId);
  };

  const handleEditTask = (task: Task) => {
    console.log('Edit task:', task.id);
    setEditingTask(task);
  };

  const handleCompleteTask = (taskId: string) => {
    console.log('Complete task:', taskId);
    // This is now handled by the TaskCard component
  };

  const handleDeleteTask = (taskId: string) => {
    console.log('Delete task:', taskId);
    // This is now handled by the TaskCard component
  };

  const handleTaskClick = (task: Task) => {
    console.log('Task clicked:', task.id);
    // TODO: Open task details modal
  };

  const handleViewTask = (task: Task) => {
    console.log('View task:', task.id);
    setViewingTask(task);
  };

  const handleArchiveTask = (taskId: string) => {
    console.log('Archive task:', taskId);
    archiveTask(taskId);
  };

  const handleSaveTask = (taskData: any) => {
    if (editingTask) {
      updateTask({ 
        id: editingTask.id, 
        updates: taskData 
      });
      setEditingTask(null);
    }
  };

  const handleCloseEditModal = () => {
    setEditingTask(null);
  };

  const handleCloseViewModal = () => {
    setViewingTask(null);
  };

  if (isLoading) {
    return (
      <Card className="bg-white border-slate-300 shadow-sm dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-slate-900 dark:text-white text-lg sm:text-xl">{title}</CardTitle>
          {description && <p className="text-slate-600 dark:text-slate-400 text-sm">{description}</p>}
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 dark:text-slate-400 text-center py-8">Carregando tarefas...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border-slate-300 shadow-sm dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-slate-900 dark:text-white text-lg sm:text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 dark:text-red-400 text-center py-8">Erro ao carregar tarefas</p>
        </CardContent>
      </Card>
    );
  }

  const sortedTasks = sortTasks(tasks);

  return (
    <Card className="bg-white border-slate-300 shadow-sm dark:bg-slate-800/50 dark:border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-slate-900 dark:text-white text-lg sm:text-xl">{title}</CardTitle>
            {description && <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">{description}</p>}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <TaskFilters
              filters={filters}
              onFiltersChange={setFilters}
              availableOFs={availableOFs}
              availableUsers={availableUsers}
              showAssignedToFilter={type === 'assigned_tasks'}
            />
            <span className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
              {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-600 dark:text-slate-400">Nenhuma tarefa encontrada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3">
            {sortedTasks.map((task) => (
              <div key={task.id} className="space-y-2">
                <TaskCard
                  task={task}
                  onEdit={handleEditTask}
                  onComplete={handleCompleteTask}
                  onDelete={handleDeleteTask}
                  onClick={handleTaskClick}
                  onView={handleViewTask}
                  onArchive={handleArchiveTask}
                  isCompleted={type === 'my_completed'}
                  showCreator={type === 'my_tasks' || type === 'my_completed'}
                  canArchive={type === 'assigned_tasks'}
                />
                {type === 'my_tasks' && task.status === 'a_fazer' && (
                  <div className="ml-2 sm:ml-4">
                    <AcceptTaskButton
                      taskId={task.id}
                      onAccept={handleAcceptTask}
                      isLoading={isAccepting}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {editingTask && (
        <TaskModal
          task={editingTask}
          availableOFs={availableOFs}
          availableUsers={availableUsers || []}
          onSave={handleSaveTask}
          onClose={handleCloseEditModal}
          isLoading={isUpdating}
        />
      )}

      {viewingTask && (
        <TaskViewModal
          task={viewingTask}
          onClose={handleCloseViewModal}
          onEdit={type === 'assigned_tasks' ? handleEditTask : undefined}
        />
      )}
    </Card>
  );
}
