
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const data = [
  { name: 'Pendente', value: 0, color: '#f59e0b' },
  { name: 'Em Progresso', value: 0, color: '#3b82f6' },
  { name: 'Concluída', value: 0, color: '#10b981' },
  { name: 'Cancelada', value: 0, color: '#ef4444' },
];

export function TaskStatusChart() {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Status das Tarefas</CardTitle>
        <p className="text-sm text-muted-foreground">Total: {total}</p>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] flex items-center justify-center">
          {total === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma tarefa encontrada</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
