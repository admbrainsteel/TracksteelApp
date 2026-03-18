
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, MessageCircle, Paperclip, Edit, Trash2, MoreHorizontal, CheckSquare, Play, Eye, Archive } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/ui/user-avatar';
import { DeleteTaskDialog } from './DeleteTaskDialog';
import { useTaskActions } from '@/hooks/useTaskActions';
import { getTaskBorderColor, getStatusBadgeColor } from '@/utils/taskStatusColors';
import { Task } from '@/types/tasks';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (task: Task) => void;
  onView: (task: Task) => void;
  onArchive?: (id: string) => void;
  isCompleted?: boolean;
  showCreator?: boolean;
  canArchive?: boolean;
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

const getPriorityBorderColor = (priority: string) => {
  switch (priority) {
    case 'urgente':
      return 'border-l-red-500';
    case 'alta':
      return 'border-l-orange-500';
    case 'media':
      return 'border-l-yellow-500';
    case 'baixa':
      return 'border-l-blue-400';
    default:
      return 'border-l-gray-500';
  }
};

const getTaskRefColor = (task: Task): string => {
  // Verde para tarefas concluídas
  if (task.is_completed || task.status === 'concluido') {
    return 'text-green-500';
  }

  // Lilás claro para tarefas aguardando aceite
  if (task.status === 'a_fazer') {
    return 'text-purple-300';
  }

  // Se não tem prazo, usar azul claro
  if (!task.due_date) {
    return 'text-blue-300';
  }

  const now = new Date();
  const dueDate = new Date(task.due_date);
  const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Vermelho para tarefas vencidas
  if (daysDiff < 0) {
    return 'text-red-500';
  }

  // Laranja para tarefas com menos de 2 dias
  if (daysDiff < 2) {
    return 'text-orange-500';
  }

  // Amarelo para tarefas entre 2 e 5 dias
  if (daysDiff <= 5) {
    return 'text-yellow-500';
  }

  // Azul claro para tarefas com mais de 5 dias
  return 'text-blue-300';
};

// Fundo suave no modo claro de acordo com a prioridade (cor da borda)
const getPriorityBgTintLight = (priority: string) => {
  switch (priority) {
    case 'urgente':
      return 'bg-red-50';
    case 'alta':
      return 'bg-orange-50';
    case 'media':
      return 'bg-yellow-50';
    case 'baixa':
      return 'bg-blue-50';
    default:
      return 'bg-slate-50';
  }
};

// Borda fina do card (em todo o contorno) para claro e escuro
const getPriorityFullBorderColor = (priority: string) => {
  switch (priority) {
    case 'urgente':
      return 'border-red-500 dark:border-red-400/60';
    case 'alta':
      return 'border-orange-500 dark:border-orange-400/60';
    case 'media':
      return 'border-yellow-500 dark:border-yellow-400/60';
    case 'baixa':
      return 'border-blue-400 dark:border-blue-300/60';
    default:
      return 'border-slate-300 dark:border-slate-600/60';
  }
};

