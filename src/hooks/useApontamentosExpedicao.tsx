
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ApontamentoExpedicao {
  of_number: string;
  etapa_fase: string;
  marca: string;
  descricao: string;
  quantidade_expedida: number;
  peso_total_expedido: number;
}

interface PecaCompleta {
  id: string;
  of_number: string;
  etapa_fase: string;
  marca: string;
  descricao: string;
  quantidade_total: number;
  peso_unitario: number;
  peso_total: number;
}

// Função para ordenação numérica natural
const naturalSort = (a: string, b: string): number => {
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base'
  });
  return collator.compare(a, b);
};

export const useApontamentosExpedicao = (ofNumber: string) => {
  const [apontamentosExpedicao, setApontamentosExpedicao] = useState<ApontamentoExpedicao[]>([]);
  const [pecasCompletas, setPecasCompletas] = useState<PecaCompleta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApontamentosExpedicao = async () => {
      try {
        setLoading(true);
        
        // Buscar dados das peças da OF
        const { data: pecasData, error: pecasError } = await supabase
          .from('pecas')
          .select('*')
          .eq('of_number', ofNumber);

        if (pecasError) throw pecasError;

        // Mapear os dados para o formato esperado
        const pecasFormatadas = (pecasData || []).map(peca => ({
          id: peca.id,
          of_number: peca.of_number,
          etapa_fase: peca.etapa_fase || '',
          marca: peca.marca,
          descricao: peca.descricao || '',
          quantidade_total: peca.quantidade || 0,
          peso_unitario: peca.peso_unitario || 0,
          peso_total: peca.peso_total || 0
        }));

        // Ordenar peças por etapa_fase e marca com ordenação numérica natural
        pecasFormatadas.sort((a, b) => {
          const faseComparison = naturalSort(a.etapa_fase, b.etapa_fase);
          if (faseComparison !== 0) return faseComparison;
          return naturalSort(a.marca, b.marca);
        });

        // Buscar itens de romaneio expedidos para esta OF apenas de romaneios entregues ou conferidos
        const { data: itensRomaneio, error: itensError } = await supabase
          .from('itens_romaneio_pecas')
          .select(`
            marca,
            fase,
            descricao,
            quantidade_expedida,
            peso_unitario,
            romaneios_expedicao!inner(of_number, status)
          `)
          .eq('romaneios_expedicao.of_number', ofNumber)
          .in('romaneios_expedicao.status', ['Entregue', 'Conferido em Obra']);

        if (itensError) {
          console.error('Erro ao buscar itens de romaneio:', itensError);
          // Continuar sem os dados de expedição se não conseguir buscar
          setPecasCompletas(pecasFormatadas);
          setApontamentosExpedicao([]);
          return;
        }

        console.log('Itens de romaneio encontrados (apenas entregues/conferidos):', itensRomaneio?.length || 0);

        // Processar itens de romaneio agrupando por OF + Fase + Marca
        const itensAgrupados = (itensRomaneio || []).reduce((acc, item) => {
          const key = `${ofNumber}-${item.fase || ''}-${item.marca}`;
          
          if (acc[key]) {
            acc[key].quantidade_expedida += item.quantidade_expedida;
            acc[key].peso_total_expedido += item.quantidade_expedida * item.peso_unitario;
          } else {
            acc[key] = {
              of_number: ofNumber,
              etapa_fase: item.fase || '',
              marca: item.marca,
              descricao: item.descricao || '',
              quantidade_expedida: item.quantidade_expedida,
              peso_total_expedido: item.quantidade_expedida * item.peso_unitario
            };
          }
          
          return acc;
        }, {} as Record<string, ApontamentoExpedicao>);

        const apontamentosArray = Object.values(itensAgrupados);
        
        // Ordenar apontamentos por etapa_fase e marca com ordenação numérica natural
        apontamentosArray.sort((a, b) => {
          const faseComparison = naturalSort(a.etapa_fase, b.etapa_fase);
          if (faseComparison !== 0) return faseComparison;
          return naturalSort(a.marca, b.marca);
        });

        setPecasCompletas(pecasFormatadas);
        setApontamentosExpedicao(apontamentosArray);
      } catch (error) {
        console.error('Erro ao buscar apontamentos de expedição:', error);
        toast.error('Erro ao carregar dados de expedição');
      } finally {
        setLoading(false);
      }
    };

    if (ofNumber) {
      fetchApontamentosExpedicao();
    }
  }, [ofNumber]);

  return {
    apontamentosExpedicao,
    pecasCompletas,
    loading
  };
};
