
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface MovimentacoesReportProps {
  filters: any;
}

export const MovimentacoesReport: React.FC<MovimentacoesReportProps> = ({ filters }) => {
  const { data: movimentacoes = [], isLoading } = useQuery({
    queryKey: ['relatorio-movimentacoes', filters],
    queryFn: async () => {
      let query = supabase
        .from('movimentacoes_estoque')
        .select(`
          *,
          estoque_materiais!inner(descricao, codigo, unidade)
        `);
      
      if (filters.data_inicio) {
        query = query.gte('data_movimentacao', filters.data_inicio);
      }
      
      if (filters.data_fim) {
        query = query.lte('data_movimentacao', filters.data_fim);
      }
      
      if (filters.descricao_material) {
        query = query.ilike('estoque_materiais.descricao', `%${filters.descricao_material}%`);
      }
      
      const { data, error } = await query.order('data_movimentacao', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  if (isLoading) {
    return <Skeleton className="w-full h-96" />;
  }

  const totalEntradas = movimentacoes
    .filter(mov => mov.tipo_movimentacao === 'entrada')
    .reduce((sum, item) => sum + (item.quantidade || 0), 0);

  const totalSaidas = movimentacoes
    .filter(mov => mov.tipo_movimentacao === 'saida')
    .reduce((sum, item) => sum + (item.quantidade || 0), 0);

  return (
    <div className="space-y-6">
      <div className="text-center border-b pb-4">
        <h1 className="text-2xl font-bold">Relatório de Movimentações</h1>
        <p className="text-gray-600">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
        {filters.data_inicio && filters.data_fim && (
          <p className="text-gray-600">Período: {filters.data_inicio} a {filters.data_fim}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-green-800">Total Entradas</h3>
          <p className="text-2xl font-bold text-green-900">{totalEntradas.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-red-800">Total Saídas</h3>
          <p className="text-2xl font-bold text-red-900">{totalSaidas.toFixed(2)}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-blue-800">Movimentações</h3>
          <p className="text-2xl font-bold text-blue-900">{movimentacoes.length}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">Data</th>
              <th className="border border-gray-300 p-2 text-left">Material</th>
              <th className="border border-gray-300 p-2 text-center">Tipo</th>
              <th className="border border-gray-300 p-2 text-center">Quantidade</th>
              <th className="border border-gray-300 p-2 text-left">Observações</th>
            </tr>
          </thead>
          <tbody>
            {movimentacoes.map((mov, index) => (
              <tr key={mov.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-300 p-2">
                  {new Date(mov.data_movimentacao).toLocaleDateString('pt-BR')}
                </td>
                <td className="border border-gray-300 p-2">
                  {mov.estoque_materiais?.descricao || '-'}
                </td>
                <td className="border border-gray-300 p-2 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${
                    mov.tipo_movimentacao === 'entrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {mov.tipo_movimentacao === 'entrada' ? 'Entrada' : 'Saída'}
                  </span>
                </td>
                <td className="border border-gray-300 p-2 text-center">
                  {mov.quantidade?.toFixed(2)} {mov.estoque_materiais?.unidade || ''}
                </td>
                <td className="border border-gray-300 p-2">{mov.observacoes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {movimentacoes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Nenhuma movimentação encontrada com os filtros aplicados.
        </div>
      )}
    </div>
  );
};
