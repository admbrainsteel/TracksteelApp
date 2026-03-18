
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface EmpenhosPorOFReportProps {
  filters: any;
}

export const EmpenhosPorOFReport: React.FC<EmpenhosPorOFReportProps> = ({ filters }) => {
  const { data: empenhos = [], isLoading } = useQuery({
    queryKey: ['relatorio-empenhos-of', filters],
    queryFn: async () => {
      let query = supabase
        .from('empenhos_material')
        .select(`
          *,
          estoque_materiais!inner(
            codigo,
            descricao,
            unidade,
            valor_unitario
          )
        `);
      
      if (filters.of_vinculada) {
        query = query.eq('of_number', filters.of_vinculada);
      }
      
      if (filters.status_empenho && filters.status_empenho !== 'todos') {
        query = query.eq('status', filters.status_empenho);
      }
      
      if (filters.data_inicio) {
        query = query.gte('data_empenho', filters.data_inicio);
      }
      
      if (filters.data_fim) {
        query = query.lte('data_empenho', filters.data_fim);
      }
      
      const { data, error } = await query.order('data_empenho', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  if (isLoading) {
    return <Skeleton className="w-full h-96" />;
  }

  // Calcular totais
  const totais = empenhos.reduce((acc, empenho) => {
    acc.totalEmpenhado += empenho.quantidade_empenhada;
    acc.totalUtilizado += empenho.quantidade_utilizada;
    acc.valorTotal += empenho.quantidade_empenhada * (empenho.estoque_materiais?.valor_unitario || 0);
    
    if (empenho.status === 'Empenhado') acc.ativos++;
    else if (empenho.status === 'Finalizado') acc.finalizados++;
    else if (empenho.status === 'Cancelado') acc.cancelados++;
    
    return acc;
  }, {
    totalEmpenhado: 0,
    totalUtilizado: 0,
    valorTotal: 0,
    ativos: 0,
    finalizados: 0,
    cancelados: 0
  });

  const totalRestante = totais.totalEmpenhado - totais.totalUtilizado;

  return (
    <div className="space-y-6">
      <div className="text-center border-b pb-4">
        <h1 className="text-2xl font-bold">Relatório de Empenhos por OF</h1>
        <p className="text-gray-600">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
        {filters.of_vinculada && (
          <p className="text-gray-600">OF: {filters.of_vinculada}</p>
        )}
        {filters.data_inicio && filters.data_fim && (
          <p className="text-gray-600">Período: {filters.data_inicio} a {filters.data_fim}</p>
        )}
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-blue-800">Empenhos Ativos</h3>
          <p className="text-2xl font-bold text-blue-900">{totais.ativos}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-green-800">Finalizados</h3>
          <p className="text-2xl font-bold text-green-900">{totais.finalizados}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-red-800">Cancelados</h3>
          <p className="text-2xl font-bold text-red-900">{totais.cancelados}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-purple-800">Valor Total</h3>
          <p className="text-2xl font-bold text-purple-900">R$ {totais.valorTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* Resumo quantitativo */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-yellow-800">Total Empenhado</h3>
          <p className="text-2xl font-bold text-yellow-900">{totais.totalEmpenhado.toFixed(2)}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-orange-800">Total Utilizado</h3>
          <p className="text-2xl font-bold text-orange-900">{totais.totalUtilizado.toFixed(2)}</p>
        </div>
        <div className="bg-indigo-50 p-4 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-indigo-800">Restante</h3>
          <p className="text-2xl font-bold text-indigo-900">{totalRestante.toFixed(2)}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">Data</th>
              <th className="border border-gray-300 p-2 text-left">OF</th>
              <th className="border border-gray-300 p-2 text-left">Material</th>
              <th className="border border-gray-300 p-2 text-left">Lote</th>
              <th className="border border-gray-300 p-2 text-center">Qtd Empenhada</th>
              <th className="border border-gray-300 p-2 text-center">Qtd Utilizada</th>
              <th className="border border-gray-300 p-2 text-center">Restante</th>
              <th className="border border-gray-300 p-2 text-center">Status</th>
              <th className="border border-gray-300 p-2 text-right">Valor Unit.</th>
              <th className="border border-gray-300 p-2 text-right">Valor Total</th>
            </tr>
          </thead>
          <tbody>
            {empenhos.map((empenho, index) => {
              const valorUnitario = empenho.estoque_materiais?.valor_unitario || 0;
              const valorTotal = empenho.quantidade_empenhada * valorUnitario;
              const qtdRestante = empenho.quantidade_empenhada - empenho.quantidade_utilizada;
              
              return (
                <tr key={empenho.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 p-2">
                    {new Date(empenho.data_empenho).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="border border-gray-300 p-2 font-medium">{empenho.of_number}</td>
                  <td className="border border-gray-300 p-2">
                    <div>
                      <p className="font-medium">{empenho.estoque_materiais?.descricao}</p>
                      <p className="text-sm text-gray-600">{empenho.estoque_materiais?.codigo}</p>
                    </div>
                  </td>
                  <td className="border border-gray-300 p-2">{empenho.lote || '-'}</td>
                  <td className="border border-gray-300 p-2 text-center">
                    {empenho.quantidade_empenhada.toFixed(2)} {empenho.estoque_materiais?.unidade}
                  </td>
                  <td className="border border-gray-300 p-2 text-center">
                    {empenho.quantidade_utilizada.toFixed(2)} {empenho.estoque_materiais?.unidade}
                  </td>
                  <td className="border border-gray-300 p-2 text-center">
                    <span className={qtdRestante > 0 ? 'text-yellow-600 font-semibold' : 'text-green-600'}>
                      {qtdRestante.toFixed(2)} {empenho.estoque_materiais?.unidade}
                    </span>
                  </td>
                  <td className="border border-gray-300 p-2 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      empenho.status === 'Empenhado' ? 'bg-yellow-100 text-yellow-800' :
                      empenho.status === 'Finalizado' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {empenho.status}
                    </span>
                  </td>
                  <td className="border border-gray-300 p-2 text-right">
                    R$ {valorUnitario.toFixed(2)}
                  </td>
                  <td className="border border-gray-300 p-2 text-right">
                    R$ {valorTotal.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {empenhos.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Nenhum empenho encontrado com os filtros aplicados.
        </div>
      )}
    </div>
  );
};
