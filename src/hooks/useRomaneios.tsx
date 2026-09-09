
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validarRomaneioParaEntrega } from '@/utils/validacaoRomaneio';

export interface RomaneioExpedicao {
  id: string;
  numero_romaneio: string;
  of_number: string;
  data_romaneio: string;
  data_criacao: string;
  revisao: number;
  motivo_revisao?: string;
  data_prevista_entrega?: string;
  prioridade: string;
  status: string;
  observacoes?: string;
  peso_total_romaneio: number;
  previsao_kg?: number;
  maior_dimensao?: string;
  tipo_transporte?: string;
  frete_tipo?: string;
  nome_motorista?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  itens_pecas?: ItemRomaneioPeca[];
  itens_insumos?: ItemRomaneioInsumo[];
}

export interface ItemRomaneioPeca {
  id: string;
  romaneio_id: string;
  peca_id: string;
  marca: string;
  fase?: string;
  descricao?: string;
  comprimento?: number;
  peso_unitario: number;
  quantidade_expedida: number;
  peso_total: number;
  quantidade_faltante: number;
  created_at: string;
}

export interface ItemRomaneioInsumo {
  id: string;
  romaneio_id: string;
  tipo_insumo: string;
  descricao: string;
  unidade: string;
  quantidade_expedida: number;
  peso_unitario?: number;
  peso_total?: number;
  observacoes?: string;
  created_at: string;
}

export interface PecaPintura {
  id: string;
  marca: string;
  etapa_fase?: string;
  descricao?: string;
  peso_unitario: number;
  quantidade_produzida_pintura: number;
  quantidade_ja_expedida: number;
  quantidade_disponivel: number;
  of_number: string;
}

