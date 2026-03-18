
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';

export interface EstoqueMaterial {
  id: string;
  codigo: string;
  descricao: string;
  tipo_material_id?: string;
  unidade: string;
  quantidade_total: number;
  quantidade_disponivel: number;
  quantidade_empenhada: number;
  quantidade_minima: number;
  quantidade_maxima?: number;
  peso_unitario: number;
  valor_unitario?: number;
  lote_atual?: string;
  fornecedor?: string;
  localizacao?: string;
  status: 'Normal' | 'Crítico' | 'Excesso';
  certificado?: string;
  observacoes?: string;
  comprimento?: number;
  largura?: number;
  espessura?: number;
  qualidade_aco?: string;
  kg_por_metro?: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  tipos_materia_prima?: {
    nome: string;
    descricao?: string;
    categoria?: string;
    gestao_estoque_critico?: boolean;
  } | null;
}

export const useEstoqueMateriais = () => {
  return useQuery({
    queryKey: ['estoque-materiais'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estoque_materiais')
        .select(`
          *,
          tipos_materia_prima (
            nome,
            descricao,
            categoria,
            gestao_estoque_critico
          )
        `)
        .order('codigo');
      
      if (error) throw error;
      
      // Transform the raw data to match our EstoqueMaterial interface
      const transformedData = (data || []).map(item => {
        // Ensure tipos_materia_prima is properly typed
        const tiposMaterial = item.tipos_materia_prima 
          ? {
              nome: item.tipos_materia_prima.nome || '',
              descricao: item.tipos_materia_prima.descricao || undefined,
              categoria: item.tipos_materia_prima.categoria || undefined,
              gestao_estoque_critico: item.tipos_materia_prima.gestao_estoque_critico ?? true
            }
          : null;

        return {
          ...item,
          tipos_materia_prima: tiposMaterial
        };
      }) as EstoqueMaterial[];
      
      return transformedData;
    },
  });
};

export const useTiposMateriaPrima = () => {
  return useQuery({
    queryKey: ['tipos-materia-prima'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tipos_materia_prima')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      return data;
    },
  });
};

export const useCriarMaterial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (material: {
      codigo: string;
      descricao: string;
      tipo_material_id?: string;
      unidade: string;
      quantidade_total: number;
      quantidade_disponivel: number;
      quantidade_empenhada: number;
      quantidade_minima: number;
      quantidade_maxima?: number;
      peso_unitario: number;
      valor_unitario?: number;
      lote_atual?: string;
      fornecedor?: string;
      localizacao?: string;
      status: 'Normal' | 'Crítico' | 'Excesso';
      certificado?: string;
      observacoes?: string;
      comprimento?: number;
      largura?: number;
      espessura?: number;
      qualidade_aco?: string;
      kg_por_metro?: number;
      created_by?: string;
    }) => {
      const { data, error } = await supabase
        .from('estoque_materiais')
        .insert(material)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque-materiais'] });
      toast.success('Material criado com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao criar material:', error);
      toast.error('Erro ao criar material');
    }
  });
};

export const useAtualizarMaterial = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (material: Partial<EstoqueMaterial> & { id: string }) => {
      const { id, tipos_materia_prima, created_at, updated_at, ...updateData } = material;
      const { error } = await supabase
        .from('estoque_materiais')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      return material;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque-materiais'] });
      toast.success('Material atualizado com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao atualizar material:', error);
      toast.error('Erro ao atualizar material');
    }
  });
};

export const useExcluirMateriais = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (materialIds: string[]) => {
      const { error } = await supabase
        .from('estoque_materiais')
        .delete()
        .in('id', materialIds);

      if (error) throw error;
      return materialIds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque-materiais'] });
      toast.success('Materiais excluídos com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao excluir materiais:', error);
      toast.error('Erro ao excluir materiais');
    }
  });
};

export const useDuplicarMaterial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (material: EstoqueMaterial) => {
      const { id, created_at, updated_at, tipos_materia_prima, ...materialData } = material;
      const duplicatedMaterial = {
        ...materialData,
        codigo: `${material.codigo}_COPY`,
        descricao: `${material.descricao} (Cópia)`
      };

      const { data, error } = await supabase
        .from('estoque_materiais')
        .insert(duplicatedMaterial)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque-materiais'] });
      toast.success('Material duplicado com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao duplicar material:', error);
      toast.error('Erro ao duplicar material');
    }
  });
};

