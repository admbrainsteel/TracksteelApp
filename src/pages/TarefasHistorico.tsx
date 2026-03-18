
import { useState } from 'react';
import { ArrowLeft, Calendar, Filter, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TaskCard } from '@/components/tasks/TaskCard';
import { useTasks } from '@/hooks/useTasks';
import { Database } from '@/integrations/supabase/types';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Task = Database['public']['Tables']['tasks']['Row'];

const TarefasHistorico = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  const { completedTasks, assignedCompletedTasks, isLoading } = useTasks();

  // Filter tasks based on search and filters
  const filterTasks = (tasks: Task[]) => tasks.filter(task => {
    const matchesSearch = searchTerm === '' || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.of_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchesCategory = filterCategory === 'all' || task.category === filterCategory;

    return matchesSearch && matchesPriority && matchesCategory;
  });

  const filteredCompletedTasks = filterTasks(completedTasks);
  const filteredAssignedTasks = filterTasks(assignedCompletedTasks);

  // Group tasks by OF
  const groupTasksByOF = (tasks: Task[]) => {
    const grouped = tasks.reduce((acc, task) => {
      const ofNumber = task.of_number;
      if (!acc[ofNumber]) {
        acc[ofNumber] = [];
      }
      acc[ofNumber].push(task);
      return acc;
    }, {} as Record<string, Task[]>);

    // Sort tasks within each OF group by completion date (most recent first)
    Object.keys(grouped).forEach(ofNumber => {
      grouped[ofNumber].sort((a, b) => {
        if (!a.completed_at || !b.completed_at) return 0;
        return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
      });
    });

    return grouped;
  };

  const completedTasksByOF = groupTasksByOF(filteredCompletedTasks);
  const assignedTasksByOF = groupTasksByOF(filteredAssignedTasks);

  // Get unique categories for filter
  const allTasks = [...completedTasks, ...assignedCompletedTasks];
  const categories = Array.from(new Set(allTasks.map(task => task.category).filter(Boolean)));

  const handleTaskClick = (task: Task) => {
    console.log('Task clicked:', task.id);
    // TODO: Navigate to task details page
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">Histórico de Tarefas</h1>
          <p className="text-slate-600 dark:text-slate-400">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/tarefas')}
            className="bg-slate-50 border-slate-300 text-slate-900 hover:bg-slate-100
                       dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:hover:bg-slate-600 w-fit"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">Histórico de Tarefas</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">Visualize todas as tarefas concluídas nos últimos 30 dias.</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-slate-100 border-slate-300 dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-slate-800 dark:text-white text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-slate-700 dark:text-slate-300 text-sm">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Título, OF ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-slate-700 dark:text-slate-300 text-sm">Prioridade</label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="bg-white border-slate-300 text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-300 dark:bg-slate-700 dark:border-slate-600">
                  <SelectItem value="all" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600">Todas</SelectItem>
                  <SelectItem value="urgente" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600">Urgente</SelectItem>
                  <SelectItem value="alta" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600">Alta</SelectItem>
                  <SelectItem value="media" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600">Média</SelectItem>
                  <SelectItem value="baixa" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-slate-700 dark:text-slate-300 text-sm">Categoria</label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="bg-white border-slate-300 text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-300 dark:bg-slate-700 dark:border-slate-600">
                  <SelectItem value="all" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600">Todas</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setFilterPriority('all');
                  setFilterCategory('all');
                }}
                className="bg-white border-slate-300 text-slate-700 hover:bg-slate-100 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:hover:bg-slate-600 w-full"
              >
                <Filter className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks History with Tabs */}
      <Card className="bg-white border-slate-300 shadow-sm dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-slate-900 dark:text-white">
            Histórico de Tarefas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs defaultValue="completed" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-50 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600">
              <TabsTrigger
                value="completed"
                className="text-slate-700 dark:text-white rounded-md border border-transparent
                           data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border-slate-300
                           dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:border-slate-600 transition-colors"
              >
                Tarefas que Conclui ({filteredCompletedTasks.length})
              </TabsTrigger>
              <TabsTrigger
                value="assigned"
                className="text-slate-700 dark:text-white rounded-md border border-transparent
                           data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border-slate-300
                           dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:border-slate-600 transition-colors"
              >
                Tarefas que Atribui ({filteredAssignedTasks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="completed" className="space-y-4">
              {Object.keys(completedTasksByOF).length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg mb-2">Nenhuma tarefa encontrada</p>
                  <p className="text-slate-500 text-sm">
                    {searchTerm || filterPriority !== 'all' || filterCategory !== 'all' 
                      ? 'Tente ajustar os filtros para ver mais resultados.'
                      : 'Não há tarefas que você concluiu nos últimos 30 dias.'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(completedTasksByOF).map(([ofNumber, tasks]) => (
                    <div key={ofNumber} className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 pb-2 border-b border-slate-300 dark:border-slate-600">
                        <h3 className="text-slate-900 dark:text-white font-medium">OF: {ofNumber}</h3>
                        <span className="text-slate-600 dark:text-slate-400 text-sm">
                          ({tasks.length} {tasks.length === 1 ? 'tarefa concluída' : 'tarefas concluídas'})
                        </span>
                      </div>
                      <div className="grid gap-3">
                        {tasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onEdit={() => {}}
                            onComplete={() => {}}
                            onDelete={() => {}}
                            onClick={handleTaskClick}
                            onView={handleTaskClick}
                            isCompleted={true}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="assigned" className="space-y-4">
              {Object.keys(assignedTasksByOF).length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg mb-2">Nenhuma tarefa encontrada</p>
                  <p className="text-slate-500 text-sm">
                    {searchTerm || filterPriority !== 'all' || filterCategory !== 'all' 
                      ? 'Tente ajustar os filtros para ver mais resultados.'
                      : 'Não há tarefas que você atribuiu e foram concluídas nos últimos 30 dias.'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(assignedTasksByOF).map(([ofNumber, tasks]) => (
                    <div key={ofNumber} className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 pb-2 border-b border-slate-300 dark:border-slate-600">
                        <h3 className="text-slate-900 dark:text-white font-medium">OF: {ofNumber}</h3>
                        <span className="text-slate-600 dark:text-slate-400 text-sm">
                          ({tasks.length} {tasks.length === 1 ? 'tarefa atribuída concluída' : 'tarefas atribuídas concluídas'})
                        </span>
                      </div>
                      <div className="grid gap-3">
                        {tasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onEdit={() => {}}
                            onComplete={() => {}}
                            onDelete={() => {}}
                            onClick={handleTaskClick}
                            onView={handleTaskClick}
                            isCompleted={true}
                            showCreator={true}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default TarefasHistorico;
