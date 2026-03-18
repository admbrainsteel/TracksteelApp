
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { usePrioridades } from '@/hooks/usePrioridades';

interface PriorityBadgeProps {
  prioridade: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ 
  prioridade, 
  className = "", 
  size = 'md' 
}) => {
  const { getPrioridadeByCodigo } = usePrioridades();
  
  const prioridadeConfig = getPrioridadeByCodigo(prioridade);
  
  // Se não encontrar a configuração, usar cores padrão baseadas no código
  const getDefaultStyle = (codigo: string) => {
    switch (codigo) {
      case 'P1':
        return { cor: '#dc2626', nome: 'P1 - Urgente' };
      case 'P2':
        return { cor: '#ea580c', nome: 'P2 - Alta' };
      case 'P3':
        return { cor: '#2563eb', nome: 'P3 - Média' };
      case 'P4':
      default:
        return { cor: '#6b7280', nome: 'P4 - Baixa' };
    }
  };

  const config = prioridadeConfig || getDefaultStyle(prioridade);
  const cor = config.cor;
  const nome = config.nome || prioridade;

  // Definir tamanhos
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1'
  };

  return (
    <Badge
      className={`text-white font-medium border-0 ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: cor }}
      title={nome}
    >
      {prioridade}
    </Badge>
  );
};
