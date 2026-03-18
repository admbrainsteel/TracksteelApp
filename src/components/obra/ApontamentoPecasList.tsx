import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit } from 'lucide-react';
import { ApontamentoPecaObra } from '@/hooks/useApontamentosPecaObra';
import { PecaExpedida } from '@/hooks/usePecasExpedidas';

interface ApontamentoPecasListProps {
  apontamentos: ApontamentoPecaObra[];
  pecasExpedidas: PecaExpedida[];
  onEdit: (apontamento: ApontamentoPecaObra) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

export const ApontamentoPecasList: React.FC<ApontamentoPecasListProps> = ({
  apontamentos,
  pecasExpedidas,
  onEdit,
  onDelete,
  loading = false
}) => {
  const getPecaInfo = (marcaPeca: string) => {
    return pecasExpedidas.find(p => p.marca === marcaPeca);
  };

  const getTotalApontado = (marcaPeca: string) => {
    return apontamentos
      .filter(a => a.marca_peca === marcaPeca)
      .reduce((total, a) => total + a.quantidade, 0);
  };

  if (apontamentos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Nenhum apontamento de peça registrado ainda.
        </p>
      </div>
    );
  }

  // Agrupar apontamentos por peça
  const apontamentosAgrupados = apontamentos.reduce((acc, apontamento) => {
    const marca = apontamento.marca_peca;
    if (!acc[marca]) {
      acc[marca] = [];
    }
    acc[marca].push(apontamento);
    return acc;
  }, {} as Record<string, ApontamentoPecaObra[]>);

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-foreground">Apontamentos de Peças</h3>
      
      {Object.entries(apontamentosAgrupados).map(([marca, apontamentosPeca]) => {
        const pecaInfo = getPecaInfo(marca);
        const totalApontado = getTotalApontado(marca);
        
        return (
          <Card key={marca}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{marca}</CardTitle>
                <div className="flex gap-2">
                  {pecaInfo && (
                    <>
                      <Badge variant="outline">
                        Expedido: {pecaInfo.quantidade_expedida}
                      </Badge>
                      <Badge variant="secondary">
                        Apontado: {totalApontado}
                      </Badge>
                      <Badge 
                        variant={pecaInfo.saldo_disponivel > 0 ? "default" : "destructive"}
                      >
                        Saldo: {pecaInfo.saldo_disponivel}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
              {pecaInfo?.descricao && (
                <p className="text-sm text-muted-foreground">
                  {pecaInfo.descricao}
                </p>
              )}
            </CardHeader>
            
            <CardContent>
              <div className="space-y-2">
                {apontamentosPeca.map((apontamento) => (
                  <div
                    key={apontamento.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                  >
                    <div>
                      <span className="font-medium">
                        Quantidade: {apontamento.quantidade}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(apontamento.created_at).toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(apontamento)}
                        disabled={loading}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(apontamento.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};