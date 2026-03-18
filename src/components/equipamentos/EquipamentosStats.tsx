
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface EquipamentosStatsProps {
  stats: {
    total: number;
    disponiveis: number;
    emUso: number;
    calibracaoVencida: number;
  };
}

export function EquipamentosStats({ stats }: EquipamentosStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <h3 className="text-sm font-medium text-muted-foreground">Total de Ativos</h3>
          <p className="text-2xl font-semibold text-card-foreground mt-1">{stats.total}</p>
        </CardContent>
      </Card>
      
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <h3 className="text-sm font-medium text-muted-foreground">Disponíveis</h3>
          <p className="text-2xl font-semibold text-green-400 mt-1">{stats.disponiveis}</p>
        </CardContent>
      </Card>
      
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <h3 className="text-sm font-medium text-muted-foreground">Em Uso (Emprestados)</h3>
          <p className="text-2xl font-semibold text-yellow-400 mt-1">{stats.emUso}</p>
        </CardContent>
      </Card>
      
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <h3 className="text-sm font-medium text-muted-foreground">Calibração Vencida/Vencendo</h3>
          <p className="text-2xl font-semibold text-red-400 mt-1">{stats.calibracaoVencida}</p>
        </CardContent>
      </Card>
    </div>
  );
}
