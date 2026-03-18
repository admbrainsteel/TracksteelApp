import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PecaExpedida {
  id: string;
  marca: string;
  descricao: string;
  peso_unitario: number;
  quantidade_expedida: number;
  quantidade_ja_apontada: number;
  saldo_disponivel: number;
  peca_id: string;
  of_number: string;
}

export const usePecasExpedidas = (ofNumber: string) => {
  return useQuery({
    queryKey: ['pecas_expedidas', ofNumber],
    queryFn: async () => {
      if (!ofNumber) return [];

      // Buscar peças expedidas nos romaneios
      const { data: pecasExpedidas, error: errorExpedidas } = await supabase
        .from('itens_romaneio_pecas')
        .select(`
          marca,
          descricao,
          peso_unitario,
          quantidade_expedida,
          peca_id,
          romaneios_expedicao!inner(
            of_number
          )
        `)
        .eq('romaneios_expedicao.of_number', ofNumber);

      if (errorExpedidas) throw errorExpedidas;

      // Agrupar por marca e somar quantidades expedidas
      const pecasAgrupadas = (pecasExpedidas || []).reduce((acc, item) => {
        const key = item.marca;
        if (!acc[key]) {
          acc[key] = {
            id: `${item.peca_id}_${key}`,
            marca: item.marca,
            descricao: item.descricao || '',
            peso_unitario: item.peso_unitario,
            quantidade_expedida: 0,
            quantidade_ja_apontada: 0,
            saldo_disponivel: 0,
            peca_id: item.peca_id,
            of_number: ofNumber
          };
        }
        acc[key].quantidade_expedida += item.quantidade_expedida;
        return acc;
      }, {} as Record<string, PecaExpedida>);

      // Buscar quantidades já apontadas no RDO
      const { data: apontamentosRDO, error: errorRDO } = await supabase
        .from('apontamentos_peca_obra')
        .select(`
          marca_peca,
          quantidade,
          diario_obra_rdo!inner(
            of_number
          )
        `)
        .eq('diario_obra_rdo.of_number', ofNumber);

      if (errorRDO) throw errorRDO;

      // Somar quantidades já apontadas por marca
      const apontamentosAgrupados = (apontamentosRDO || []).reduce((acc, item) => {
        const key = item.marca_peca;
        acc[key] = (acc[key] || 0) + item.quantidade;
        return acc;
      }, {} as Record<string, number>);

      // Calcular saldo disponível
      const resultado = Object.values(pecasAgrupadas).map(peca => ({
        ...peca,
        quantidade_ja_apontada: apontamentosAgrupados[peca.marca] || 0,
        saldo_disponivel: peca.quantidade_expedida - (apontamentosAgrupados[peca.marca] || 0)
      })).filter(peca => peca.quantidade_expedida > 0);

      return resultado;
    },
    enabled: !!ofNumber,
  });
};

export const usePecasComSaldo = (ofNumber: string) => {
  const { data: pecasExpedidas = [] } = usePecasExpedidas(ofNumber);
  return {
    data: pecasExpedidas.filter(peca => peca.saldo_disponivel > 0),
    isLoading: false
  };
};