export const useRomaneios = (ofNumberFilter?: string) => {
  return useQuery({
    queryKey: ['romaneios', ofNumberFilter],
    queryFn: async () => {
      let query = supabase
        .from('romaneios_expedicao')
        .select(`
          *,
          itens_pecas:itens_romaneio_pecas(*),
          itens_insumos:itens_romaneio_insumos(*)
        `)
        .order('created_at', { ascending: false });

      if (ofNumberFilter && ofNumberFilter !== 'all') {
        query = query.eq('of_number', ofNumberFilter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Calcular peso total correto das peças para cada romaneio
      const normalizedData = data?.map(romaneio => {
        const pesoTotalPecas = romaneio.itens_pecas?.reduce((sum: number, item: any) => sum + (item.peso_total || 0), 0) || 0;
        const pesoTotalInsumos = romaneio.itens_insumos?.reduce((sum: number, item: any) => sum + (item.peso_total || 0), 0) || 0;
        
        return {
          ...romaneio,
          peso_total_romaneio: pesoTotalPecas + pesoTotalInsumos,
          prioridade: romaneio.prioridade === 'Normal' || romaneio.prioridade === 'Urgente' 
            ? romaneio.prioridade 
            : 'Normal',
          status: ['Em planejamento', 'Confirmado', 'Expedido', 'Entregue', 'Conferido em Obra'].includes(romaneio.status)
            ? romaneio.status
            : 'Em planejamento',
          frete_tipo: romaneio.frete_tipo === 'terceiros' || romaneio.frete_tipo === 'proprio'
            ? romaneio.frete_tipo
            : undefined
        };
      });
      
      return normalizedData as RomaneioExpedicao[];
    },
  });
};

export const usePecasPintura = (ofNumber?: string) => {
  return useQuery({
    queryKey: ['pecas-pintura', ofNumber],
    queryFn: async () => {
      if (!ofNumber) return [];
      
      // Buscar peças que passaram pelo processo de pintura
      const { data: apontamentosPintura, error: apontamentosError } = await supabase
        .from('apontamentos_producao')
        .select(`
          peca_id,
          quantidade_produzida,
          pecas (
            id,
            marca,
            etapa_fase,
            descricao,
            peso_unitario,
            of_number
          ),
          processos_fabricacao (
            nome
          )
        `)
        .eq('of_number', ofNumber)
        .ilike('processos_fabricacao.nome', '%pintura%');

      if (apontamentosError) throw apontamentosError;

      // Buscar quantidades já expedidas
      const { data: itensExpedidos, error: expedidosError } = await supabase
        .from('itens_romaneio_pecas')
        .select('peca_id, quantidade_expedida')
        .in('peca_id', apontamentosPintura?.map(a => a.peca_id) || []);

      if (expedidosError) throw expedidosError;

      // Calcular disponibilidade
      const pecasPintura: PecaPintura[] = [];
      const pecasMap = new Map();

      apontamentosPintura?.forEach(apontamento => {
        const pecaId = apontamento.peca_id;
        const peca = apontamento.pecas;
        
        if (!peca) return;

        if (pecasMap.has(pecaId)) {
          pecasMap.get(pecaId).quantidade_produzida_pintura += apontamento.quantidade_produzida;
        } else {
          pecasMap.set(pecaId, {
            id: peca.id,
            marca: peca.marca,
            etapa_fase: peca.etapa_fase,
            descricao: peca.descricao,
            peso_unitario: peca.peso_unitario,
            quantidade_produzida_pintura: apontamento.quantidade_produzida,
            of_number: peca.of_number
          });
        }
      });

      pecasMap.forEach((peca, pecaId) => {
        const totalExpedido = itensExpedidos
          ?.filter(item => item.peca_id === pecaId)
          .reduce((sum, item) => sum + item.quantidade_expedida, 0) || 0;

        pecasPintura.push({
          ...peca,
          quantidade_ja_expedida: totalExpedido,
          quantidade_disponivel: peca.quantidade_produzida_pintura - totalExpedido
        });
      });

      return pecasPintura.filter(p => p.quantidade_disponivel > 0);
    },
    enabled: !!ofNumber,
  });
};

const generateRomaneioNumber = (ofNumber: string, existingRomaneios: RomaneioExpedicao[]) => {
  // Extrair apenas o número da OF (sem o B)
  const ofNumOnly = ofNumber.replace('B', '');
  
  // Contar romaneios existentes para esta OF
  const existingCount = existingRomaneios.filter(r => r.of_number === ofNumber).length;
  const nextSequence = existingCount + 1;
  
  return `RO${ofNumOnly}-${nextSequence.toString().padStart(2, '0')}`;
};

export const useCriarRomaneio = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (romaneio: Omit<RomaneioExpedicao, 'id' | 'numero_romaneio' | 'created_at' | 'updated_at'>) => {
      const { data: existingRomaneios } = await supabase
        .from('romaneios_expedicao')
        .select('*')
        .eq('of_number', romaneio.of_number);

      const numeroRomaneio = generateRomaneioNumber(romaneio.of_number, existingRomaneios || []);

      const { data, error } = await supabase
        .from('romaneios_expedicao')
        .insert([{
          numero_romaneio: numeroRomaneio,
          of_number: romaneio.of_number,
          data_romaneio: romaneio.data_romaneio,
          data_criacao: romaneio.data_criacao,
          revisao: romaneio.revisao || 1,
          motivo_revisao: romaneio.motivo_revisao,
          data_prevista_entrega: romaneio.data_prevista_entrega,
          prioridade: romaneio.prioridade,
          status: romaneio.status,
          observacoes: romaneio.observacoes,
          peso_total_romaneio: romaneio.peso_total_romaneio,
          previsao_kg: romaneio.previsao_kg,
          maior_dimensao: romaneio.maior_dimensao,
          tipo_transporte: romaneio.tipo_transporte,
          frete_tipo: romaneio.frete_tipo,
          nome_motorista: romaneio.nome_motorista,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['romaneios'] });
      toast.success('Romaneio criado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar romaneio:', error);
      toast.error('Erro ao criar romaneio');
    },
  });
};

