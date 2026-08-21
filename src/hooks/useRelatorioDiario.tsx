
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatBrazilianDateTime } from '@/utils/dateTimeUtils';

interface ApontamentoDiario {
  id: string;
  of_number: string;
  etapa_fase: string;
  marca: string;
  descricao: string;
  processo: string;
  quantidade: number;
  peso_unitario: number;
  peso_total: number;
  data_apontamento: string;
  created_at: string;
}

interface ResumoProcesso {
  processo: string;
  quantidade: number;
  apontamentos: number;
  peso_total: number;
}

export const useRelatorioDiario = (selectedDate: string) => {
  const [apontamentos, setApontamentos] = useState<ApontamentoDiario[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchApontamentos = async () => {
    if (!selectedDate) return;

    setLoading(true);
    try {
      console.log('Buscando apontamentos para data:', selectedDate);

      const { data: apontamentosData, error } = await supabase
        .from('apontamentos_producao')
        .select(`
          id,
          of_number,
          quantidade_produzida,
          data_apontamento,
          created_at,
          tipo_apontamento,
          peca:pecas!peca_id(
            id,
            marca,
            descricao,
            etapa_fase,
            peso_unitario
          ),
          componente:componentes_peca!componente_id(
            id,
            marca_componente,
            descricao,
            peso_unitario
          ),
          processo:processos_fabricacao!processo_id(
            nome
          )
        `)
        .eq('data_apontamento', selectedDate)
        .order('of_number')
        .order('created_at');

      if (error) {
        console.error('Erro ao buscar apontamentos:', error);
        throw error;
      }

      console.log('Apontamentos encontrados:', apontamentosData?.length || 0);
      console.log('Data de busca usada:', selectedDate);

      const apontamentosFormatados: ApontamentoDiario[] = (apontamentosData || []).map(apt => {
        // Determinar dados baseado no tipo de apontamento
        let marca, descricao, etapa_fase, peso_unitario;
        
        if (apt.tipo_apontamento === 'componente' && apt.componente) {
          marca = apt.componente.marca_componente;
          descricao = apt.componente.descricao || 'Componente';
          etapa_fase = '0'; // Componentes não têm etapa/fase
          peso_unitario = Number(apt.componente.peso_unitario || 0);
        } else if (apt.tipo_apontamento === 'peca' && apt.peca) {
          marca = apt.peca.marca;
          descricao = apt.peca.descricao || 'Peça';
          etapa_fase = apt.peca.etapa_fase || '0';
          peso_unitario = Number(apt.peca.peso_unitario || 0);
        } else {
          marca = 'N/A';
          descricao = 'N/A';
          etapa_fase = '0';
          peso_unitario = 0;
        }

        const peso_total = peso_unitario * apt.quantidade_produzida;

        return {
          id: apt.id,
          of_number: apt.of_number,
          etapa_fase,
          marca,
          descricao,
          processo: apt.processo?.nome || 'N/A',
          quantidade: apt.quantidade_produzida,
          peso_unitario,
          peso_total,
          data_apontamento: apt.data_apontamento,
          created_at: apt.created_at
        };
      });

      // Ordenar por OF, etapa_fase, marca
      apontamentosFormatados.sort((a, b) => {
        if (a.of_number !== b.of_number) {
          return a.of_number.localeCompare(b.of_number);
        }
        if (a.etapa_fase !== b.etapa_fase) {
          return a.etapa_fase.localeCompare(b.etapa_fase);
        }
        return a.marca.localeCompare(b.marca);
      });

      setApontamentos(apontamentosFormatados);
      console.log('Apontamentos formatados:', apontamentosFormatados.length);
      
    } catch (error) {
      console.error('Erro ao buscar dados do relatório diário:', error);
      toast.error('Erro ao carregar relatório diário');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApontamentos();
  }, [selectedDate]);

  // Calcular resumo por processo
  const resumoProcessos: ResumoProcesso[] = React.useMemo(() => {
    const resumo = new Map<string, { quantidade: number; apontamentos: number; peso_total: number }>();
    
    apontamentos.forEach(apt => {
      const processo = apt.processo;
      if (!resumo.has(processo)) {
        resumo.set(processo, { quantidade: 0, apontamentos: 0, peso_total: 0 });
      }
      const dados = resumo.get(processo)!;
      dados.quantidade += apt.quantidade;
      dados.apontamentos += 1;
      dados.peso_total += apt.peso_total;
    });
    
    return Array.from(resumo.entries())
      .map(([processo, dados]) => ({ processo, ...dados }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [apontamentos]);

  return {
    apontamentos,
    resumoProcessos,
    loading,
    refetch: fetchApontamentos
  };
};
