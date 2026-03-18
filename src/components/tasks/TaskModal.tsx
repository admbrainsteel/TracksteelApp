
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, X, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';

type Task = Database['public']['Tables']['tasks']['Row'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];

interface TaskModalProps {
  task?: Task | null;
  availableOFs: Array<{ of_number: string; cliente: string }>;
  availableUsers: Array<{ id: string; full_name: string; email: string }>;
  onSave: (data: Omit<TaskInsert, 'task_ref' | 'id' | 'created_at' | 'updated_at' | 'created_by'>) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const taskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  of_number: z.string().min(1, 'OF é obrigatória'),
  assigned_to: z.array(z.string()).optional(),
  due_date: z.date().optional(),
  status: z.enum(['a_fazer', 'em_andamento', 'revisao', 'pendente', 'bloqueado', 'concluido']),
  priority: z.enum(['baixa', 'media', 'alta', 'urgente']),
  category: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

const statusOptions = [
  { value: 'a_fazer', label: 'A Fazer' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'revisao', label: 'Revisão' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'bloqueado', label: 'Bloqueado' },
  { value: 'concluido', label: 'Concluído' },
];

const priorityOptions = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
];

export function TaskModal({ task, availableOFs, availableUsers, onSave, onClose, isLoading }: TaskModalProps) {
  const { user } = useAuth();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<Date>();
  const [allowCustomOF, setAllowCustomOF] = useState(true); // Iniciar marcado

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      of_number: 'ADM-Compras', // Valor padrão
      status: 'a_fazer',
      priority: 'media',
      category: '',
    },
  });

  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        description: task.description || '',
        of_number: task.of_number,
        status: task.status || 'a_fazer',
        priority: task.priority || 'media',
        category: task.category || '',
      });
      setSelectedUsers(task.assigned_to || []);
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      
      // Check if OF exists in available OFs
      const ofExists = availableOFs.some(of => of.of_number === task.of_number);
      setAllowCustomOF(!ofExists);
    } else {
      form.reset({
        title: '',
        description: '',
        of_number: 'ADM-Compras', // Valor padrão para novas tarefas
        status: 'a_fazer',
        priority: 'media',
        category: '',
      });
      setSelectedUsers([]);
      setDueDate(undefined);
      setAllowCustomOF(true); // Sempre marcado para novas tarefas
    }
  }, [task, form, availableOFs]);

  const onSubmit = (data: TaskFormData) => {
    console.log('📝 Form data submitted:', data);
    console.log('👥 Selected users:', selectedUsers);
    console.log('📅 Due date:', dueDate);
    
    const taskData: Omit<TaskInsert, 'task_ref' | 'id' | 'created_at' | 'updated_at' | 'created_by'> = {
      title: data.title,
      description: data.description || null,
      of_number: data.of_number,
      status: data.status,
      priority: data.priority,
      category: data.category || null,
      assigned_to: selectedUsers.length > 0 ? selectedUsers : null,
      due_date: dueDate?.toISOString() || null,
      is_completed: false,
      completed_at: null,
      completed_by: null,
    };

    console.log('📤 Final task data being sent:', taskData);
    onSave(taskData);
  };

  const addUser = (userId: string) => {
    if (!selectedUsers.includes(userId)) {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(id => id !== userId));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>
            {task ? `Editar Tarefa ${task.task_ref}` : 'Nova Tarefa'}
          </DialogTitle>
          {task && (
            <p className="text-slate-400 text-sm">
              ID: {task.task_ref} | OF: {task.of_number}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-slate-300">OF * (Ordem de Fabricação)</Label>
              <div className="space-y-2">
                {!allowCustomOF && availableOFs.length > 0 ? (
                  <Select
                    value={form.watch('of_number')}
                    onValueChange={(value) => form.setValue('of_number', value)}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Selecione uma OF existente" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 max-h-60">
                      {availableOFs.map((of) => (
                        <SelectItem key={of.of_number} value={of.of_number} className="text-white hover:bg-slate-600">
                          {of.of_number} - {of.cliente}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    {...form.register('of_number')}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Digite o número da OF (ex: ADM-Compras)"
                  />
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allowCustomOF"
                    checked={allowCustomOF}
                    onChange={(e) => {
                      setAllowCustomOF(e.target.checked);
                      if (!e.target.checked) {
                        form.setValue('of_number', '');
                      } else {
                        form.setValue('of_number', 'ADM-Compras');
                      }
                    }}
                    className="rounded"
                  />
                  <label htmlFor="allowCustomOF" className="text-sm text-slate-400">
                    Permitir OF customizada (não listada)
                  </label>
                </div>
              </div>
              {form.formState.errors.of_number && (
                <p className="text-red-400 text-sm mt-1">{form.formState.errors.of_number.message}</p>
              )}
            </div>

            <div className="col-span-2">
              <Label className="text-slate-300">Título *</Label>
              <Input
                {...form.register('title')}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Digite o título da tarefa"
              />
              {form.formState.errors.title && (
                <p className="text-red-400 text-sm mt-1">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="col-span-2">
              <Label className="text-slate-300">Descrição</Label>
              <Textarea
                {...form.register('description')}
                className="bg-slate-700 border-slate-600 text-white min-h-[100px]"
                placeholder="Digite a descrição detalhada da tarefa"
              />
            </div>

            <div>
              <Label className="text-slate-300">Status</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(value) => form.setValue('status', value as any)}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value} className="text-white hover:bg-slate-600">
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-300">Prioridade</Label>
              <Select
                value={form.watch('priority')}
                onValueChange={(value) => form.setValue('priority', value as any)}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {priorityOptions.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value} className="text-white hover:bg-slate-600">
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-300">Categoria</Label>
              <Input
                {...form.register('category')}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Ex: Desenvolvimento, Marketing"
              />
            </div>

            <div>
              <Label className="text-slate-300">Prazo</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-slate-700 border-slate-600 text-white hover:bg-slate-600",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP", { locale: ptBR }) : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-slate-700 border-slate-600" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="col-span-2">
              <Label className="text-slate-300">Responsáveis</Label>
              <Select onValueChange={addUser}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Selecione usuários" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {availableUsers
                    .filter(user => !selectedUsers.includes(user.id))
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id} className="text-white hover:bg-slate-600">
                        {user.full_name || user.email}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
              
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedUsers.map((userId) => {
                    const user = availableUsers.find(u => u.id === userId);
                    return (
                      <Badge key={userId} variant="secondary" className="flex items-center gap-1">
                        {user?.full_name || user?.email}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeUser(userId)}
                        />
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
