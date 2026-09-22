
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
  datasProcessos?: {
    corte?: string | null;
    solda?: string | null;
    pintura?: string | null;
    expedicao?: string | null;
  };
  pesoApontado?: {
    corte: number;
    solda: number;
    pintura: number;
    expedicao: number;
  };
}

export interface ResumoProcesso {
  processo: string;
  pesoTotal: number;
  quantidadePecas: number;
}

// Formata data ISO ou YYYY-MM-DD para 'dd/mm'
export const formatarDiaMes = (dataStr?: string | null): string => {
  if (!dataStr) return '';
  try {
    const raw = dataStr.split('T')[0];
    const partes = raw.split('-');
    if (partes.length === 3) {
      const dia = partes[2].padStart(2, '0');
      const mes = partes[1].padStart(2, '0');
      return `${dia}/${mes}`;
    }
    const d = new Date(dataStr);
    if (!isNaN(d.getTime())) {
      const dia = d.getDate().toString().padStart(2, '0');
      const mes = (d.getMonth() + 1).toString().padStart(2, '0');
      return `${dia}/${mes}`;
    }
  } catch (e) {
    // fallback
  }
  return '';
};

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

        // Buscar apontamentos para todas as peças da OF incluindo data_apontamento e created_at
        const pecaIds = pecasData.map(p => p.id);
        const [resApontamentos, resRomaneios] = await Promise.all([
          supabase
            .from('apontamentos_producao')
            .select(`
              peca_id,
              processo_id,
              quantidade_produzida,
              data_apontamento,
              created_at,
              processos_fabricacao!apontamentos_producao_processo_id_fkey(nome)
            `)
            .eq('of_number', ofNumber)
            .in('peca_id', pecaIds),

          // Buscar romaneios de expedição para garantir datas e status de expedição
          supabase
            .from('itens_romaneio_pecas')
            .select(`
              marca,
              peca_id,
              quantidade_expedida,
              created_at,
              romaneios_expedicao!inner(of_number, data_saida, data_emissao, created_at)
            `)
            .eq('romaneios_expedicao.of_number', ofNumber)
        ]);

        if (resApontamentos.error) {
          console.error('Erro ao buscar apontamentos:', resApontamentos.error);
          throw resApontamentos.error;
        }

        const apontamentosData = resApontamentos.data || [];
        const romaneiosData = resRomaneios.data || [];

        console.log('Apontamentos encontrados:', apontamentosData.length);

        // Mapear status dos processos por peça, guardar a ÚLTIMA data apontada e o PESO APONTADO REAL de cada processo
        const statusPorPeca = new Map<string, Set<string>>();
        const datasPorPeca = new Map<string, { corte: string; solda: string; pintura: string; expedicao: string }>();
        const pesosPorPeca = new Map<string, { corte: number; solda: number; pintura: number; expedicao: number }>();

        const mapaPecas = new Map(pecasData.map(p => [p.id, p]));
        
        apontamentosData.forEach(apt => {
          if (!statusPorPeca.has(apt.peca_id)) {
            statusPorPeca.set(apt.peca_id, new Set());
          }
          const nomeProc = apt.processos_fabricacao?.nome || '';
          statusPorPeca.get(apt.peca_id)!.add(nomeProc);

          if (!datasPorPeca.has(apt.peca_id)) {
            datasPorPeca.set(apt.peca_id, { corte: '', solda: '', pintura: '', expedicao: '' });
          }
          if (!pesosPorPeca.has(apt.peca_id)) {
            pesosPorPeca.set(apt.peca_id, { corte: 0, solda: 0, pintura: 0, expedicao: 0 });
          }

          const datas = datasPorPeca.get(apt.peca_id)!;
          const pesos = pesosPorPeca.get(apt.peca_id)!;

          const pecaInfo = mapaPecas.get(apt.peca_id);
          const pesoUnitario = Number(pecaInfo?.peso_unitario || 0);
          const qtdApontada = Number(apt.quantidade_produzida || 0);
          const pesoCalculado = pesoUnitario * qtdApontada;

          const dataApt = apt.data_apontamento || apt.created_at || '';
          const nomeLower = nomeProc.toLowerCase();

          if (nomeLower.includes('corte')) {
            pesos.corte += pesoCalculado;
            if (dataApt && (!datas.corte || dataApt > datas.corte)) datas.corte = dataApt;
          } else if (nomeLower.includes('solda')) {
            pesos.solda += pesoCalculado;
            if (dataApt && (!datas.solda || dataApt > datas.solda)) datas.solda = dataApt;
          } else if (nomeLower.includes('pint') || nomeLower.includes('galv')) {
            pesos.pintura += pesoCalculado;
            if (dataApt && (!datas.pintura || dataApt > datas.pintura)) datas.pintura = dataApt;
          } else if (nomeLower.includes('exped')) {
            pesos.expedicao += pesoCalculado;
            if (dataApt && (!datas.expedicao || dataApt > datas.expedicao)) datas.expedicao = dataApt;
          }
        });

        // Adicionar informações vindas dos Romaneios de Expedição
        romaneiosData.forEach((item: any) => {
          const pecaAlvo = pecasData.find(p => p.id === item.peca_id || p.marca === item.marca);
          if (pecaAlvo) {
            if (!statusPorPeca.has(pecaAlvo.id)) {
              statusPorPeca.set(pecaAlvo.id, new Set());
            }
            statusPorPeca.get(pecaAlvo.id)!.add('Expedicao');

            if (!datasPorPeca.has(pecaAlvo.id)) {
              datasPorPeca.set(pecaAlvo.id, { corte: '', solda: '', pintura: '', expedicao: '' });
            }
            if (!pesosPorPeca.has(pecaAlvo.id)) {
              pesosPorPeca.set(pecaAlvo.id, { corte: 0, solda: 0, pintura: 0, expedicao: 0 });
            }

            const datas = datasPorPeca.get(pecaAlvo.id)!;
            const pesos = pesosPorPeca.get(pecaAlvo.id)!;
            const pesoUnitario = Number(pecaAlvo.peso_unitario || 0);
            const qtdExp = Number(item.quantidade_expedida || 0);
            pesos.expedicao += pesoUnitario * qtdExp;

            const dataExp = item.romaneios_expedicao?.data_saida ||
                            item.romaneios_expedicao?.data_emissao ||
                            item.romaneios_expedicao?.created_at ||
                            item.created_at || '';
            if (dataExp && (!datas.expedicao || dataExp > datas.expedicao)) {
              datas.expedicao = dataExp;
            }
          }
        });

        // Construir array de peças com status, última data apontada e peso apontado
        const pecasComStatusFormatadas: PecaComStatus[] = pecasData.map(peca => {
          const processosRealizados = statusPorPeca.get(peca.id) || new Set();
          const datas = datasPorPeca.get(peca.id) || { corte: '', solda: '', pintura: '', expedicao: '' };
          const pesos = pesosPorPeca.get(peca.id) || { corte: 0, solda: 0, pintura: 0, expedicao: 0 };
          
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
            },
            datasProcessos: {
              corte: formatarDiaMes(datas.corte),
              solda: formatarDiaMes(datas.solda),
              pintura: formatarDiaMes(datas.pintura),
              expedicao: formatarDiaMes(datas.expedicao)
            },
            pesoApontado: {
              corte: Number(pesos.corte.toFixed(2)),
              solda: Number(pesos.solda.toFixed(2)),
              pintura: Number(pesos.pintura.toFixed(2)),
              expedicao: Number(pesos.expedicao.toFixed(2))
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
