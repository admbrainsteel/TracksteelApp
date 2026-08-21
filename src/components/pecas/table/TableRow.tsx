
import React from 'react';
import { TableCell, TableRow as UITableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Trash2, Package, Check, X } from 'lucide-react';
import { Peca } from '@/hooks/usePecas';
import { PriorityBadge } from '../PriorityBadge';

interface TableRowProps {
  peca: Peca;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onOpenComponentPopup: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function TableRow({ 
  peca, 
  isSelected, 
  onSelect, 
  onOpenComponentPopup,
  onEdit, 
  onDelete 
}: TableRowProps) {
  return (
    <UITableRow className="hover:bg-muted/50">
      <TableCell className="w-8 px-2">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(checked as boolean)}
          aria-label={`Selecionar peça ${peca.id}`}
        />
      </TableCell>
      
      <TableCell className="w-16 px-2 font-medium text-foreground text-xs">
        {peca.of_number}
      </TableCell>
      
      <TableCell className="w-12 px-2 text-muted-foreground text-xs">
        {peca.etapa_fase}
      </TableCell>
      
      <TableCell className="w-14 px-2 text-muted-foreground text-xs">
        {peca.marca}
      </TableCell>
      
      <TableCell className="w-32 px-2 text-foreground text-xs">
        {peca.descricao}
      </TableCell>
      
      <TableCell className="w-16 px-2">
        <PriorityBadge prioridade={peca.prioridade as any} />
      </TableCell>
      
      <TableCell className="w-16 px-2 text-center">
        <div className="flex justify-center">
          {!peca.tem_componentes ? (
            <div className="flex items-center justify-center w-5 h-5 bg-green-500 rounded-full shadow-sm">
              <Check className="h-3 w-3 text-white font-bold" />
            </div>
          ) : (
            <div className="flex items-center justify-center w-5 h-5 bg-red-500 rounded-full shadow-sm">
              <X className="h-3 w-3 text-white font-bold" />
            </div>
          )}
        </div>
      </TableCell>
      
      <TableCell className="w-12 px-2 text-right text-muted-foreground text-xs">
        {peca.quantidade}
      </TableCell>
      
      <TableCell className="w-16 px-2 text-right text-muted-foreground text-xs">
        {peca.peso_unitario} kg
      </TableCell>
      
      <TableCell className="w-16 px-2 text-right font-medium text-foreground text-xs">
        {(peca.peso_total || (peca.quantidade * peca.peso_unitario)).toFixed(2)} kg
      </TableCell>
      
      <TableCell className="w-16 px-2 text-muted-foreground text-xs">
        {peca.material || '-'}
      </TableCell>
      
      <TableCell className="w-16 px-2 text-muted-foreground text-xs">
        {peca.perfil_principal || '-'}
      </TableCell>
      
      <TableCell className="w-20 px-2">
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenComponentPopup}
            title="Ver componentes"
            className="h-6 w-6 p-0"
          >
            <Package className="h-3 w-3" />
          </Button>
          
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              title="Editar peça"
              className="h-6 w-6 p-0"
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
          
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              title="Excluir peça"
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </TableCell>
    </UITableRow>
  );
}
