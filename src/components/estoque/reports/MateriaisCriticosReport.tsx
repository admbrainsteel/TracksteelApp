
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface MateriaisCriticosReportProps {
  filters: any;
}

export const MateriaisCriticosReport: React.FC<MateriaisCriticosReportProps> = ({ filters }) => {
  const { data: materiaisCriticos = [], isLoading } = useQuery({
    queryKey: ['relatorio-materiais-criticos', filters],
    queryFn: async () => {
      let query = supabase
        .from('estoque_materiais')
        .select('*')
        .or('status.eq.Crítico,quantidade_disponivel.lt.quantidade_minima');
      
      if (filters.descricao_material) {
        query = query.ilike('descricao', `%${filters.descricao_material}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  if (isLoading) {
    return <Skeleton className="w-full h-96" />;
  }

  return (
    <div className="space-y-6">
      <div className="text-center border-b pb-4">
        <h1 className="text-2xl font-bold text-red-800">Relatório de Materiais Críticos</h1>
        <p className="text-gray-600">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
        <div className="bg-red-50 p-3 rounded-lg mt-4">
          <p className="text-red-800 font-semibold">
            ⚠️ {materiaisCriticos.length} materiais com estoque crítico identificados
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-red-300">
          <thead>
            <tr className="bg-red-100">
              <th className="border border-red-300 p-2 text-left">Código</th>
              <th className="border border-red-300 p-2 text-left">Descrição</th>
              <th className="border border-red-300 p-2 text-center">Qtd Atual</th>
              <th className="border border-red-300 p-2 text-center">Estoque Mín.</th>
              <th className="border border-red-300 p-2 text-center">Diferença</th>
              <th className="border border-red-300 p-2 text-center">Status</th>
              <th className="border border-red-300 p-2 text-center">Ação Necessária</th>
            </tr>
          </thead>
          <tbody>
            {materiaisCriticos.map((material, index) => {
              const diferenca = (material.quantidade_disponivel || 0) - (material.quantidade_minima || 0);
              const isUrgente = diferenca <= 0;
              
              return (
                <tr key={material.id} className={index % 2 === 0 ? 'bg-white' : 'bg-red-25'}>
                  <td className="border border-red-300 p-2">{material.codigo || '-'}</td>
                  <td className="border border-red-300 p-2 font-medium">{material.descricao}</td>
                  <td className="border border-red-300 p-2 text-center font-bold text-red-800">
                    {material.quantidade_disponivel?.toFixed(2) || '0'}
                  </td>
                  <td className="border border-red-300 p-2 text-center">
                    {material.quantidade_minima?.toFixed(2) || '0'}
                  </td>
                  <td className="border border-red-300 p-2 text-center">
                    <span className={`font-bold ${diferenca < 0 ? 'text-red-600' : 'text-orange-600'}`}>
                      {diferenca.toFixed(2)}
                    </span>
                  </td>
                  <td className="border border-red-300 p-2 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      isUrgente ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800'
                    }`}>
                      {isUrgente ? 'URGENTE' : 'CRÍTICO'}
                    </span>
                  </td>
                  <td className="border border-red-300 p-2 text-center">
                    <span className="text-sm font-medium">
                      Comprar {Math.abs(diferenca).toFixed(2)} {material.unidade || 'un'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {materiaisCriticos.length === 0 && (
        <div className="text-center py-8">
          <div className="bg-green-50 p-6 rounded-lg">
            <p className="text-green-800 font-semibold text-lg">✅ Nenhum material crítico encontrado!</p>
            <p className="text-green-600">Todos os materiais estão com estoque adequado.</p>
          </div>
        </div>
      )}
    </div>
  );
};
