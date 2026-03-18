
export const getTaskStatusColor = (status: string) => {
  const statusColors = {
    'a_fazer': 'bg-yellow-100 text-yellow-800',
    'em_andamento': 'bg-blue-100 text-blue-800',
    'revisao': 'bg-purple-100 text-purple-800',
    'pendente': 'bg-orange-100 text-orange-800',
    'bloqueado': 'bg-red-100 text-red-800',
    'concluido': 'bg-green-100 text-green-800',
    'comprado': 'bg-blue-100 text-blue-800'
  };

  return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
};

export const getTaskStatusBadgeColor = (status: string) => {
  const statusColors = {
    'a_fazer': 'bg-yellow-500',
    'em_andamento': 'bg-blue-500',
    'revisao': 'bg-purple-500',
    'pendente': 'bg-orange-500',
    'bloqueado': 'bg-red-500',
    'concluido': 'bg-green-500',
    'comprado': 'bg-blue-600'
  };

  return statusColors[status as keyof typeof statusColors] || 'bg-gray-500';
};

// Alias para compatibilidade
export const getStatusBadgeColor = getTaskStatusBadgeColor;

// Função para cores de borda das tarefas
export const getTaskBorderColor = (task: any): string => {
  if (task.is_completed || task.status === 'concluido') {
    return 'border-l-green-500';
  }
  
  if (task.status === 'comprado') {
    return 'border-l-blue-600';
  }
  
  if (task.status === 'bloqueado') {
    return 'border-l-red-500';
  }
  
  if (task.status === 'em_andamento') {
    return 'border-l-blue-500';
  }
  
  if (task.status === 'revisao') {
    return 'border-l-purple-500';
  }
  
  if (task.status === 'pendente') {
    return 'border-l-orange-500';
  }
  
  return 'border-l-yellow-500';
};
