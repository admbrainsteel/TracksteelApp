import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Task } from '@/types/tasks';

interface TaskViewModalProps {
  task: Task | null;
  onClose: () => void;
  onEdit?: (task: Task) => void;
}

const statusLabels = {
  a_fazer: 'A Fazer',
  em_andamento: 'Em Andamento',
  revisao: 'Revisão',
  pendente: 'Pendente',
  bloqueado: 'Bloqueado',
  concluido: 'Concluído'
};

const priorityLabels = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente'
};

const getPriorityBadgeColor = (priority: string) => {
  switch (priority) {
    case 'urgente':
      return 'bg-red-500 text-white border-red-500';
    case 'alta':
      return 'bg-orange-500 text-white border-orange-500';
    case 'media':
      return 'bg-yellow-500 text-white border-yellow-500';
    case 'baixa':
      return 'bg-blue-400 text-white border-blue-400';
    default:
      return 'bg-gray-500 text-white border-gray-500';
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'concluido':
      return 'bg-green-500 text-white border-green-500';
    case 'em_andamento':
      return 'bg-blue-500 text-white border-blue-500';
    case 'revisao':
      return 'bg-purple-500 text-white border-purple-500';
    case 'pendente':
      return 'bg-yellow-500 text-white border-yellow-500';
    case 'bloqueado':
      return 'bg-red-500 text-white border-red-500';
    default:
      return 'bg-gray-500 text-white border-gray-500';
  }
};

export function TaskViewModal({ task, onClose, onEdit }: TaskViewModalProps) {
  if (!task) return null;

  const priorityBadgeColor = getPriorityBadgeColor(task.priority || 'media');
  const statusBadgeColor = getStatusBadgeColor(task.status || 'a_fazer');

  return (
    <Dialog open={!!task} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              Detalhes da Tarefa - {task.task_ref}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>OF: {task.of_number}</span>
            {task.revision && task.revision > 1 && (
              <Badge variant="outline" className="text-xs">
                Revisão {task.revision}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Priority */}
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <label className="text-slate-300 text-sm">Status</label>
              <Badge className={`${statusBadgeColor}`}>
                {statusLabels[task.status || 'a_fazer']}
              </Badge>
            </div>
            <div className="space-y-1">
              <label className="text-slate-300 text-sm">Prioridade</label>
              <Badge className={`${priorityBadgeColor}`}>
                {priorityLabels[task.priority || 'media']}
              </Badge>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-slate-300 text-sm font-medium">Título</label>
            <p className="text-white text-lg">{task.title}</p>
          </div>

          {/* Description */}
          {task.description && (
            <div className="space-y-2">
              <label className="text-slate-300 text-sm font-medium">Descrição</label>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-white whitespace-pre-wrap">{task.description}</p>
              </div>
            </div>
          )}

          {/* Category */}
          {task.category && (
            <div className="space-y-2">
              <label className="text-slate-300 text-sm font-medium">Categoria</label>
              <p className="text-white">{task.category}</p>
            </div>
          )}

          {/* Due Date */}
          {task.due_date && (
            <div className="space-y-2">
              <label className="text-slate-300 text-sm font-medium">Prazo</label>
              <p className="text-white">
                {format(new Date(task.due_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          )}

          {/* Assigned Users */}
          {task.assigned_profiles && task.assigned_profiles.length > 0 && (
            <div className="space-y-2">
              <label className="text-slate-300 text-sm font-medium">Responsáveis</label>
              <div className="flex flex-wrap gap-2">
                {task.assigned_profiles.map((profile) => (
                  <div key={profile.id} className="flex items-center gap-2 bg-slate-700/50 rounded-lg p-2">
                    <UserAvatar 
                      imageUrl={profile.profile_image_url || undefined} 
                      name={profile.full_name} 
                      email={profile.email} 
                      size="sm" 
                    />
                    <span className="text-white text-sm">{profile.full_name || profile.email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Creator */}
          {task.creator_profile && (
            <div className="space-y-2">
              <label className="text-slate-300 text-sm font-medium">Criado por</label>
              <div className="flex items-center gap-2">
                <UserAvatar 
                  imageUrl={task.creator_profile.profile_image_url || undefined} 
                  name={task.creator_profile.full_name} 
                  email={task.creator_profile.email} 
                  size="sm" 
                />
                <span className="text-white">{task.creator_profile.full_name || task.creator_profile.email}</span>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <label className="text-slate-300">Criado em</label>
              <p className="text-white">
                {format(new Date(task.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            {task.updated_at && task.updated_at !== task.created_at && (
              <div className="space-y-1">
                <label className="text-slate-300">Atualizado em</label>
                <p className="text-white">
                  {format(new Date(task.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            )}
            {task.completed_at && (
              <div className="space-y-1">
                <label className="text-slate-300">Concluído em</label>
                <p className="text-white">
                  {format(new Date(task.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-slate-600">
            {onEdit && (
              <Button 
                onClick={() => onEdit(task)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Editar Tarefa
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}