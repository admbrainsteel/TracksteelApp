
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import { Settings } from 'lucide-react';
import { Equipamento, useEquipamentos } from '@/hooks/useEquipamentos';

interface EquipamentosTableProps {
  equipamentos: Equipamento[];
  onEdit: (equipamento: Equipamento) => void;
  onDelete: (id: string) => void;
  onLoanControl: (equipamento: Equipamento) => void; // Adicionar esta prop
  canModify?: boolean;
}

export function EquipamentosTable({ equipamentos, onEdit, onDelete, onLoanControl, canModify = true }: EquipamentosTableProps) {
  const { getEquipamentoStatus } = useEquipamentos();

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  if (equipamentos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum equipamento encontrado com os filtros aplicados.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-medium text-muted-foreground">Código</TableHead>
              <TableHead className="font-medium text-muted-foreground">Descrição</TableHead>
              <TableHead className="font-medium text-muted-foreground">Status</TableHead>
              <TableHead className="font-medium text-muted-foreground">Local de Estoque</TableHead>
              <TableHead className="font-medium text-muted-foreground">Validade Calibração</TableHead>
              <TableHead className="font-medium text-muted-foreground">OF Empréstimo</TableHead>
              {canModify && (
                <TableHead className="font-medium text-muted-foreground no-print">Ações</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {equipamentos.map((equipamento) => {
              const status = getEquipamentoStatus(equipamento);
              return (
                <TableRow key={equipamento.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-card-foreground">{equipamento.codigo}</TableCell>
                  <TableCell className="text-card-foreground">{equipamento.descricao}</TableCell>
                  <TableCell>
                    <Badge className={`${status.class} border`}>
                      {status.text}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-card-foreground">{equipamento.local_estoque}</TableCell>
                  <TableCell className="text-card-foreground">{formatDate(equipamento.validade_calibracao)}</TableCell>
                  <TableCell className="text-card-foreground">{equipamento.of_number || 'N/A'}</TableCell>
                  {canModify && (
                    <TableCell className="no-print">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(equipamento)}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(equipamento.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onLoanControl(equipamento)}
                          className="border-orange-600 text-orange-400 hover:bg-orange-900"
                          title="Controle de Empréstimo"
                        >
                          <Settings className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