export const useAtualizarRomaneio = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...romaneio }: Partial<RomaneioExpedicao> & { id: string }) => {
      // Buscar status atual antes da atualização
      const { data: romaneioAtual, error: errorAtual } = await supabase
        .from('romaneios_expedicao')
        .select('status, numero_romaneio, of_number')
        .eq('id', id)
        .single();

      if (errorAtual) {
        console.error('❌ Erro ao buscar romaneio atual:', errorAtual);
        throw errorAtual;
      }

      console.log('📋 Status atual do romaneio:', romaneioAtual?.status);
      console.log('📋 Novo status a ser definido:', romaneio.status);

      // Validação rigorosa: Não permitir passar para Entregue se houver pendências nos processos anteriores
      if (romaneio.status === 'Entregue') {
        const validacao = await validarRomaneioParaEntrega(id, romaneio.of_number || romaneioAtual?.of_number);
        if (!validacao.valido) {
          const msg = validacao.mensagem || (
            validacao.pendencias && validacao.pendencias.length > 0
              ? `Não é possível marcar como "Entregue": existem ${validacao.pendencias.length} peça(s) com apontamentos pendentes nos processos anteriores.`
              : 'Não é possível marcar como "Entregue": pendências encontradas.'
          );
          throw new Error(msg);
        }
      }

      const { data, error } = await supabase
        .from('romaneios_expedicao')
        .update(romaneio)
        .eq('id', id)
        .select(`
          *,
          itens_pecas:itens_romaneio_pecas(*)
        `)
        .single();
      
      if (error) throw error;

      // VERIFICAÇÃO ESPECÍFICA: Disparar apontamento automático APENAS quando status muda PARA "Entregue"
      const statusAnterior = romaneioAtual?.status;
      const novoStatus = romaneio.status;
      
      console.log('🔍 Verificando mudança de status:');
      console.log('- Status anterior:', statusAnterior);
      console.log('- Novo status:', novoStatus);
      
      if (novoStatus === 'Entregue' && statusAnterior !== 'Entregue') {
        console.log('🚀 CONDIÇÃO ATENDIDA: Status mudou PARA "Entregue" - iniciando apontamento automático');
        console.log('📦 Dados do romaneio atualizado:', data);
        
        // Buscar dados completos do romaneio incluindo itens
        const { data: romaneioCompleto, error: errorCompleto } = await supabase
          .from('romaneios_expedicao')
          .select(`
            *,
            itens_pecas:itens_romaneio_pecas(*)
          `)
          .eq('id', id)
          .single();
          
        if (errorCompleto) {
          console.error('❌ Erro ao buscar dados completos do romaneio:', errorCompleto);
          return data;
        }
        
        console.log('📋 Dados completos do romaneio para apontamento:', romaneioCompleto);
        console.log('🔢 Número de peças no romaneio:', romaneioCompleto?.itens_pecas?.length || 0);
        
        // Verificar se há peças para apontar
        if (!romaneioCompleto?.itens_pecas || romaneioCompleto.itens_pecas.length === 0) {
          console.log('⚠️ Romaneio sem peças - não será processado apontamento automático');
          return data;
        }
        
        // Disparar evento customizado para apontamento automático
        const eventDetail = { 
          romaneioId: id, 
          status: novoStatus,
          romaneioData: romaneioCompleto,
          statusAnterior: statusAnterior
        };
        
        console.log('🎯 Disparando evento romaneio-entregue para apontamento automático:', eventDetail);
        
        // Usar setTimeout para garantir que o evento seja disparado após a atualização
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('romaneio-entregue', { 
            detail: eventDetail
          }));
        }, 100);
        
      } else if (novoStatus === 'Entregue' && statusAnterior === 'Entregue') {
        console.log('ℹ️ Status já era "Entregue" - apontamento automático não será disparado');
      } else {
        console.log(`ℹ️ Status atualizado de "${statusAnterior}" para "${novoStatus}" - apontamento automático não será disparado (só para mudança PARA "Entregue")`);
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['romaneios'] });
      toast.success('Romaneio atualizado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar romaneio:', error);
      toast.error(error?.message || 'Erro ao atualizar romaneio');
    },
  });
};

export const useAdicionarItemPeca = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (item: Omit<ItemRomaneioPeca, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('itens_romaneio_pecas')
        .insert([item])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['romaneios'] });
      toast.success('Item adicionado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao adicionar item:', error);
      toast.error('Erro ao adicionar item');
    },
  });
};

export const useAdicionarItemInsumo = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (item: Omit<ItemRomaneioInsumo, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('itens_romaneio_insumos')
        .insert([item])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['romaneios'] });
      toast.success('Insumo adicionado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao adicionar insumo:', error);
      toast.error('Erro ao adicionar insumo');
    },
  });
};
