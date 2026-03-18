
import { useMemo } from 'react';
import { useEstoque } from './useEstoqueSimplificado';

export const useMateriaisCriticos = () => {
  const { materiais, loading } = useEstoque();

  const materiaisCriticos = useMemo(() => {
    return materiais.filter(material => {
      // Verificar se o tipo de material tem gestão de estoque crítico ativada
      // Se gestao_estoque_critico for undefined ou null, considerar como true (padrão)
      const temGestaoAtivada = material.tipos_materia_prima?.gestao_estoque_critico !== false;
      
      // Debug log para verificar o filtro
      console.log(`Material ${material.descricao}:`, {
        gestao_estoque_critico: material.tipos_materia_prima?.gestao_estoque_critico,
        temGestaoAtivada,
        quantidade_disponivel: material.quantidade_disponivel,
        quantidade_minima: material.quantidade_minima,
        isCritico: material.quantidade_disponivel <= (material.quantidade_minima || 0) && material.quantidade_minima > 0
      });
      
      // Só considera crítico se:
      // 1. Tem gestão de estoque crítico ativada no tipo
      // 2. Quantidade disponível <= quantidade mínima
      // 3. Quantidade mínima > 0
      return temGestaoAtivada && 
             material.quantidade_disponivel <= (material.quantidade_minima || 0) &&
             (material.quantidade_minima || 0) > 0;
    });
  }, [materiais]);

  console.log('Materiais críticos encontrados:', materiaisCriticos.length);

  return {
    materiaisCriticos,
    loading,
    totalCriticos: materiaisCriticos.length
  };
};
