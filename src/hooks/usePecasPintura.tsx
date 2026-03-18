
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PecaPintura {
  id: string;
  marca: string;
  etapa_fase: string;
  descricao: string;
  peso_unitario: number;
  quantidade_disponivel: number;
  of_number: string;
}

export const usePecasPintura = (ofNumber?: string, processoId?: string) => {
  return useQuery({
    queryKey: ['pecas-pintura', ofNumber, processoId],
    queryFn: async (): Promise<PecaPintura[]> => {
      if (!ofNumber || !processoId) {
        console.log('Parâmetros obrigatórios não fornecidos:', { ofNumber, processoId });
        return [];
      }

      console.log('Buscando peças para OF:', ofNumber, 'Processo:', processoId);

      // Buscar informações do processo selecionado
      const { data: processoAtual, error: processoError } = await supabase
        .from('processos_fabricacao')
        .select('nome')
        .eq('id', processoId)
        .single();

      if (processoError) {
        console.error('Erro ao buscar processo atual:', processoError);
        throw processoError;
      }

      console.log('Processo atual encontrado:', processoAtual?.nome);

      // Para Expedição, buscar peças que passaram por Pintura/Galv
      let processosQuery = supabase
        .from('processos_fabricacao')
        .select('id')
        .or('nome.ilike.%pintura%,nome.ilike.%galv%,nome.ilike.%galvanização%');

      const { data: processosIds, error: processosError } = await processosQuery;

      if (processosError) {
        console.error('Erro ao buscar processos predecessores:', processosError);
        throw processosError;
      }

      console.log('Processos de pintura/galv encontrados:', processosIds);

      if (!processosIds || processosIds.length === 0) {
        console.log('Nenhum processo de pintura/galvanização encontrado');
        return [];
      }

      const processosIdsList = processosIds.map(p => p.id);

      // Buscar peças que passaram pelos processos de pintura/galv
      const { data: apontamentos, error: apontamentosError } = await supabase
        .from('apontamentos_producao')
        .select(`
          peca_id,
          quantidade_produzida,
          pecas!inner(
            id,
            marca,
            etapa_fase,
            descricao,
            peso_unitario,
            of_number
          )
        `)
        .eq('of_number', ofNumber)
        .in('processo_id', processosIdsList)
        .eq('tipo_apontamento', 'peca');

      if (apontamentosError) {
        console.error('Erro ao buscar apontamentos:', apontamentosError);
        throw apontamentosError;
      }

      console.log('Apontamentos encontrados:', apontamentos?.length || 0);

      // Buscar quantidades já expedidas em romaneios
      const { data: itensExpedidos, error: expedidosError } = await supabase
        .from('itens_romaneio_pecas')
        .select(`
          peca_id,
          quantidade_expedida,
          romaneios_expedicao!inner(of_number)
        `)
        .eq('romaneios_expedicao.of_number', ofNumber);

      if (expedidosError) {
        console.error('Erro ao buscar itens expedidos:', expedidosError);
        throw expedidosError;
      }

      console.log('Itens já expedidos:', itensExpedidos?.length || 0);

      // Agrupar por peça e calcular disponibilidade
      const pecasMap = new Map<string, PecaPintura>();

      // Processar apontamentos para calcular quantidade produzida total por peça
      apontamentos?.forEach((apontamento) => {
        const peca = apontamento.pecas;
        if (!peca) return;

        const key = peca.id;
        if (pecasMap.has(key)) {
          const existingPeca = pecasMap.get(key)!;
          existingPeca.quantidade_disponivel += apontamento.quantidade_produzida;
        } else {
          pecasMap.set(key, {
            id: peca.id,
            marca: peca.marca || '',
            etapa_fase: peca.etapa_fase || '',
            descricao: peca.descricao || '',
            peso_unitario: peca.peso_unitario || 0,
            quantidade_disponivel: apontamento.quantidade_produzida,
            of_number: peca.of_number
          });
        }
      });

      // Subtrair quantidades já expedidas
      itensExpedidos?.forEach((item) => {
        if (pecasMap.has(item.peca_id)) {
          const peca = pecasMap.get(item.peca_id)!;
          peca.quantidade_disponivel -= item.quantidade_expedida;
        }
      });

      // Filtrar apenas peças com quantidade disponível > 0
      const pecasDisponiveis = Array.from(pecasMap.values()).filter(
        peca => peca.quantidade_disponivel > 0
      );

      console.log(`Peças disponíveis após filtro:`, pecasDisponiveis.length);
      console.log('Peças encontradas:', pecasDisponiveis.map(p => `${p.marca} - ${p.etapa_fase} (${p.quantidade_disponivel})`));

      return pecasDisponiveis;
    },
    enabled: !!ofNumber && !!processoId,
    staleTime: 30000, // Cache por 30 segundos
    refetchOnWindowFocus: false
  });
};
