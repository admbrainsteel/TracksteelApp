
import React from 'react';
import { Package } from 'lucide-react';
import { useApontamentosProducao } from '@/hooks/useApontamentosProducao';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ApontamentosFilters } from './historico/ApontamentosFilters';
import { ApontamentosResultsList } from './historico/ApontamentosResultsList';
import { useApontamentosFilters } from './historico/useApontamentosFilters';

export const ApontamentosListOtimizado: React.FC = () => {
  const { apontamentos, loading, refetch } = useApontamentosProducao();
  
  const {
    searchTerm,
    setSearchTerm,
    filterOF,
    filterFase,
    filterProcesso,
    dataInicio,
    dataFim,
    setDataInicio,
    setDataFim,
    uniqueOFs,
    uniqueFases,
    uniqueProcessos,
    filteredApontamentos,
    initialized,
    handleOFChange,
    handleFaseChange,
    handleProcessoChange,
    clearFilters
  } = useApontamentosFilters(apontamentos);

  const handleReverterApontamento = async (apontamentoId: string) => {
    try {
      console.log('Iniciando reversão do apontamento:', apontamentoId);
      
      // Buscar informações do apontamento antes de deletar para logs
      const { data: apontamentoInfo } = await supabase
        .from('apontamentos_producao')
        .select(`
          of_number,
          quantidade_produzida,
          peca:pecas!peca_id(marca),
          componente:componentes_peca!componente_id(marca_componente),
          processo:processos_fabricacao!processo_id(nome)
        `)
        .eq('id', apontamentoId)
        .single();

      if (apontamentoInfo) {
        const marca = apontamentoInfo.peca?.marca || apontamentoInfo.componente?.marca_componente || 'N/A';
        console.log(`Revertendo apontamento: ${marca} - ${apontamentoInfo.quantidade_produzida} unidades - OF: ${apontamentoInfo.of_number}`);
      }

      // Deletar o apontamento
      const { error } = await supabase
        .from('apontamentos_producao')
        .delete()
        .eq('id', apontamentoId);

      if (error) {
        console.error('Erro ao deletar apontamento:', error);
        throw error;
      }

      console.log('Apontamento deletado com sucesso, atualizando lista...');
      toast.success('Apontamento revertido com sucesso!');
      
      // Forçar atualização dos dados
      await refetch();
      console.log('Lista de apontamentos atualizada');
      
    } catch (error: unknown) {
      console.error('Erro completo ao reverter apontamento:', error);
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao reverter apontamento: ${msg}`);
    }
  };

  if (loading || !initialized) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 animate-spin" />
          <span>Carregando histórico...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ApontamentosFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterOF={filterOF}
        filterFase={filterFase}
        filterProcesso={filterProcesso}
        dataInicio={dataInicio}
        dataFim={dataFim}
        setDataInicio={setDataInicio}
        setDataFim={setDataFim}
        uniqueOFs={uniqueOFs}
        uniqueFases={uniqueFases}
        uniqueProcessos={uniqueProcessos}
        handleOFChange={handleOFChange}
        handleFaseChange={handleFaseChange}
        handleProcessoChange={handleProcessoChange}
        clearFilters={clearFilters}
      />

      <ApontamentosResultsList
        filteredApontamentos={filteredApontamentos}
        onRevert={handleReverterApontamento}
      />
    </div>
  );
};
