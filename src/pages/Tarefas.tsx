
import { useState, useEffect } from 'react';
import { Plus, History, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TaskPanel } from '@/components/tasks/TaskPanel';
import { TaskModal } from '@/components/tasks/TaskModal';
import { useTasksEnhanced } from '@/hooks/useTasksEnhanced';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const Tarefas = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const { createTask, isCreating, availableUsers: enhancedUsers, availableOFs: enhancedOFs } = useTasksEnhanced();

  // Use the existing useTasks hook for legacy support and refetch functionality
  const { refetchTasks } = useTasks();

  // Use enhanced hook data when available, fallback to legacy hook
  const availableUsers = enhancedUsers || [];
  const availableOFs = enhancedOFs || [];

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing tasks...');
      refetchTasks();
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [refetchTasks]);

  // Log user authentication status
  useEffect(() => {
    console.log('👤 Current user:', user?.email || 'Not authenticated');
  }, [user]);

  const handleCreateTask = () => {
    console.log('➕ Opening task creation modal');
    setEditingTask(null);
    setShowModal(true);
  };

  const handleSaveTask = (taskData: any) => {
    console.log('💾 Saving task with data:', taskData);
    
    // Add validation to ensure assigned_to is properly set
    if (taskData.assigned_to && taskData.assigned_to.length > 0) {
      console.log('👥 Task being assigned to users:', taskData.assigned_to);
    } else {
      console.log('⚠️ Task has no assigned users');
    }
    
    createTask(taskData);
    setShowModal(false);
    setEditingTask(null);
  };

  const handleManualRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    refetchTasks();
  };

  // Show authentication warning if user is not logged in
  if (!user) {
    return (
      <div className="space-y-6 p-4 sm:p-6 bg-background min-h-screen">
        <Alert className="bg-destructive/10 border-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-destructive">
            Você precisa estar logado para visualizar as tarefas. 
            <Button 
              variant="link" 
              className="text-destructive hover:text-destructive/80 p-0 ml-2" 
              onClick={() => navigate('/auth')}
            >
              Fazer login
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6 bg-background min-h-screen">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Quadro de Tarefas</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Gerencie todas as suas tarefas ativas e concluídas recentemente, e as que você atribuiu.
            {user && <span className="block sm:inline sm:ml-2 text-muted-foreground/80">Logado como: {user.email}</span>}
          </p>
        </div>
        
        {/* Mobile: Stack buttons vertically */}
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button 
            variant="outline" 
            onClick={handleManualRefresh} 
            className="bg-background border-border text-foreground hover:bg-accent w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/tarefas/historico')} 
            className="bg-background border-border text-foreground hover:bg-accent w-full sm:w-auto"
          >
            <History className="h-4 w-4 mr-2" />
            Ver Histórico
          </Button>
          <Button onClick={handleCreateTask} className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Task Panels */}
      <div className="space-y-6 sm:space-y-8">
        {/* Panel 1: My Tasks */}
        <TaskPanel 
          type="my_tasks" 
          title="Minhas Tarefas" 
          description="Tarefas atribuídas a você que ainda não foram concluídas" 
          availableOFs={availableOFs} 
          availableUsers={availableUsers} 
        />

        {/* Panel 2: My Completed Tasks */}
        <TaskPanel 
          type="my_completed" 
          title="Minhas Tarefas Concluídas" 
          description="Tarefas que você concluiu recentemente" 
          availableOFs={availableOFs} 
          availableUsers={availableUsers} 
        />

        {/* Panel 3: Assigned Tasks */}
        <TaskPanel 
          type="assigned_tasks" 
          title="Tarefas Atribuídas" 
          description="Tarefas que você criou e atribuiu a outros usuários" 
          availableOFs={availableOFs} 
          availableUsers={availableUsers} 
        />
      </div>

      {/* Task Modal */}
      {showModal && (
        <TaskModal 
          task={editingTask} 
          availableOFs={availableOFs} 
          availableUsers={availableUsers} 
          onSave={handleSaveTask} 
          onClose={() => {
            setShowModal(false);
            setEditingTask(null);
          }} 
          isLoading={isCreating} 
        />
      )}
    </div>
  );
};

export default Tarefas;
