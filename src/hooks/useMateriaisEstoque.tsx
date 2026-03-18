
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MaterialEstoque {
  id: string;
  descricao: string;
  unidade: string;
  tipo_material_id?: string;
  tipo_material_nome?: string;
  codigo: string;
  quantidade_disponivel?: number;
  peso_unitario?: number;
  valor_unitario?: number;
}

export const useMateriaisEstoque = (filters?: {
  tipo?: string;
  busca?: string;
}) => {
  const { data: materiais = [], isLoading } = useQuery({
    queryKey: ['materiais-estoque', filters],
    queryFn: async () => {
      let query = supabase
        .from('estoque_materiais')
        .select(`
          id, 
          descricao, 
          unidade, 
          tipo_material_id, 
          codigo, 
          quantidade_disponivel, 
          peso_unitario, 
          valor_unitario,
          tipos_materia_prima!tipo_material_id(nome)
        `)
        .order('descricao');

      if (filters?.tipo) {
        // Buscar IDs dos tipos de material pelo nome
        const { data: tiposData } = await supabase
          .from('tipos_materia_prima')
          .select('id')
          .eq('nome', filters.tipo);
        
        if (tiposData && tiposData.length > 0) {
          query = query.eq('tipo_material_id', tiposData[0].id);
        }
      }

      if (filters?.busca) {
        query = query.ilike('descricao', `%${filters.busca}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar materiais:', error);
        throw error;
      }

      return (data || []).map(item => ({
        id: item.id,
        descricao: item.descricao,
        unidade: item.unidade,
        tipo_material_id: item.tipo_material_id,
        tipo_material_nome: item.tipos_materia_prima?.nome || 'N/A',
        codigo: item.codigo,
        quantidade_disponivel: item.quantidade_disponivel,
        peso_unitario: item.peso_unitario,
        valor_unitario: item.valor_unitario
      })) as MaterialEstoque[];
    },
  });

  return {
    materiais,
    isLoading,
  };
};