export function TaskCard({
  task,
  onEdit,
  onComplete,
  onDelete,
  onClick,
  onView,
  onArchive,
  isCompleted,
  showCreator = false,
  canArchive = false
}: TaskCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const {
    updateTaskStatus,
    deleteTask,
    canEdit,
    canDelete,
    canMarkComplete,
    isUpdatingStatus,
    isDeleting
  } = useTaskActions();

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.is_completed;
  const commentsCount = task.task_comments?.[0]?.count || 0;
  const attachmentsCount = task.task_attachments?.[0]?.count || 0;
  const subtasksCount = task.task_subtasks?.[0]?.count || 0;
  const borderColor = getTaskBorderColor(task);
  const statusBadgeColor = getStatusBadgeColor(task.status || 'a_fazer');
  const taskRefColor = getTaskRefColor(task);
  const priorityBadgeColor = getPriorityBadgeColor(task.priority || 'media');
  const priorityBorderColor = getPriorityBorderColor(task.priority || 'media');

  const handleStatusChange = (status: string) => {
    updateTaskStatus({
      id: task.id,
      status
    });
  };

  const handleDelete = () => {
    deleteTask(task.id);
    setShowDeleteDialog(false);
  };

  const displayProfile = showCreator ? task.creator_profile : task.assigned_profiles?.[0];

  return (
    <>
      <Card 
        className={`
          cursor-pointer transition-all
          border ${getPriorityFullBorderColor(task.priority || 'media')}
          border-l-4 sm:border-l-8 ${priorityBorderColor}
          ${getPriorityBgTintLight(task.priority || 'media')} dark:bg-card
          shadow-sm hover:shadow-lg dark:shadow-md dark:hover:shadow-xl
          ${isCompleted ? 'opacity-80' : ''}
        `}
        onClick={() => onClick(task)}
      >
        <CardContent className="p-2 sm:p-3 space-y-1">
          {/* Mobile Layout: Stack everything vertically */}
          <div className="block sm:hidden">
            {/* Row 1: Task Ref and Priority */}
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-medium ${taskRefColor}`}>
                {task.task_ref}
              </span>
              <Badge className={`text-xs px-1 py-0 ${priorityBadgeColor}`}>
                {priorityLabels[task.priority || 'media']}
              </Badge>
            </div>

            {/* Row 2: OF Number */}
            <div className="text-xs text-muted-foreground mb-1">
              OF: {task.of_number}
            </div>

            {/* Row 3: Title */}
            <h3 className={`text-xs font-semibold mb-1 text-card-foreground leading-tight ${isCompleted ? 'line-through' : ''}`}>
              {task.title}
            </h3>

            {/* Row 4: Status and Due Date */}
            <div className="flex items-center justify-between mb-1">
              <Badge className={`text-xs px-1 py-0 border ${statusBadgeColor}`}>
                {statusLabels[task.status || 'a_fazer']}
              </Badge>
              {task.due_date && (
                <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                  <Clock className="h-2 w-2" />
                  <span>{format(new Date(task.due_date), 'dd/MM', { locale: ptBR })}</span>
                </div>
              )}
            </div>

            {/* Row 5: Bottom row with activities, category, profile and menu */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Activity indicators */}
                <div className="flex items-center gap-1">
                  {commentsCount > 0 && (
                    <div className="flex items-center gap-0.5 text-muted-foreground">
                      <MessageCircle className="h-2 w-2" />
                      <span className="text-xs">{commentsCount}</span>
                    </div>
                  )}
                  
                  {attachmentsCount > 0 && (
                    <div className="flex items-center gap-0.5 text-muted-foreground">
                      <Paperclip className="h-2 w-2" />
                      <span className="text-xs">{attachmentsCount}</span>
                    </div>
                  )}

                  {subtasksCount > 0 && (
                    <div className="flex items-center gap-0.5 text-muted-foreground">
                      <CheckSquare className="h-2 w-2" />
                      <span className="text-xs">{subtasksCount}</span>
                    </div>
                  )}
                </div>

                {/* Category */}
                {task.category && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    {task.category}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1">
                {displayProfile && (
                  <UserAvatar 
                    imageUrl={displayProfile.profile_image_url || undefined} 
                    name={displayProfile.full_name} 
                    email={displayProfile.email} 
                    size="sm" 
                    className="h-9 w-9"
                  />
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                      <MoreHorizontal className="h-2 w-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                    <DropdownMenuItem onClick={e => {
                      e.stopPropagation();
                      onView(task);
                    }}>
                      <Eye className="h-4 w-4 mr-2" />
                      Visualizar Detalhes
                    </DropdownMenuItem>
                    
                    {canEdit(task) && (
                      <DropdownMenuItem onClick={e => {
                        e.stopPropagation();
                        onEdit(task);
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    
                    {canMarkComplete(task) && !task.is_completed && (
                      <>
                        {task.status !== 'em_andamento' && (
                          <DropdownMenuItem onClick={e => {
                            e.stopPropagation();
                            handleStatusChange('em_andamento');
                          }} disabled={isUpdatingStatus}>
                            <Play className="h-4 w-4 mr-2" />
                            Marcar Em Andamento
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={e => {
                          e.stopPropagation();
                          handleStatusChange('concluido');
                        }} disabled={isUpdatingStatus}>
                          <CheckSquare className="h-4 w-4 mr-2" />
                          Marcar como Concluída
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {canArchive && onArchive && task.is_completed && (
                      <DropdownMenuItem onClick={e => {
                        e.stopPropagation();
                        onArchive(task.id);
                      }}>
                        <Archive className="h-4 w-4 mr-2" />
                        Arquivar Tarefa
                      </DropdownMenuItem>
                    )}
                    
                    {canDelete(task) && (
                      <DropdownMenuItem onClick={e => {
                        e.stopPropagation();
                        setShowDeleteDialog(true);
                      }} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Deletar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Desktop Layout: Original horizontal layout */}
          <div className="hidden sm:block">
            {/* Task Reference and Priority */}
            <div className="flex items-center justify-between mb-1">
              <span className={`text-sm font-medium ${taskRefColor}`}>
                Tarefa: {task.task_ref}
              </span>
              <Badge className={`text-xs ${priorityBadgeColor}`}>
                {priorityLabels[task.priority || 'media']}
              </Badge>
            </div>

            {/* Header: OF and Controls in single line */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-muted-foreground">
                OF: {task.of_number}
              </span>
              
              <div className="flex items-center gap-2">
                {task.due_date && (
                  <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                    <Clock className="h-3 w-3" />
                    <span>
                      Prazo: {format(new Date(task.due_date), 'dd/MM', { locale: ptBR })}
                    </span>
                  </div>
                )}
                
                <Badge className={`text-xs border ${statusBadgeColor}`}>
                  {statusLabels[task.status || 'a_fazer']}
                </Badge>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                   <DropdownMenuItem onClick={e => {
                      e.stopPropagation();
                      onView(task);
                    }}>
                      <Eye className="h-4 w-4 mr-2" />
                      Visualizar Detalhes
                    </DropdownMenuItem>
                    
                    {canEdit(task) && (
                      <DropdownMenuItem onClick={e => {
                        e.stopPropagation();
                        onEdit(task);
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    
                    {canMarkComplete(task) && !task.is_completed && (
                      <>
                        {task.status !== 'em_andamento' && (
                          <DropdownMenuItem onClick={e => {
                            e.stopPropagation();
                            handleStatusChange('em_andamento');
                          }} disabled={isUpdatingStatus}>
                            <Play className="h-4 w-4 mr-2" />
                            Marcar Em Andamento
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={e => {
                          e.stopPropagation();
                          handleStatusChange('concluido');
                        }} disabled={isUpdatingStatus}>
                          <CheckSquare className="h-4 w-4 mr-2" />
                          Marcar como Concluída
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {canArchive && onArchive && task.is_completed && (
                      <DropdownMenuItem onClick={e => {
                        e.stopPropagation();
                        onArchive(task.id);
                      }}>
                        <Archive className="h-4 w-4 mr-2" />
                        Arquivar Tarefa
                      </DropdownMenuItem>
                    )}
                    
                    {canDelete(task) && (
                      <DropdownMenuItem onClick={e => {
                        e.stopPropagation();
                        setShowDeleteDialog(true);
                      }} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Deletar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {displayProfile && (
                  <UserAvatar 
                    imageUrl={displayProfile.profile_image_url || undefined} 
                    name={displayProfile.full_name} 
                    email={displayProfile.email} 
                    size="lg" 
                  />
                )}
              </div>
            </div>

            {/* Task Title - Single line with ellipsis */}
            <h3 className={`text-sm font-semibold mb-1 text-card-foreground leading-tight truncate ${isCompleted ? 'line-through' : ''}`}>
              {task.title}
            </h3>

            {/* Footer: Activity Icons and Category */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {commentsCount > 0 && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MessageCircle className="h-3 w-3" />
                    <span className="text-xs">{commentsCount}</span>
                  </div>
                )}
                
                {attachmentsCount > 0 && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Paperclip className="h-3 w-3" />
                    <span className="text-xs">{attachmentsCount}</span>
                  </div>
                )}

                {subtasksCount > 0 && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <CheckSquare className="h-3 w-3" />
                    <span className="text-xs">{subtasksCount}</span>
                  </div>
                )}
              </div>

              {task.category && (
                <Badge variant="outline" className="text-xs">
                  {task.category}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <DeleteTaskDialog 
        open={showDeleteDialog} 
        onOpenChange={setShowDeleteDialog} 
        onConfirm={handleDelete} 
        taskTitle={task.title} 
        isLoading={isDeleting} 
      />
    </>
  );
}
