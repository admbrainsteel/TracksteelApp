import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare, UserCheck } from 'lucide-react';
import { TaskCounters as TaskCountersType } from '@/types/tasks';
interface TaskCountersProps {
  counters: TaskCountersType;
  isLoading?: boolean;
}
export function TaskCounters({
  counters,
  isLoading
}: TaskCountersProps) {
  if (isLoading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Minhas Tarefas Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              Carregando...
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Tarefas que Atribuí
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              Carregando...
            </div>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="bg-slate-800/50 border-slate-700">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Minhas Tarefas Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent className="bg-slate-800/50 border-slate-700">
          <div className="text-2xl font-bold text-primary">
            {counters.myPendingTasks}
          </div>
          <p className="text-xs text-muted-foreground">
            tarefas atribuídas a você
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-slate-800/50 border-slate-700">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Tarefas que Atribuí
          </CardTitle>
        </CardHeader>
        <CardContent className="bg-slate-800/50 border-slate-700">
          <div className="text-2xl font-bold text-primary">
            {counters.tasksIAssigned}
          </div>
          <p className="text-xs text-muted-foreground">
            pendentes de outros usuários
          </p>
        </CardContent>
      </Card>
    </div>;
}