
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, AlertTriangle, TrendingUp, Box } from 'lucide-react';
import { EstoqueMaterial } from '@/hooks/useEstoque';

interface EstoqueDashboardCardsProps {
  materiais: EstoqueMaterial[];
}

export const EstoqueDashboardCards: React.FC<EstoqueDashboardCardsProps> = ({ materiais }) => {
  // Calcular Total (kg)
  const totalKg = materiais.reduce((acc, material) => {
    const kgPorMetro = material.kg_por_metro || 0;
    const comprimento = material.comprimento || 0;
    const quantidadeTotal = material.quantidade_total || 0;
    
    // Fórmula: (Kg por metro * comprimento / 1000) * quantidade total
    const kgItem = (kgPorMetro * comprimento / 1000) * quantidadeTotal;
    return acc + kgItem;
  }, 0);

  // Calcular Total (unid)
  const totalUnidades = materiais.reduce((acc, material) => {
    return acc + (material.quantidade_total || 0);
  }, 0);

  // Calcular Total Disponível (unid)
  const totalDisponiveis = materiais.reduce((acc, material) => {
    return acc + (material.quantidade_disponivel || 0);
  }, 0);

  // Calcular Total Empenhado (unid)
  const totalEmpenhadas = materiais.reduce((acc, material) => {
    return acc + (material.quantidade_empenhada || 0);
  }, 0);

  const cards = [
    {
      title: 'Total (kg)',
      value: totalKg.toFixed(2),
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total (unid)',
      value: totalUnidades.toString(),
      icon: Box,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total Disp. (unid)',
      value: totalDisponiveis.toString(),
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Total Emp. (unid)',
      value: totalEmpenhadas.toString(),
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <Card key={index} className={`${card.bgColor} border-none shadow-sm`}>
            <CardHeader className="pb-2 px-3 sm:px-4 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <IconComponent className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3">
              <div className={`text-lg sm:text-2xl font-bold ${card.color}`}>
                {card.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
