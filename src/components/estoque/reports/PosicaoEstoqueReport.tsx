
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface PosicaoEstoqueReportProps {
  filters: any;
}

export const PosicaoEstoqueReport: React.FC<PosicaoEstoqueReportProps> = ({ filters }) => {
  const { data: materiais = [], isLoading } = useQuery({
    queryKey: ['relatorio-posicao-estoque', filters],
    queryFn: async () => {
      let query = supabase.from('estoque_materiais').select('*');
      
      if (filters.descricao_material) {
        query = query.ilike('descricao', `%${filters.descricao_material}%`);
      }
      
      if (filters.status && filters.status !== 'todos') {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  if (isLoading) {
    return <Skeleton className="w-full h-96" />;
  }

  const totalQuantidade = materiais.reduce((sum, item) => sum + (item.quantidade_disponivel || 0), 0);
  const totalValor = materiais.reduce((sum, item) => sum + ((item.quantidade_disponivel || 0) * (item.valor_unitario || 0)), 0);
  
  // Calcular peso total geral e peso disponível
  const pesoTotalGeral = materiais.reduce((sum, item) => {
    const kgPorMetro = item.kg_por_metro || 0;
    const comprimento = item.comprimento || 0;
    const quantidadeTotal = item.quantidade_total || 0;
    const pesoItem = (kgPorMetro * comprimento / 1000) * quantidadeTotal;
    return sum + pesoItem;
  }, 0);

  const pesoDisponivelTotal = materiais.reduce((sum, item) => {
    const kgPorMetro = item.kg_por_metro || 0;
    const comprimento = item.comprimento || 0;
    const quantidadeDisponivel = item.quantidade_disponivel || 0;
    const pesoDisponivel = (kgPorMetro * comprimento / 1000) * quantidadeDisponivel;
    return sum + pesoDisponivel;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="text-center border-b pb-4">
        <h1 className="text-2xl font-bold">Relatório de Posição de Estoque</h1>
        <p className="text-gray-600">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
        {filters.data_inicio && filters.data_fim && (
          <p className="text-gray-600">Período: {filters.data_inicio} a {filters.data_fim}</p>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-blue-800">Total de Materiais</h3>
          <p className="text-2xl font-bold text-blue-900">{materiais.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-green-800">Quantidade Total</h3>
          <p className="text-2xl font-bold text-green-900">{totalQuantidade.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-red-800">Peso Total Geral</h3>
          <p className="text-2xl font-bold text-red-900">{pesoTotalGeral.toFixed(2)} kg</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-purple-800">Peso Disp. (kg)</h3>
          <p className="text-2xl font-bold text-purple-900">{pesoDisponivelTotal.toFixed(2)} kg</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">Código</th>
              <th className="border border-gray-300 p-2 text-left">Descrição</th>
              <th className="border border-gray-300 p-2 text-center">Compr.</th>
              <th className="border border-gray-300 p-2 text-center">Quantidade</th>
              <th className="border border-gray-300 p-2 text-center">Unidade</th>
              <th className="border border-gray-300 p-2 text-right">Peso Total (kg)</th>
              <th className="border border-gray-300 p-2 text-right">Peso Disp. (kg)</th>
              <th className="border border-gray-300 p-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {materiais.map((material, index) => {
              const kgPorMetro = material.kg_por_metro || 0;
              const comprimento = material.comprimento || 0;
              const quantidadeTotal = material.quantidade_total || 0;
              const quantidadeDisponivel = material.quantidade_disponivel || 0;
              
              const pesoTotal = (kgPorMetro * comprimento / 1000) * quantidadeTotal;
              const pesoDisponivel = (kgPorMetro * comprimento / 1000) * quantidadeDisponivel;
              
              return (
                <tr key={material.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 p-2">{material.codigo || '-'}</td>
                  <td className="border border-gray-300 p-2">{material.descricao}</td>
                  <td className="border border-gray-300 p-2 text-center">{comprimento ? `${comprimento.toFixed(0)}mm` : '-'}</td>
                  <td className="border border-gray-300 p-2 text-center">{material.quantidade_disponivel?.toFixed(2) || '0'}</td>
                  <td className="border border-gray-300 p-2 text-center">{material.unidade || '-'}</td>
                  <td className="border border-gray-300 p-2 text-right">{pesoTotal.toFixed(2)}</td>
                  <td className="border border-gray-300 p-2 text-right">{pesoDisponivel.toFixed(2)}</td>
                  <td className="border border-gray-300 p-2 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      material.status === 'Crítico' ? 'bg-red-100 text-red-800' :
                      material.status === 'Excesso' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {material.status || 'Normal'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {materiais.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Nenhum material encontrado com os filtros aplicados.
        </div>
      )}
    </div>
  );
};
