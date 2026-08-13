
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OFAtiva {
  of_number: string;
  descricao_resumida?: string;
  cliente?: string;
  gestor?: string;
}

export const useOFsAtivas = () => {
  const { data: ofsAtivas = [], isLoading } = useQuery({
    queryKey: ['ofs-ativas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_fabricacao')
        .select(`
          num_of,
          descritivo,
          gestor,
          ficha_tecnica_contratos (
            cliente
          )
        `)
        .eq('status', 'ativa')
        .order('num_of');

      if (error) {
        console.error('Erro ao buscar OFs ativas:', error);
        throw error;
      }

      return data.map((of: any) => ({
        of_number: of.num_of,
        descricao_resumida: of.descritivo,
        gestor: of.gestor,
        cliente: of.ficha_tecnica_contratos?.cliente
      })) as OFAtiva[];
    },
  });

  return {
    ofsAtivas,
    data: ofsAtivas, // Mantém compatibilidade com código existente
    isLoading,
  };
};
