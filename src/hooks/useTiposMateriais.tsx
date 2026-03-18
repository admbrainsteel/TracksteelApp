
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TipoMaterial {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
}

export const useTiposMateriais = () => {
  const { data: tiposMateriais = [], isLoading } = useQuery({
    queryKey: ['tipos-materiais'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tipos_materia_prima')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) {
        console.error('Erro ao buscar tipos de materiais:', error);
        throw error;
      }

      return data as TipoMaterial[];
    },
  });

  return {
    tiposMateriais,
    isLoading,
  };
};
