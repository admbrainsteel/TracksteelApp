
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTasksEnhanced } from '@/hooks/useTasksEnhanced';
import { useAuth } from '@/hooks/useAuth';
import { useSmartPolling } from '@/hooks/useSmartPolling';
import { logger } from '@/utils/logger';
import { memo } from 'react';

interface TaskTypeData {
  name: string;
  value: number;
  color: string;
}

const statusLabels = {
  a_fazer: 'A Fazer',
  em_andamento: 'Em Andamento',
  revisao: 'Revisão',
  pendente: 'Pendente',
  bloqueado: 'Bloqueado',
  concluido: 'Concluída',
};

const statusColors = {
  a_fazer: '#c084fc',
  em_andamento: '#3b82f6',
  revisao: '#eab308',
  pendente: '#6b7280',
  bloqueado: '#ef4444',
  concluido: '#22c55e',
};

export const TaskTypeChart = memo(() => {
  const { user } = useAuth();
  const { fetchMyTasks, fetchAssignedTasks } = useTasksEnhanced();

  const { data: taskTypeData = [], isLoading } = useQuery({
    queryKey: ['dashboard-task-type'],
    queryFn: async (): Promise<TaskTypeData[]> => {
      if (!user) return [];

      try {
        logger.info('Fetching task type data for dashboard');

        const [myTasks, assignedTasks] = await Promise.all([
          fetchMyTasks({}),
          fetchAssignedTasks({})
        ]);

        const allTasks = [...myTasks, ...assignedTasks];
        
        // Contar por status funcional
        const statusCount: Record<string, number> = {
          a_fazer: 0,
          em_andamento: 0,
          revisao: 0,
          pendente: 0,
          bloqueado: 0,
          concluido: 0,
        };

        allTasks.forEach(task => {
          const status = task.status || 'a_fazer';
          if (statusCount.hasOwnProperty(status)) {
            statusCount[status]++;
          }
        });

        const result = Object.entries(statusCount)
          .filter(([_, count]) => count > 0)
          .map(([status, count]) => ({
            name: statusLabels[status as keyof typeof statusLabels],
            value: count,
            color: statusColors[status as keyof typeof statusColors],
          }));

        logger.success('Task type data processed successfully');
        return result;
      } catch (error) {
        logger.error('Error fetching task type data', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 60000, // 1 minuto
    gcTime: 300000, // 5 minutos
    retry: 2,
  });

  // Polling inteligente apenas quando necessário
  useSmartPolling({
    queryKey: ['dashboard-task-type'],
    interval: 120000, // 2 minutos ao invés de 30 segundos
    enabled: !!user,
    onError: (error) => logger.error('Task polling error', error)
  });

  const totalTasks = taskTypeData.reduce((sum, item) => sum + item.value, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição por Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4 text-sm">Carregando dados...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribuição por Status</CardTitle>
        <p className="text-sm text-muted-foreground">Total: {totalTasks}</p>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] flex items-center justify-center">
          {taskTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={taskTypeData}
                margin={{
                  top: 5,
                  right: 10,
                  left: 5,
                  bottom: 25,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--popover-foreground))',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                  {taskTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8 text-sm">Nenhuma tarefa encontrada</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

TaskTypeChart.displayName = 'TaskTypeChart';
