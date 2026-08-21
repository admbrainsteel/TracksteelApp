
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Package, TrendingUp, Weight, Calendar } from 'lucide-react';
import { DashboardDataOtimizado } from '@/hooks/useDashboardProducaoOtimizado';

interface ResumoOFProps {
  of: string;
  data: DashboardDataOtimizado | null;
  loading: boolean;
}

export const ResumoOF: React.FC<ResumoOFProps> = ({ of, data, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-card-foreground">
            Progresso Geral da OF
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-card-foreground mb-2">
            {data.progressoGeral.toFixed(1)}%
          </div>
          <Progress value={data.progressoGeral} className="h-2 mb-2" />
          <p className="text-xs text-muted-foreground">
            OF: {data.of}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-card-foreground">
            Peso Total Fabricado
          </CardTitle>
          <Weight className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-card-foreground">
            {data.pesoTotalFabricado.toFixed(2)} kg
          </div>
          <p className="text-xs text-muted-foreground">
            de {data.tonelagem.toFixed(2)} kg contratadas
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-card-foreground">
            Status dos Processos
          </CardTitle>
          <Package className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-2">
            <Badge variant="default" className="bg-blue-500">
              {data.processos.filter(p => p.status === 'azul').length}
            </Badge>
            <Badge variant="default" className="bg-green-500">
              {data.processos.filter(p => p.status === 'verde').length}
            </Badge>
            <Badge variant="secondary" className="bg-yellow-500">
              {data.processos.filter(p => p.status === 'amarelo').length}
            </Badge>
            <Badge variant="destructive">
              {data.processos.filter(p => p.status === 'vermelho').length}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Adiantado / No Prazo / Atenção / Atrasado
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
