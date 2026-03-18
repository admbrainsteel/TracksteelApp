import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, RotateCcw, Package, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { useMovimentacoesEstoque } from '@/hooks/useEstoqueMovimentacoes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MovimentacaoEstoque {
  id: string;
  material_id: string;
  tipo_movimentacao: 'entrada' | 'saida' | 'transferencia' | 'ajuste' | 'empenho' | 'desempenho';
  quantidade: number;
  lote?: string;
  fornecedor?: string;
  of_vinculada?: string;
  observacoes?: string;
  data_movimentacao?: string;
  created_at: string;
  created_by?: string;
  estoque_materiais?: {
    codigo: string;
    descricao: string;
  };
}

const getMovementIcon = (tipo: string) => {
  switch (tipo) {
    case 'entrada':
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    case 'saida':
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    case 'ajuste':
      return <RotateCcw className="h-4 w-4 text-blue-600" />;
    case 'transferencia':
      return <ArrowRightLeft className="h-4 w-4 text-purple-600" />;
    case 'empenho':
      return <Package className="h-4 w-4 text-orange-600" />;
    case 'desempenho':
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    default:
      return <Package className="h-4 w-4 text-gray-600" />;
  }
};

const getMovementColor = (tipo: string) => {
  switch (tipo) {
    case 'entrada':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'saida':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'ajuste':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'transferencia':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'empenho':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'desempenho':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getMovementTitle = (tipo: string) => {
  switch (tipo) {
    case 'entrada':
      return 'Entradas';
    case 'saida':
      return 'Saídas';
    case 'ajuste':
      return 'Ajustes';
    case 'transferencia':
      return 'Transferências';
    case 'empenho':
      return 'Empenhos';
    case 'desempenho':
      return 'Desempenhos';
    default:
      return 'Outras';
  }
};

const MovementPanel: React.FC<{ 
  tipo: string; 
  movimentacoes: MovimentacaoEstoque[];
  icon: React.ReactNode;
}> = ({ tipo, movimentacoes, icon }) => {
  const recentMovements = movimentacoes
    .filter(mov => mov.tipo_movimentacao === tipo)
    .slice(0, 5); // Mostrar apenas as 5 mais recentes

  if (recentMovements.length === 0) {
    return null;
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {getMovementTitle(tipo)}
          <Badge variant="secondary" className="ml-auto">
            {recentMovements.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentMovements.map((movimento) => (
          <div key={movimento.id} className="border-l-4 border-l-gray-200 pl-3 py-2 hover:bg-gray-50 rounded-r">
            <div className="flex items-center justify-between mb-1">
              <Badge className={`text-xs ${getMovementColor(movimento.tipo_movimentacao)}`}>
                {movimento.tipo_movimentacao.toUpperCase()}
              </Badge>
              <span className="text-xs text-gray-500">
                {format(new Date(movimento.created_at), 'dd/MM HH:mm', { locale: ptBR })}
              </span>
            </div>
            <div className="text-sm font-medium text-gray-900 mb-1">
              {movimento.estoque_materiais?.descricao || 'Material não identificado'}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Qtd: <strong>{movimento.quantidade}</strong></span>
              {movimento.lote && (
                <span>Lote: <strong>{movimento.lote}</strong></span>
              )}
            </div>
            {movimento.of_vinculada && (
              <div className="text-xs text-gray-500 mt-1">
                OF: {movimento.of_vinculada}
              </div>
            )}
            {movimento.fornecedor && (
              <div className="text-xs text-gray-500 mt-1">
                Fornecedor: {movimento.fornecedor}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export const EstoqueDashboard: React.FC = () => {
  const { data: movimentacoes = [], isLoading } = useMovimentacoesEstoque();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="h-80">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const tiposMovimentacao = ['entrada', 'saida', 'ajuste', 'transferencia', 'empenho', 'desempenho'];
  
  // Filtrar apenas movimentações dos últimos 30 dias
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentMovements = movimentacoes.filter(mov => 
    new Date(mov.created_at) >= thirtyDaysAgo
  );

  return (
    <div className="space-y-6">
      {/* Resumo Geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Resumo de Movimentações (Últimos 30 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {tiposMovimentacao.map(tipo => {
              const count = recentMovements.filter(mov => mov.tipo_movimentacao === tipo).length;
              return (
                <div key={tipo} className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    {getMovementIcon(tipo)}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-xs text-gray-500 capitalize">{tipo}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Painéis de Movimentações */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiposMovimentacao.map(tipo => (
          <MovementPanel
            key={tipo}
            tipo={tipo}
            movimentacoes={recentMovements}
            icon={getMovementIcon(tipo)}
          />
        ))}
      </div>
    </div>
  );
};