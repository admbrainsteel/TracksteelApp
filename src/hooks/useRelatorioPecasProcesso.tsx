
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PecaComStatus {
  id: string;
  of_number: string;
  etapa_fase: string;
  marca: string;
  quantidade: number;
  peso_unitario: number;
  peso_total: number;
  tem_componentes: boolean;
  processos: {
    corte: boolean;
    solda: boolean;
    pintura: boolean;
    expedicao: boolean;
  };
}

export interface ResumoProcesso {
  processo: string;
  pesoTotal: number;
  quantidadePecas: number;
}

// Função para ordenação numérica natural
const naturalSort = (a: string, b: string): number => {
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base'
  });
  return collator.compare(a, b);
};

export const useRelatorioPecasProcesso = (ofNumber: string) => {
  const [pecasComStatus, setPecasComStatus] = useState<PecaComStatus[]>([]);
  const [resumoProcessos, setResumoProcessos] = useState<ResumoProcesso[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPecasComStatus = async () => {
      if (!ofNumber) {
        setPecasComStatus([]);
        setResumoProcessos([]);
        return;
      }

      setLoading(true);
      try {
        console.log('Buscando peças e status para OF:', ofNumber);

        // Buscar peças da OF incluindo tem_componentes
        const { data: pecasData, error: pecasError } = await supabase
          .from('pecas')
          .select('id, of_number, etapa_fase, marca, quantidade, peso_unitario, peso_total, tem_componentes')
          .eq('of_number', ofNumber);

        if (pecasError) {
          console.error('Erro ao buscar peças:', pecasError);
          throw pecasError;
        }

        if (!pecasData || pecasData.length === 0) {
          console.log('Nenhuma peça encontrada para OF:', ofNumber);
          setPecasComStatus([]);
          setResumoProcessos([]);
          return;
        }

        console.log('Peças encontradas:', pecasData.length);

        // Buscar processos e seus IDs - incluindo variações de nome
        const { data: processosData, error: processosError } = await supabase
          .from('processos_fabricacao')
          .select('id, nome')
          .in('nome', ['Corte', 'Solda', 'Pintura/Galvanizacao', 'Pintura/Galv', 'Pintura', 'Expedicao']);

        if (processosError) {
          console.error('Erro ao buscar processos:', processosError);
          throw processosError;
        }

        const processosMap = new Map(processosData?.map(p => [p.nome, p.id]) || []);
        console.log('Processos mapeados:', Object.fromEntries(processosMap));

        // Buscar apontamentos para todas as peças da OF
        const pecaIds = pecasData.map(p => p.id);
        const { data: apontamentosData, error: apontamentosError } = await supabase
          .from('apontamentos_producao')
          .select(`
            peca_id,
            processo_id,
            quantidade_produzida,
            processos_fabricacao!inner(nome)
          `)
          .eq('of_number', ofNumber)
          .in('peca_id', pecaIds);

        if (apontamentosError) {
          console.error('Erro ao buscar apontamentos:', apontamentosError);
          throw apontamentosError;
        }

        console.log('Apontamentos encontrados:', apontamentosData?.length || 0);

        // Mapear status dos processos por peça
        const statusPorPeca = new Map<string, Set<string>>();
        
        apontamentosData?.forEach(apt => {
          if (!statusPorPeca.has(apt.peca_id)) {
            statusPorPeca.set(apt.peca_id, new Set());
          }
          statusPorPeca.get(apt.peca_id)!.add(apt.processos_fabricacao.nome);
        });

        // Construir array de peças com status
        const pecasComStatusFormatadas: PecaComStatus[] = pecasData.map(peca => {
          const processosRealizados = statusPorPeca.get(peca.id) || new Set();
          
          return {
            id: peca.id,
            of_number: peca.of_number,
            etapa_fase: peca.etapa_fase || '',
            marca: peca.marca,
            quantidade: peca.quantidade || 0,
            peso_unitario: Number(peca.peso_unitario || 0),
            peso_total: Number(peca.peso_total || 0),
            tem_componentes: peca.tem_componentes || false,
            processos: {
              corte: processosRealizados.has('Corte'),
              solda: processosRealizados.has('Solda'),
              pintura: processosRealizados.has('Pintura/Galvanizacao') || 
                       processosRealizados.has('Pintura/Galv') || 
                       processosRealizados.has('Pintura'),
              expedicao: processosRealizados.has('Expedicao')
            }
          };
        });

        // Ordenar peças por etapa_fase e marca com ordenação numérica natural
        pecasComStatusFormatadas.sort((a, b) => {
          const faseComparison = naturalSort(a.etapa_fase, b.etapa_fase);
          if (faseComparison !== 0) return faseComparison;
          return naturalSort(a.marca, b.marca);
        });

        console.log('Peças com status formatadas:', pecasComStatusFormatadas.length);

        // Calcular resumo por processo
        const resumo: ResumoProcesso[] = [
          {
            processo: 'Corte',
            pesoTotal: pecasComStatusFormatadas
              .filter(p => p.processos.corte)
              .reduce((sum, p) => sum + p.peso_total, 0),
            quantidadePecas: pecasComStatusFormatadas.filter(p => p.processos.corte).length
          },
          {
            processo: 'Solda',
            pesoTotal: pecasComStatusFormatadas
              .filter(p => p.processos.solda)
              .reduce((sum, p) => sum + p.peso_total, 0),
            quantidadePecas: pecasComStatusFormatadas.filter(p => p.processos.solda).length
          },
          {
            processo: 'Pintura/Galvanização',
            pesoTotal: pecasComStatusFormatadas
              .filter(p => p.processos.pintura)
              .reduce((sum, p) => sum + p.peso_total, 0),
            quantidadePecas: pecasComStatusFormatadas.filter(p => p.processos.pintura).length
          },
          {
            processo: 'Expedição',
            pesoTotal: pecasComStatusFormatadas
              .filter(p => p.processos.expedicao)
              .reduce((sum, p) => sum + p.peso_total, 0),
            quantidadePecas: pecasComStatusFormatadas.filter(p => p.processos.expedicao).length
          }
        ];

        setPecasComStatus(pecasComStatusFormatadas);
        setResumoProcessos(resumo);
        
      } catch (error) {
        console.error('Erro ao buscar dados do relatório de peças por processo:', error);
        toast.error('Erro ao carregar relatório de peças por processo');
      } finally {
        setLoading(false);
      }
    };

    fetchPecasComStatus();
  }, [ofNumber]);

  return {
    pecasComStatus,
    resumoProcessos,
    loading
  };
};