export const useMovimentacoesEstoque = () => {
  return useQuery({
    queryKey: ['movimentacoes-estoque'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movimentacoes_estoque')
        .select(`
          *,
          estoque_materiais (
            codigo,
            descricao
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

export const useCriarTipoMaterial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tipo: {
      nome: string;
      descricao?: string;
      categoria: string;
      gestao_estoque_critico: boolean;
      caracteristicas: any;
      controles: any;
      ativo: boolean;
    }) => {
      const { data, error } = await supabase
        .from('tipos_materia_prima')
        .insert([tipo]);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-materia-prima'] });
      toast.success('Tipo de material criado com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao criar tipo de material:', error);
      toast.error('Erro ao criar tipo de material');
    }
  });
};

export const useAtualizarTipoMaterial = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tipo: {
      id: string;
      nome: string;
      descricao?: string;
      categoria?: string;
      caracteristicas?: any;
      controles?: any;
      ativo?: boolean;
      gestao_estoque_critico?: boolean;
    }) => {
      const { error } = await supabase
        .from('tipos_materia_prima')
        .update({
          nome: tipo.nome,
          descricao: tipo.descricao,
          categoria: tipo.categoria,
          caracteristicas: tipo.caracteristicas || {},
          controles: tipo.controles || {},
          ativo: tipo.ativo ?? true,
          gestao_estoque_critico: tipo.gestao_estoque_critico ?? true
        })
        .eq('id', tipo.id);
      
      if (error) throw error;
      return tipo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-materia-prima'] });
      toast.success('Tipo de material atualizado com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao atualizar tipo de material:', error);
      toast.error('Erro ao atualizar tipo de material');
    }
  });
};

export const useExcluirTipoMaterial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tipos_materia_prima')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-materia-prima'] });
      toast.success('Tipo de material excluído com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao excluir tipo de material:', error);
      toast.error('Erro ao excluir tipo de material');
    }
  });
};

export const useEstoque = () => {
  const [tiposSelecionados, setTiposSelecionados] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: materiais = [], isLoading: loading, refetch } = useEstoqueMateriais();

  // Recalcular status baseado na gestão de estoque crítico
  const materiaisComStatusAtualizado = useMemo(() => {
    return materiais.map(material => {
      const temGestaoAtivada = material.tipos_materia_prima?.gestao_estoque_critico !== false;
      
      let status = material.status;
      
      // Se não tem gestão ativada, nunca pode ser crítico
      if (!temGestaoAtivada && status === 'Crítico') {
        if (material.quantidade_maxima && material.quantidade_disponivel >= material.quantidade_maxima) {
          status = 'Excesso';
        } else {
          status = 'Normal';
        }
      }
      // Se tem gestão ativada, recalcular normalmente
      else if (temGestaoAtivada) {
        if (material.quantidade_disponivel <= material.quantidade_minima && material.quantidade_minima > 0) {
          status = 'Crítico';
        } else if (material.quantidade_maxima && material.quantidade_disponivel >= material.quantidade_maxima) {
          status = 'Excesso';
        } else {
          status = 'Normal';
        }
      }
      
      return {
        ...material,
        status
      };
    });
  }, [materiais]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalKg = materiaisComStatusAtualizado.reduce((acc, material) => {
      const kgPorMetro = material.kg_por_metro || 0;
      const comprimento = material.comprimento || 0;
      const quantidadeTotal = material.quantidade_total || 0;
      const kgItem = (kgPorMetro * comprimento / 1000) * quantidadeTotal;
      return acc + kgItem;
    }, 0);

    const totalUnidades = materiaisComStatusAtualizado.reduce((acc, material) => acc + (material.quantidade_total || 0), 0);
    const totalDisponiveis = materiaisComStatusAtualizado.reduce((acc, material) => acc + (material.quantidade_disponivel || 0), 0);
    const totalEmpenhadas = materiaisComStatusAtualizado.reduce((acc, material) => acc + (material.quantidade_empenhada || 0), 0);

    return {
      totalKg,
      totalUnidades,
      totalDisponiveis,
      totalEmpenhadas
    };
  }, [materiaisComStatusAtualizado]);

  const refreshData = () => {
    refetch();
  };

  return {
    materiais: materiaisComStatusAtualizado,
    loading,
    tiposSelecionados,
    searchTerm,
    setSearchTerm,
    setTiposSelecionados,
    stats,
    refreshData
  };
};
