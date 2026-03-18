
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { perfilsData } from '@/utils/perfilsData';

export const usePopulatePerfisMateriais = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const materiaisData = perfilsData.map(perfil => ({
        codigo: perfil.descricao,
        descricao: perfil.descricao,
        tipo_material_id: null,
        unidade: 'KG',
        peso_unitario: perfil.peso,
        quantidade_total: 10,
        quantidade_disponivel: 10,
        quantidade_empenhada: 0,
        quantidade_minima: 1,
        quantidade_maxima: null,
        lote_atual: null,
        fornecedor: null,
        localizacao: null,
        status: 'Normal',
        certificado: null,
        observacoes: 'Perfil W/HP - Cadastrado automaticamente'
      }));

      // Verificar se já existem dados para evitar duplicação
      const { data: existingMaterials } = await supabase
        .from('estoque_materiais')
        .select('codigo')
        .in('codigo', materiaisData.map(m => m.codigo));

      const existingCodes = existingMaterials?.map(m => m.codigo) || [];
      const newMaterials = materiaisData.filter(m => !existingCodes.includes(m.codigo));

      if (newMaterials.length === 0) {
        throw new Error('Todos os perfis já foram cadastrados anteriormente');
      }

      const { data, error } = await supabase
        .from('estoque_materiais')
        .insert(newMaterials)
        .select();
      
      if (error) throw error;
      return { inserted: newMaterials.length, total: materiaisData.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['estoque-materiais'] });
      toast.success(`${result.inserted} perfis W/HP cadastrados com sucesso!`);
    },
    onError: (error: any) => {
      console.error('Erro ao popular perfis:', error);
      toast.error(error.message || 'Erro ao cadastrar perfis W/HP');
    },
  });
};
