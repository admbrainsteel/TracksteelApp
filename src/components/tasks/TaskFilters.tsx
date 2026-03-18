import { useState } from 'react';
import { Filter, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { TaskFilters as TaskFiltersType } from '@/types/tasks';
interface TaskFiltersProps {
  filters: TaskFiltersType;
  onFiltersChange: (filters: TaskFiltersType) => void;
  availableOFs: Array<{
    of_number: string;
    cliente: string;
  }>;
  availableUsers?: Array<{
    id: string;
    full_name: string;
    email: string;
  }>;
  showAssignedToFilter?: boolean;
}
const statusOptions = [{
  value: 'a_fazer',
  label: 'A Fazer'
}, {
  value: 'em_andamento',
  label: 'Em Andamento'
}, {
  value: 'revisao',
  label: 'Revisão'
}, {
  value: 'pendente',
  label: 'Pendente'
}, {
  value: 'bloqueado',
  label: 'Bloqueado'
}, {
  value: 'concluido',
  label: 'Concluído'
}];
const priorityOptions = [{
  value: 'baixa',
  label: 'Baixa'
}, {
  value: 'media',
  label: 'Média'
}, {
  value: 'alta',
  label: 'Alta'
}, {
  value: 'urgente',
  label: 'Urgente'
}];
const dueDateRangeOptions = [{
  value: 'all',
  label: 'Todas'
}, {
  value: 'week',
  label: 'Próxima semana'
}, {
  value: 'month',
  label: 'Próximo mês'
}, {
  value: 'overdue',
  label: 'Em atraso'
}];
export function TaskFilters({
  filters,
  onFiltersChange,
  availableOFs,
  availableUsers = [],
  showAssignedToFilter = false
}: TaskFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [taskRefSearch, setTaskRefSearch] = useState(filters.task_ref || '');
  const updateFilters = (newFilters: Partial<TaskFiltersType>) => {
    onFiltersChange({
      ...filters,
      ...newFilters
    });
  };
  const clearFilters = () => {
    setSearchTerm('');
    setTaskRefSearch('');
    onFiltersChange({});
  };
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({
      search: searchTerm.trim() || undefined
    });
  };
  const handleTaskRefSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({
      task_ref: taskRefSearch.trim() || undefined
    });
  };
  const activeFiltersCount = Object.values(filters).filter(value => value !== undefined && value !== '' && value !== 'all').length;
  return <div className="space-y-4">
      {/* Search Bars */}
      {/* Filter Toggle and Active Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-xs mx-0 py-0 px-[10px] font-normal rounded-sm
                         bg-slate-50 border-slate-300 text-slate-900 hover:bg-slate-100 hover:border-slate-400
                         dark:bg-sky-950 dark:border-slate-600 dark:text-slate-50 dark:hover:bg-sky-800"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {activeFiltersCount > 0 && <Badge variant="secondary" className="ml-2 bg-blue-600 text-white">
                  {activeFiltersCount}
                </Badge>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 bg-slate-800 border-slate-700" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-white">Filtros</h4>
                {activeFiltersCount > 0 && <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-400 hover:text-white">
                    Limpar
                  </Button>}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1 block">OF</label>
                  <Select value={filters.of_number || 'all'} onValueChange={value => updateFilters({
                  of_number: value === 'all' ? undefined : value
                })}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Todas as OFs" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 max-h-60">
                      <SelectItem value="all" className="text-white hover:bg-slate-600">Todas as OFs</SelectItem>
                      {availableOFs.map(of => <SelectItem key={of.of_number} value={of.of_number} className="text-white hover:bg-slate-600">
                          {of.of_number} - {of.cliente}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1 block">Status</label>
                  <Select value={filters.status || 'all'} onValueChange={value => updateFilters({
                  status: value === 'all' ? undefined : value as any
                })}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="all" className="text-white hover:bg-slate-600">Todos os status</SelectItem>
                      {statusOptions.map(status => <SelectItem key={status.value} value={status.value} className="text-white hover:bg-slate-600">
                          {status.label}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1 block">Prioridade</label>
                  <Select value={filters.priority || 'all'} onValueChange={value => updateFilters({
                  priority: value === 'all' ? undefined : value as any
                })}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Todas as prioridades" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="all" className="text-white hover:bg-slate-600">Todas as prioridades</SelectItem>
                      {priorityOptions.map(priority => <SelectItem key={priority.value} value={priority.value} className="text-white hover:bg-slate-600">
                          {priority.label}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1 block">Prazo</label>
                  <Select value={filters.due_date_range || 'all'} onValueChange={value => updateFilters({
                  due_date_range: value === 'all' ? undefined : value as any
                })}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {dueDateRangeOptions.map(option => <SelectItem key={option.value} value={option.value} className="text-white hover:bg-slate-600">
                          {option.label}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {showAssignedToFilter && availableUsers.length > 0 && <div>
                    <label className="text-sm font-medium text-slate-300 mb-1 block">Atribuído para</label>
                    <Select value={filters.assigned_to || 'all'} onValueChange={value => updateFilters({
                  assigned_to: value === 'all' ? undefined : value
                })}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Todos os usuários" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="all" className="text-white hover:bg-slate-600">Todos os usuários</SelectItem>
                        {availableUsers.map(user => <SelectItem key={user.id} value={user.id} className="text-white hover:bg-slate-600">
                            {user.full_name || user.email}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Display Active Filters */}
        {filters.of_number && <Badge variant="secondary" className="flex items-center gap-1">
            OF: {filters.of_number}
            <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilters({
          of_number: undefined
        })} />
          </Badge>}
        
        {filters.status && <Badge variant="secondary" className="flex items-center gap-1">
            Status: {statusOptions.find(s => s.value === filters.status)?.label}
            <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilters({
          status: undefined
        })} />
          </Badge>}

        {filters.priority && <Badge variant="secondary" className="flex items-center gap-1">
            Prioridade: {priorityOptions.find(p => p.value === filters.priority)?.label}
            <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilters({
          priority: undefined
        })} />
          </Badge>}

        {filters.task_ref && <Badge variant="secondary" className="flex items-center gap-1">
            ID: {filters.task_ref}
            <X className="h-3 w-3 cursor-pointer" onClick={() => {
          setTaskRefSearch('');
          updateFilters({
            task_ref: undefined
          });
        }} />
          </Badge>}

        {filters.search && <Badge variant="secondary" className="flex items-center gap-1">
            Busca: {filters.search}
            <X className="h-3 w-3 cursor-pointer" onClick={() => {
          setSearchTerm('');
          updateFilters({
            search: undefined
          });
        }} />
          </Badge>}
      </div>
    </div>;
}