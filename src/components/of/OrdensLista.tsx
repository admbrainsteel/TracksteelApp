
import React from 'react';
import { OrdemCard } from './OrdemCard';
import { Card, CardContent } from '@/components/ui/card';
import { Package } from 'lucide-react';

interface OrdensListaProps {
  ordens: any[];
  totalOrdens: number;
  searchTerm: string;
  statusFilter: string;
  onVerCronograma: (ordem: any) => void;
  onVerDashboard: (ordem: any) => void;
  onEdit?: (ordem: any) => void;
  onConcluir?: (ordem: any) => void;
  onDelete?: (ordem: any) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function OrdensLista({ 
  ordens, 
  totalOrdens, 
  searchTerm, 
  statusFilter,
  onVerCronograma,
  onVerDashboard,
  onEdit,
  onConcluir,
  onDelete,
  canEdit = true,
  canDelete = true
}: OrdensListaProps) {
  if (ordens.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-card-foreground mb-2">
            {searchTerm || statusFilter !== 'all' 
              ? 'Nenhuma ordem encontrada' 
              : 'Nenhuma ordem cadastrada'
            }
          </h3>
          <p className="text-muted-foreground text-center max-w-md">
            {searchTerm || statusFilter !== 'all'
              ? 'Tente ajustar os filtros para encontrar as ordens desejadas.'
              : 'Comece criando sua primeira ordem de fabricação.'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Mostrando {ordens.length} de {totalOrdens} {totalOrdens === 1 ? 'ordem' : 'ordens'}
      </div>
      
      <div className="grid gap-4">
        {ordens.map((ordem) => (
          <OrdemCard
            key={ordem.id}
            ordem={ordem}
            onVerCronograma={onVerCronograma}
            onVerDashboard={onVerDashboard}
            onEdit={canEdit && onEdit ? onEdit : undefined}
            onConcluir={canEdit && onConcluir ? onConcluir : undefined}
            onDelete={canDelete && onDelete ? onDelete : undefined}
            showActions={canEdit || canDelete}
          />
        ))}
      </div>
    </div>
  );
}
