
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Copy } from 'lucide-react';
import { EstoqueMaterial, useDuplicarMaterial } from '@/hooks/useEstoque';

interface EstoqueMobileViewProps {
  materiais: EstoqueMaterial[];
  selectedMaterials: EstoqueMaterial[];
  onSelectMaterial: (material: EstoqueMaterial, isSelected: boolean) => void;
  onEditMaterial: (material: EstoqueMaterial) => void;
  getStatusColor: (status: string) => string;
}

export const EstoqueMobileView: React.FC<EstoqueMobileViewProps> = ({
  materiais,
  selectedMaterials,
  onSelectMaterial,
  onEditMaterial,
  getStatusColor
}) => {
  const duplicarMaterial = useDuplicarMaterial();

  const handleDuplicarMaterial = (material: EstoqueMaterial) => {
    duplicarMaterial.mutate(material);
  };

  return (
    <div className="sm:hidden space-y-4">
      {materiais.map((material) => {
        const pesoTotal = (material.quantidade_total || 0) * (material.peso_unitario || 0);
        
        return (
          <Card key={material.id} className="relative">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={selectedMaterials.some(m => m.id === material.id)}
                    onChange={(e) => onSelectMaterial(material, e.target.checked)}
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-sm text-foreground leading-tight">
                      {material.descricao}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Código: {material.codigo}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditMaterial(material)}
                    className="h-7 w-7 p-1"
                    title="Editar material"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDuplicarMaterial(material)}
                    className="h-7 w-7 p-1 text-blue-600 hover:text-blue-700"
                    title="Duplicar material"
                    disabled={duplicarMaterial.isPending}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Lote:</span>
                  <span className="ml-1 font-medium">{material.lote_atual || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="ml-1 font-medium">{material.tipos_materia_prima?.nome || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Unidade:</span>
                  <span className="ml-1 font-medium">{material.unidade}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Comprimento:</span>
                  <span className="ml-1 font-medium">{material.comprimento || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Qtd Total:</span>
                  <span className="ml-1 font-medium">{material.quantidade_total}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Peso Total:</span>
                  <span className="ml-1 font-medium text-blue-600">{pesoTotal.toFixed(1)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Disponível:</span>
                  <span className="ml-1 font-medium text-green-600">{material.quantidade_disponivel}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Empenhada:</span>
                  <span className="ml-1 font-medium text-orange-600">{material.quantidade_empenhada}</span>
                </div>
              </div>

              <div className="flex justify-between items-center mt-3">
                <Badge variant="outline" className={`${getStatusColor(material.status)} text-xs`}>
                  {material.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
