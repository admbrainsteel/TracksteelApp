
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Copy } from 'lucide-react';
import { EstoqueMaterial, useDuplicarMaterial } from '@/hooks/useEstoque';
import { EstoqueTableHeader } from '../EstoqueTableHeader';
import { ScrollableTable } from '@/components/ui/ScrollableTable';

interface EstoqueDesktopTableProps {
  materiais: EstoqueMaterial[];
  selectedMaterials: EstoqueMaterial[];
  onSelectMaterial: (material: EstoqueMaterial, isSelected: boolean) => void;
  onEditMaterial: (material: EstoqueMaterial) => void;
  onSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isAllSelected: () => boolean;
  sortField: any;
  sortOrder: any;
  onSort: (field: any) => void;
  getStatusColor: (status: string) => string;
}

export const EstoqueDesktopTable: React.FC<EstoqueDesktopTableProps> = ({
  materiais,
  selectedMaterials,
  onSelectMaterial,
  onEditMaterial,
  onSelectAll,
  isAllSelected,
  sortField,
  sortOrder,
  onSort,
  getStatusColor
}) => {
  const duplicarMaterial = useDuplicarMaterial();

  const handleDuplicarMaterial = (material: EstoqueMaterial) => {
    duplicarMaterial.mutate(material);
  };

  return (
    <div className="hidden sm:block">
      <div className="w-full overflow-x-auto">
        <Table>
        <TableHeader>
          <EstoqueTableHeader
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={onSort}
            isAllSelected={isAllSelected()}
            onSelectAll={onSelectAll}
          />
        </TableHeader>
        <TableBody>
          {materiais.map((material) => {
            const pesoTotal = (material.quantidade_total || 0) * (material.peso_unitario || 0);
            
            return (
              <TableRow key={material.id} className="h-auto min-h-[3rem]">
                <TableCell className="py-2 px-1 w-8">
                  <input
                    type="checkbox"
                    className="w-3 h-3"
                    checked={selectedMaterials.some(m => m.id === material.id)}
                    onChange={(e) => onSelectMaterial(material, e.target.checked)}
                  />
                </TableCell>
                <TableCell className="text-xs py-2 px-2 w-80">
                  <div className="break-words whitespace-normal leading-tight max-w-full">
                    {material.descricao}
                  </div>
                </TableCell>
                <TableCell className="text-xs py-2 px-2 w-24">{material.lote_atual || '-'}</TableCell>
                <TableCell className="text-xs py-2 px-2 w-32">{material.tipos_materia_prima?.nome || '-'}</TableCell>
                <TableCell className="text-xs py-2 px-2 w-16">{material.unidade}</TableCell>
                <TableCell className="text-xs py-2 px-2 w-16">{material.comprimento || '-'}</TableCell>
                <TableCell className="text-xs py-2 px-2 font-medium w-20">{material.quantidade_total}</TableCell>
                <TableCell className="text-xs py-2 px-2 font-medium text-blue-600 w-20">{pesoTotal.toFixed(1)}</TableCell>
                <TableCell className="text-xs py-2 px-2 font-medium text-green-600 w-20">{material.quantidade_disponivel}</TableCell>
                <TableCell className="text-xs py-2 px-2 font-medium text-orange-600 w-20">{material.quantidade_empenhada}</TableCell>
                <TableCell className="py-2 px-2 w-24">
                  <Badge variant="outline" className={`${getStatusColor(material.status)} text-xs`}>
                    {material.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-2 px-2 w-20">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditMaterial(material)}
                      className="h-6 w-6 p-1"
                      title="Editar material"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicarMaterial(material)}
                      className="h-6 w-6 p-1 text-blue-600 hover:text-blue-700"
                      title="Duplicar material"
                      disabled={duplicarMaterial.isPending}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        </Table>
      </div>
    </div>
  );
};
