
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useMateriaisEmSC = () => {
  return useQuery({
    queryKey: ['materiais-em-sc'],
    queryFn: async () => {
      // Buscar SCs não concluídas
      const { data: solicitacoes, error: scError } = await supabase
        .from('solicitacoes_compra')
        .select(`
          id,
          numero_sc,
          status,
          itens_solicitacao_compra (
            material_id,
            quantidade,
            estoque_materiais (
              id,
              codigo,
              descricao
            )
          )
        `)
        .neq('status', 'Concluída');

      if (scError) throw scError;

      // Criar mapa de materiais em SCs não concluídas
      const materiaisEmSC = new Map();
      
      solicitacoes?.forEach(sc => {
        sc.itens_solicitacao_compra?.forEach(item => {
          if (item.material_id && item.estoque_materiais) {
            const materialId = item.material_id;
            if (!materiaisEmSC.has(materialId)) {
              materiaisEmSC.set(materialId, {
                material: item.estoque_materiais,
                solicitacoes: []
              });
            }
            materiaisEmSC.get(materialId).solicitacoes.push({
              numero_sc: sc.numero_sc,
              status: sc.status,
              quantidade: item.quantidade
            });
          }
        });
      });

      return materiaisEmSC;
    },
  });
};
