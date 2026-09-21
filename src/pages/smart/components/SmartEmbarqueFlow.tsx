import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  Plus, 
  ListChecks, 
  ChevronRight, 
  Check, 
  Package, 
  User, 
  FileCheck,
  AlertCircle,
  Eye,
  Download,
  Share2,
  Trash2,
  FileText,
  CheckCircle2,
  Calendar,
  Weight
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OFAtiva } from '@/hooks/useOFsAtivas';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { smartAudio } from '@/utils/smartAudio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface SmartEmbarqueFlowProps {
  obra: OFAtiva;
  onVoltarHub: () => void;
}

interface RomaneioAberto {
  id: string;
  numero_romaneio: string;
  nome_motorista?: string;
  tipo_transporte?: string;
  frete_tipo?: string;
  peso_total_romaneio?: number;
  status?: string;
  created_at?: string;
  data_romaneio?: string;
}

interface ItemRomaneioCarregado {
  id: string;
  romaneio_id: string;
  peca_id: string;
  marca: string;
  descricao?: string;
  fase?: string;
  quantidade_expedida: number;
  peso_unitario: number;
  peso_total: number;
  created_at?: string;
}

interface PecaPronta {
  id: string;
  marca: string;
  descricao: string;
  etapa_fase: string;
  quantidade: number;
  peso_unitario: number;
  quantidadeJaExpedida: number;
  saldoDisponivel: number;
}

type SubTelaEmbarque = 
  | 'menu' 
  | 'novo_romaneio' 
  | 'selecionar_romaneio' 
  | 'carregando_pecas' 
  | 'conferencia_romaneio';

export const SmartEmbarqueFlow: React.FC<SmartEmbarqueFlowProps> = ({ obra, onVoltarHub }) => {
  const { user } = useAuth();

  // Subtelas do fluxo de embarque
  const [subTela, setSubTela] = useState<SubTelaEmbarque>('menu');

  // Romaneio ativo para carregamento ou conferência
  const [romaneioAtivo, setRomaneioAtivo] = useState<RomaneioAberto | null>(null);

  // Lista de romaneios da OF
  const [romaneios, setRomaneios] = useState<RomaneioAberto[]>([]);
  const [loadingRomaneios, setLoadingRomaneios] = useState<boolean>(false);

  // Itens carregados no romaneio ativo
  const [itensRomaneio, setItensRomaneio] = useState<ItemRomaneioCarregado[]>([]);
  const [loadingItensRomaneio, setLoadingItensRomaneio] = useState<boolean>(false);
  const [removendoItemId, setRemovendoItemId] = useState<string | null>(null);
  const [gerandoPDF, setGerandoPDF] = useState<boolean>(false);

  // Formulário de Novo Romaneio Rápido
  const [nomeMotorista, setNomeMotorista] = useState('');
  const [tipoTransporte, setTipoTransporte] = useState<
    'caminhao_pequeno' | 'caminhao_trucado' | 'caminhao_munck' | 'carreta_12m'
  >('caminhao_trucado');
  const [freteTipo, setFreteTipo] = useState<'proprio' | 'terceiros'>('proprio');
  const [criandoRomaneio, setCriandoRomaneio] = useState(false);

  // Lista de peças prontas da OF e seus saldos de embarque
  const [pecasProntas, setPecasProntas] = useState<PecaPronta[]>([]);
  const [loadingPecas, setLoadingPecas] = useState(false);

  // Peça selecionada para adicionar ao caminhão
  const [pecaEmbarque, setPecaEmbarque] = useState<PecaPronta | null>(null);
  const [qtdEmbarcar, setQtdEmbarcar] = useState<number>(1);
  const [salvandoItem, setSalvandoItem] = useState(false);

  // Formatadores de Transporte e Frete
  const formatTransporte = (tipo?: string) => {
    const mapa: Record<string, string> = {
      carro: 'Carro',
      utilitario: 'Utilitário',
      caminhao_pequeno: 'Caminhão Pequeno (Toco)',
      caminhao_trucado: 'Caminhão Trucado',
      caminhao_munck: 'Caminhão Munck',
      carreta_12m: 'Carreta 12m',
      carreta_15m: 'Carreta 15m',
      especial: 'Especial / Prancha',
    };
    return (tipo && mapa[tipo]) || tipo || 'Caminhão Padrão';
  };

  const formatFrete = (tipo?: string) => {
    return tipo === 'proprio' ? 'Próprio' : 'Terceiros / Contratado';
  };

  // Carregar Romaneios Abertos da OF
  const carregarRomaneios = React.useCallback(async () => {
    try {
      setLoadingRomaneios(true);
      const { data, error } = await supabase
        .from('romaneios_expedicao')
        .select('*')
        .eq('of_number', obra.of_number)
        .neq('status', 'Entregue')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRomaneios(data || []);
    } catch (e) {
      console.error('Erro ao buscar romaneios:', e);
    } finally {
      setLoadingRomaneios(false);
    }
  }, [obra.of_number]);

  // Carregar Peças com Saldo para Embarque
  const carregarPecasParaEmbarque = React.useCallback(async () => {
    try {
      setLoadingPecas(true);

      const [resPecas, resItensExpedidos] = await Promise.all([
        supabase
          .from('pecas')
          .select('id, marca, descricao, etapa_fase, quantidade, peso_unitario')
          .eq('of_number', obra.of_number),
        supabase
          .from('itens_romaneio_pecas')
          .select('peca_id, quantidade_expedida'),
      ]);

      const mapaExpedidas = new Map<string, number>();
      if (resItensExpedidos.data) {
        resItensExpedidos.data.forEach((item) => {
          const atual = mapaExpedidas.get(item.peca_id) || 0;
          mapaExpedidas.set(item.peca_id, atual + Number(item.quantidade_expedida || 0));
        });
      }

      if (resPecas.data) {
        const formatadas: PecaPronta[] = resPecas.data.map((p) => {
          const jaExp = mapaExpedidas.get(p.id) || 0;
          const saldo = Math.max(0, p.quantidade - jaExp);
          return {
            ...p,
            quantidadeJaExpedida: jaExp,
            saldoDisponivel: saldo,
          };
        });

        // Ordenação natural das marcas para localização rápida
        formatadas.sort((a, b) =>
          a.marca.localeCompare(b.marca, undefined, { numeric: true, sensitivity: 'base' })
        );

        setPecasProntas(formatadas);
      }
    } catch (e) {
      console.error('Erro ao carregar peças para embarque:', e);
    } finally {
      setLoadingPecas(false);
    }
  }, [obra.of_number]);

  // Carregar itens colocados dentro de um romaneio específico
  const carregarItensDoRomaneio = React.useCallback(async (romaneioId: string) => {
    try {
      setLoadingItensRomaneio(true);
      const { data, error } = await supabase
        .from('itens_romaneio_pecas')
        .select('*')
        .eq('romaneio_id', romaneioId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const lista = data || [];
      // Ordenar marcas naturalmente
      lista.sort((a, b) =>
        (a.marca || '').localeCompare(b.marca || '', undefined, { numeric: true, sensitivity: 'base' })
      );

      setItensRomaneio(lista);
    } catch (e) {
      console.error('Erro ao buscar itens do romaneio:', e);
      toast.error('Erro ao carregar itens do caminhão');
    } finally {
      setLoadingItensRomaneio(false);
    }
  }, []);

  useEffect(() => {
    carregarRomaneios();
    carregarPecasParaEmbarque();
  }, [carregarRomaneios, carregarPecasParaEmbarque]);

  // Sincronizar itens quando o romaneio ativo mudar
  useEffect(() => {
    if (romaneioAtivo?.id) {
      carregarItensDoRomaneio(romaneioAtivo.id);
    }
  }, [romaneioAtivo?.id, carregarItensDoRomaneio]);

  // Criar Novo Romaneio
  const handleCriarRomaneio = async () => {
    if (!user) return;
    try {
      setCriandoRomaneio(true);
      const hoje = new Date().toISOString().split('T')[0];

      // Gerar número de romaneio sequencial RO-XX
      const seq = (romaneios.length + 1).toString().padStart(2, '0');
      const numRomaneio = `RO${obra.of_number.replace(/\D/g, '')}-${seq}`;

      const novo = {
        of_number: obra.of_number,
        numero_romaneio: numRomaneio,
        data_romaneio: hoje,
        data_criacao: hoje,
        revisao: 0,
        prioridade: 'Normal' as const,
        status: 'Em planejamento' as const,
        tipo_transporte: tipoTransporte,
        frete_tipo: freteTipo,
        nome_motorista: nomeMotorista || 'Motorista a definir',
        peso_total_romaneio: 0,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from('romaneios_expedicao')
        .insert(novo)
        .select()
        .single();

      if (error) throw error;

      smartAudio.playSuccess();
      toast.success(`Romaneio ${numRomaneio} criado!`);
      setRomaneioAtivo(data);
      setItensRomaneio([]);
      setSubTela('carregando_pecas');
      carregarRomaneios();
    } catch (e: any) {
      smartAudio.playAlert();
      console.error('Erro ao criar romaneio:', e);
      toast.error('Erro ao criar romaneio: ' + (e?.message || 'Falha de conexão'));
    } finally {
      setCriandoRomaneio(false);
    }
  };

  // Abrir Tela de Conferência para qualquer romaneio
  const handleAbrirConferencia = (r: RomaneioAberto) => {
    smartAudio.playClick();
    setRomaneioAtivo(r);
    carregarItensDoRomaneio(r.id);
    setSubTela('conferencia_romaneio');
  };

  // Incluir Peça no Romaneio
  const handleIncluirPeca = async () => {
    if (!romaneioAtivo || !pecaEmbarque || qtdEmbarcar <= 0) return;

    try {
      setSalvandoItem(true);
      const pesoTotalItem = qtdEmbarcar * (pecaEmbarque.peso_unitario || 0);

      const novoItem = {
        romaneio_id: romaneioAtivo.id,
        peca_id: pecaEmbarque.id,
        marca: pecaEmbarque.marca,
        descricao: pecaEmbarque.descricao,
        fase: pecaEmbarque.etapa_fase || 'Geral',
        quantidade_expedida: qtdEmbarcar,
        peso_unitario: pecaEmbarque.peso_unitario || 0,
        peso_total: pesoTotalItem,
        quantidade_faltante: Math.max(0, pecaEmbarque.saldoDisponivel - qtdEmbarcar),
      };

      const { error } = await supabase.from('itens_romaneio_pecas').insert(novoItem);
      if (error) throw error;

      // Atualizar o peso total no cabeçalho do romaneio
      const novoPesoRomaneio = (romaneioAtivo.peso_total_romaneio || 0) + pesoTotalItem;
      await supabase
        .from('romaneios_expedicao')
        .update({ peso_total_romaneio: novoPesoRomaneio })
        .eq('id', romaneioAtivo.id);

      smartAudio.playSuccess();
      toast.success(`Adicionado: ${qtdEmbarcar}x ${pecaEmbarque.marca} ao caminhão!`);

      // Atualizar estado local e listas
      setRomaneioAtivo((prev) => (prev ? { ...prev, peso_total_romaneio: novoPesoRomaneio } : null));
      setPecaEmbarque(null);
      await Promise.all([
        carregarPecasParaEmbarque(),
        carregarItensDoRomaneio(romaneioAtivo.id),
      ]);
    } catch (e: any) {
      smartAudio.playAlert();
      console.error('Erro ao adicionar peça ao romaneio:', e);
      toast.error('Erro ao incluir no caminhão: ' + (e?.message || ''));
    } finally {
      setSalvandoItem(false);
    }
  };

  // Remover / Estornar Item do Romaneio
  const handleRemoverItemRomaneio = async (item: ItemRomaneioCarregado) => {
    if (!romaneioAtivo) return;
    try {
      setRemovendoItemId(item.id);
      const { error } = await supabase
        .from('itens_romaneio_pecas')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      // Recalcular peso total do romaneio
      const novoPeso = Math.max(0, (romaneioAtivo.peso_total_romaneio || 0) - item.peso_total);
      await supabase
        .from('romaneios_expedicao')
        .update({ peso_total_romaneio: novoPeso })
        .eq('id', romaneioAtivo.id);

      setRomaneioAtivo((prev) => (prev ? { ...prev, peso_total_romaneio: novoPeso } : null));
      smartAudio.playSuccess();
      toast.success(`Peça ${item.marca} removida do romaneio.`);

      // Atualizar dados
      await Promise.all([
        carregarItensDoRomaneio(romaneioAtivo.id),
        carregarPecasParaEmbarque(),
        carregarRomaneios(),
      ]);
    } catch (e: any) {
      smartAudio.playAlert();
      toast.error('Erro ao remover item: ' + (e?.message || ''));
    } finally {
      setRemovendoItemId(null);
    }
  };

  // Finalizar / Concluir Romaneio Oficialmente
  const handleConcluirRomaneioOficial = async (novoStatus: 'Confirmado' | 'Expedido' = 'Expedido') => {
    if (!romaneioAtivo) return;
    try {
      const { error } = await supabase
        .from('romaneios_expedicao')
        .update({ status: novoStatus })
        .eq('id', romaneioAtivo.id);

      if (error) throw error;

      smartAudio.playSuccess();
      toast.success(`Romaneio ${romaneioAtivo.numero_romaneio} concluído com sucesso (${novoStatus})!`);
      await carregarRomaneios();
      setRomaneioAtivo(null);
      setSubTela('menu');
    } catch (e: any) {
      smartAudio.playAlert();
      toast.error('Erro ao finalizar romaneio: ' + (e?.message || ''));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // GERAÇÃO DE PDF OFICIAL DO ROMANEIO (jsPDF + autoTable)
  // ─────────────────────────────────────────────────────────────
  const gerarRomaneioPDF = (acao: 'download' | 'whatsapp') => {
    if (!romaneioAtivo) return;
    try {
      setGerandoPDF(true);
      const doc = new jsPDF();
      const dataFormatada = new Date().toLocaleDateString('pt-BR');
      const horaFormatada = new Date().toLocaleTimeString('pt-BR');

      // 1. TOPO LIMPO CORPORATIVO (FUNDO BRANCO, AZUL MARINHO & VERDE - ZERO DESPERDÍCIO DE TONER)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 43, 92); // Azul Marinho Profundo
      doc.text(`ROMANEIO DE EXPEDIÇÃO & CARGA`, 14, 16);

      // Status em Verde no canto superior direito
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105); // Verde Esmeralda
      doc.text(`STATUS: ${(romaneioAtivo.status || 'EXPEDIDO').toUpperCase()}`, 150, 16);

      // Metadados da Obra em Preto / Grafite
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(31, 41, 55);
      doc.text(`OF: ${obra.of_number}   |   Cliente: ${obra.cliente || 'Industrial'}`, 14, 23);
      doc.text(
        `Romaneio: ${romaneioAtivo.numero_romaneio}   |   Emissão: ${dataFormatada} às ${horaFormatada}`,
        14,
        29
      );

      // Linha divisória de topo fina e elegante: Azul Marinho com terminal em Verde
      doc.setDrawColor(30, 58, 138); // Azul Marinho
      doc.setLineWidth(1.2);
      doc.line(14, 33, 165, 33);
      doc.setDrawColor(5, 150, 105); // Verde Esmeralda
      doc.setLineWidth(1.2);
      doc.line(165, 33, 196, 33);

      // 2. CAIXA DE DADOS DO TRANSPORTE (Fundo Branco, Borda Fina, Barra Lateral Azul Marinho)
      const boxTransporteY = 37;
      doc.setFillColor(30, 58, 138); // Barra lateral azul marinho
      doc.roundedRect(14, boxTransporteY, 3, 19, 1, 1, 'F');

      doc.setDrawColor(203, 213, 225); // Borda cinza suave
      doc.setLineWidth(0.4);
      doc.roundedRect(17, boxTransporteY, 179, 19, 1.5, 1.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 43, 92); // Azul Marinho
      doc.text(`DADOS DO TRANSPORTE:`, 22, boxTransporteY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(31, 41, 55); // Preto / Grafite
      doc.text(`Motorista: ${romaneioAtivo.nome_motorista || 'A definir'}`, 22, boxTransporteY + 13);
      doc.text(`Veículo: ${formatTransporte(romaneioAtivo.tipo_transporte)}`, 90, boxTransporteY + 13);
      doc.text(`Frete: ${formatFrete(romaneioAtivo.frete_tipo)}`, 155, boxTransporteY + 13);

      // 3. TABELA DE PEÇAS CARREGADAS (Fundo Branco, Linhas Finas, Marca em Azul Marinho, Totais em Verde)
      const tableRows = itensRomaneio.map((item, idx) => [
        (idx + 1).toString(),
        item.marca,
        item.fase || '1',
        item.descricao || 'Peça Estrutural',
        item.quantidade_expedida.toString(),
        `${Number(item.peso_unitario || 0).toFixed(1)} kg`,
        `${Number(item.peso_total || 0).toFixed(1)} kg`,
      ]);

      const totalPecas = itensRomaneio.reduce(
        (acc, it) => acc + Number(it.quantidade_expedida || 0),
        0
      );
      const totalKg = itensRomaneio.reduce(
        (acc, it) => acc + Number(it.peso_total || 0),
        0
      );

      autoTable(doc, {
        startY: 61,
        head: [['#', 'Marca', 'Fase', 'Descrição da Peça', 'Qtd', 'Peso Unit.', 'Peso Total']],
        body: tableRows,
        theme: 'plain',
        headStyles: {
          fillColor: [248, 250, 252], // Fundo branco/gelo suave
          textColor: [15, 43, 92],    // Azul Marinho
          fontStyle: 'bold',
          lineWidth: 0.4,
          lineColor: [30, 58, 138], // Linha azul marinho
        },
        styles: {
          fontSize: 8.5,
          textColor: [31, 41, 55],    // Preto nítido
          cellPadding: 2.5,
          lineWidth: 0.1,
          lineColor: [226, 232, 240], // Linha cinza clara
        },
        columnStyles: {
          0: { cellWidth: 10, textColor: [100, 116, 139] },
          1: { cellWidth: 26, fontStyle: 'bold', textColor: [15, 43, 92] }, // Marca em Azul Marinho
          2: { cellWidth: 18, halign: 'center' },
          3: { cellWidth: 65 },
          4: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
          5: { cellWidth: 24, halign: 'right' },
          6: { cellWidth: 24, halign: 'right', fontStyle: 'bold', textColor: [22, 101, 52] }, // Peso em Verde
        },
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 120;

      // 4. RESUMO E TOTAIS (Fundo Branco, Borda e Barra Lateral em Verde Esmeralda)
      const boxTotaisY = finalY + 5;
      doc.setFillColor(5, 150, 105); // Verde
      doc.roundedRect(14, boxTotaisY, 3, 16, 1, 1, 'F');

      doc.setDrawColor(5, 150, 105); // Borda Verde
      doc.setLineWidth(0.4);
      doc.roundedRect(17, boxTotaisY, 179, 16, 1.5, 1.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(22, 101, 52); // Verde Escuro
      doc.text(`TOTAIS DO ROMANEIO:`, 22, boxTotaisY + 6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42); // Preto
      doc.text(
        `Marcas: ${itensRomaneio.length}    |    Total de Peças: ${totalPecas} un    |    Peso Total: ${totalKg.toFixed(1)} kg`,
        22,
        boxTotaisY + 12
      );

      // 5. CAMPOS DE ASSINATURA (Linhas Finas)
      const posYAssinaturas = boxTotaisY + 28;
      if (posYAssinaturas < 265) {
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.4);

        // Assinatura Fábrica
        doc.line(18, posYAssinaturas, 95, posYAssinaturas);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text('Expedido por (Fábrica / Almoxarifado)', 22, posYAssinaturas + 5);

        // Assinatura Motorista
        doc.line(115, posYAssinaturas, 192, posYAssinaturas);
        doc.text('Recebido por (Motorista / Transportador)', 120, posYAssinaturas + 5);

        // Assinatura Canteiro
        const posYObra = posYAssinaturas + 16;
        doc.line(65, posYObra, 145, posYObra);
        doc.text('Recebido na Obra (Canteiro / Montagem)', 72, posYObra + 5);
      }

      const nomeArquivo = `Romaneio_${romaneioAtivo.numero_romaneio}.pdf`;

      if (acao === 'download') {
        doc.save(nomeArquivo);
        smartAudio.playSuccess();
        toast.success('Romaneio em PDF gerado e baixado!');
      } else if (acao === 'whatsapp') {
        smartAudio.playClick();
        const textoMsg = encodeURIComponent(
          `*TRACKSTEEL - ROMANEIO DE EXPEDIÇÃO*\n` +
          `*Romaneio:* ${romaneioAtivo.numero_romaneio}\n` +
          `*Obra:* OF ${obra.of_number} - ${obra.cliente || ''}\n` +
          `*Motorista:* ${romaneioAtivo.nome_motorista || 'A definir'}\n` +
          `*Veículo:* ${formatTransporte(romaneioAtivo.tipo_transporte)}\n` +
          `*Carga:* ${itensRomaneio.length} marcas, ${totalPecas} peças (${totalKg.toFixed(1)} kg)\n` +
          `*Status:* ${romaneioAtivo.status || 'Expedido'}\n\n` +
          `_Conferência gerada via Modo Smart TrackSteel._`
        );
        window.open(`https://wa.me/?text=${textoMsg}`, '_blank');
      }
    } catch (e: any) {
      smartAudio.playAlert();
      console.error('Erro ao gerar PDF do romaneio:', e);
      toast.error('Erro ao gerar PDF: ' + (e?.message || ''));
    } finally {
      setGerandoPDF(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER: SUBTELA 'MENU'
  // ─────────────────────────────────────────────────────────────
  if (subTela === 'menu') {
    return (
      <div className="flex flex-col flex-1 p-4 max-w-xl mx-auto w-full">
        <div className="mb-6 text-center">
          <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
            <Truck className="h-8 w-8" />
          </div>
          <span className="text-xs font-black uppercase text-blue-400 tracking-wider block">
            ETAPA 2 — EXPEDIÇÃO
          </span>
          <h2 className="text-xl font-black text-slate-100 uppercase mt-0.5">
            Apontar Embarque & Romaneio
          </h2>
          <p className="text-xs text-slate-400">
            Carregue caminhões com as peças prontas no pátio ou confira romaneios
          </p>
        </div>

        <div className="space-y-3.5 my-auto">
          {/* Opção 1: Criar Novo Romaneio */}
          <button
            type="button"
            onClick={() => {
              smartAudio.playClick();
              setSubTela('novo_romaneio');
            }}
            className="w-full min-h-[90px] p-5 rounded-3xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:scale-[0.98] text-white flex items-center justify-between text-left shadow-lg shadow-blue-950/40 border-2 border-blue-400/30 transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-white/20">
                <Plus className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="text-lg font-black tracking-tight">
                  Criar Novo Romaneio Rápido
                </div>
                <div className="text-xs text-blue-100 font-medium">
                  Informar veículo, motorista e iniciar carga
                </div>
              </div>
            </div>
            <ChevronRight className="h-6 w-6 text-blue-200 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Opção 2: Romaneios em Aberto (Carga ou Conferência) */}
          <button
            type="button"
            onClick={() => {
              smartAudio.playClick();
              setSubTela('selecionar_romaneio');
            }}
            className="w-full min-h-[90px] p-5 rounded-3xl bg-slate-800 hover:bg-slate-750 active:scale-[0.98] text-slate-100 border-2 border-slate-700 hover:border-blue-500/60 flex items-center justify-between text-left shadow-md transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-slate-700 text-blue-400">
                <ListChecks className="h-7 w-7" />
              </div>
              <div>
                <div className="text-lg font-black tracking-tight">
                  Romaneios da Obra & Conferência
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  {romaneios.length} romaneio(s) ativo(s) — carregar peças ou abrir PDF
                </div>
              </div>
            </div>
            <ChevronRight className="h-6 w-6 text-slate-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </button>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            smartAudio.playClick();
            onVoltarHub();
          }}
          className="w-full h-14 bg-slate-800 border-slate-700 text-slate-200 text-sm font-bold rounded-2xl mt-4 active:scale-98"
        >
          Voltar ao Menu Principal
        </Button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: SUBTELA 'NOVO_ROMANEIO' (FORMULÁRIO TOUCH RÁPIDO)
  // ─────────────────────────────────────────────────────────────
  if (subTela === 'novo_romaneio') {
    return (
      <div className="flex flex-col flex-1 p-4 max-w-xl mx-auto w-full">
        <div className="mb-4 text-center">
          <span className="text-xs font-black uppercase text-blue-400 tracking-wider">
            NOVO CARREGAMENTO
          </span>
          <h2 className="text-xl font-black text-slate-100 uppercase mt-0.5">
            Dados do Veículo & Frete
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {/* Nome / Placa do Motorista */}
          <div>
            <label className="text-xs font-black uppercase text-slate-300 tracking-wider block mb-1.5">
              Motorista ou Identificação do Veículo
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="h-5 w-5 text-blue-400" />
              </div>
              <Input
                type="text"
                value={nomeMotorista}
                onChange={(e) => setNomeMotorista(e.target.value)}
                placeholder="Ex: João Silva - Placa ABC-1234"
                className="h-14 pl-11 bg-slate-800 border-slate-700 text-slate-100 text-base font-bold rounded-2xl"
              />
            </div>
          </div>

          {/* Tipo de Veículo */}
          <div>
            <label className="text-xs font-black uppercase text-slate-300 tracking-wider block mb-1.5">
              Tipo de Transporte / Veículo
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'caminhao_pequeno', label: 'Toco / 3/4' },
                { id: 'caminhao_trucado', label: 'Trucado' },
                { id: 'caminhao_munck', label: 'Munck' },
                { id: 'carreta_12m', label: 'Carreta 12m' },
              ].map((tipo) => (
                <button
                  key={tipo.id}
                  type="button"
                  onClick={() => {
                    smartAudio.playClick();
                    setTipoTransporte(tipo.id as any);
                  }}
                  className={`h-12 rounded-xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-1.5 ${
                    tipoTransporte === tipo.id
                      ? 'bg-blue-600 text-white border-blue-400 font-black shadow-md'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <Truck className="h-4 w-4" />
                  <span>{tipo.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de Frete */}
          <div>
            <label className="text-xs font-black uppercase text-slate-300 tracking-wider block mb-1.5">
              Tipo de Frete
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  smartAudio.playClick();
                  setFreteTipo('proprio');
                }}
                className={`h-12 rounded-xl text-xs font-bold border-2 transition-all ${
                  freteTipo === 'proprio'
                    ? 'bg-blue-600 text-white border-blue-400 font-black'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                Frete Próprio
              </button>
              <button
                type="button"
                onClick={() => {
                  smartAudio.playClick();
                  setFreteTipo('terceiros');
                }}
                className={`h-12 rounded-xl text-xs font-bold border-2 transition-all ${
                  freteTipo === 'terceiros'
                    ? 'bg-blue-600 text-white border-blue-400 font-black'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                Terceiros / Contratado
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2 mt-auto pt-2">
          <Button
            type="button"
            disabled={criandoRomaneio}
            onClick={handleCriarRomaneio}
            className="w-full h-15 bg-blue-600 hover:bg-blue-500 text-white text-base font-black rounded-2xl shadow-lg shadow-blue-950/50 uppercase active:scale-98"
          >
            {criandoRomaneio ? 'Criando Romaneio...' : 'INICIAR CARGA DESTE CAMINHÃO 🚀'}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              smartAudio.playClick();
              setSubTela('menu');
            }}
            className="w-full h-12 bg-slate-800 border-slate-700 text-slate-300 text-xs font-bold rounded-2xl"
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: SUBTELA 'SELECIONAR_ROMANEIO' (LISTAGEM COM CARGA E CONFERÊNCIA)
  // ─────────────────────────────────────────────────────────────
  if (subTela === 'selecionar_romaneio') {
    return (
      <div className="flex flex-col flex-1 p-4 max-w-xl mx-auto w-full">
        <div className="mb-4 text-center">
          <span className="text-xs font-black uppercase text-blue-400 tracking-wider">
            EXPEDIÇÃO DA OBRA
          </span>
          <h2 className="text-xl font-black text-slate-100 uppercase mt-0.5">
            Romaneios de Carga
          </h2>
          <p className="text-xs text-slate-400">
            Selecione para carregar peças ou abrir conferência e PDF
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {loadingRomaneios ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              <span>Buscando romaneios...</span>
            </div>
          ) : romaneios.length === 0 ? (
            <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-slate-800">
              <AlertCircle className="h-10 w-10 text-slate-500 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-200">Nenhum romaneio aberto</h3>
              <p className="text-xs text-slate-400 mt-1">
                Crie um novo romaneio para iniciar a expedição
              </p>
            </div>
          ) : (
            romaneios.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-2xl bg-slate-800/90 border-2 border-slate-700 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <Truck className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-blue-400">
                          {r.numero_romaneio}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-bold uppercase">
                          {r.status || 'Aberto'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-200 font-semibold mt-0.5">
                        {r.nome_motorista || 'Motorista padrão'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Veículo: {formatTransporte(r.tipo_transporte)} | Peso:{' '}
                        <b className="text-amber-400">
                          {(r.peso_total_romaneio || 0).toLocaleString('pt-BR')} kg
                        </b>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação Direta no Card */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => {
                      smartAudio.playClick();
                      setRomaneioAtivo(r);
                      setSubTela('carregando_pecas');
                    }}
                    className="h-10 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Carregar Peças</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAbrirConferencia(r)}
                    className="h-10 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 border border-slate-600"
                  >
                    <Eye className="h-4 w-4 text-amber-400" />
                    <span>Conferir & PDF</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            smartAudio.playClick();
            setSubTela('menu');
          }}
          className="w-full h-14 bg-slate-800 border-slate-700 text-slate-200 text-sm font-bold rounded-2xl mt-2 active:scale-98"
        >
          ⬅️ Voltar ao Menu
        </Button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: SUBTELA 'CARREGANDO_PECAS' (CARGA DE PEÇAS NO CAMINHÃO)
  // ─────────────────────────────────────────────────────────────
  if (subTela === 'carregando_pecas' && romaneioAtivo) {
    return (
      <div className="flex flex-col flex-1 p-4 max-w-xl mx-auto w-full">
        {/* Banner do Romaneio Ativo com Atalho para Conferência */}
        <div className="p-3.5 rounded-2xl bg-blue-950/60 border border-blue-700/60 mb-3 shadow-md flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-blue-400 tracking-wider">
                CAMINHÃO ATIVO
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                {romaneioAtivo.numero_romaneio}
              </span>
            </div>
            <div className="text-xs text-slate-300 mt-0.5">
              Motorista: <span className="font-bold">{romaneioAtivo.nome_motorista}</span> | Peso:{' '}
              <span className="font-bold text-amber-400">
                {(romaneioAtivo.peso_total_romaneio || 0).toLocaleString('pt-BR')} kg
              </span>
              {itensRomaneio.length > 0 && (
                <span className="text-blue-300 font-semibold ml-1.5">
                  ({itensRomaneio.length} marcas na carga)
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                smartAudio.playClick();
                carregarItensDoRomaneio(romaneioAtivo.id);
                setSubTela('conferencia_romaneio');
              }}
              className="h-8 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-black flex items-center gap-1 active:scale-95"
              title="Abrir conferência do que já foi colocado no romaneio"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Conferir ({itensRomaneio.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                smartAudio.playClick();
                setRomaneioAtivo(null);
                setSubTela('menu');
              }}
              className="text-xs font-bold text-slate-400 hover:text-slate-200 underline px-1 py-1"
            >
              Trocar
            </button>
          </div>
        </div>

        {/* Modal/Seção de Quantidade para o Item Selecionado */}
        {pecaEmbarque ? (
          <div className="p-4 rounded-2xl bg-slate-800 border-2 border-blue-500/80 mb-3 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl font-black text-amber-400">
                {pecaEmbarque.marca}
              </span>
              <span className="text-xs font-bold text-slate-400">
                Saldo Disponível: {pecaEmbarque.saldoDisponivel} un
              </span>
            </div>

            <div className="flex items-center justify-center gap-3 my-3">
              <div className="h-16 px-6 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center">
                <span className="text-3xl font-black text-blue-400">{qtdEmbarcar}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    smartAudio.playClick();
                    setQtdEmbarcar((p) => Math.min(pecaEmbarque.saldoDisponivel, p + 1));
                  }}
                  className="h-12 px-3 rounded-xl bg-slate-700 font-bold text-white active:scale-95"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    smartAudio.playClick();
                    setQtdEmbarcar((p) => Math.min(pecaEmbarque.saldoDisponivel, p + 2));
                  }}
                  className="h-12 px-3 rounded-xl bg-slate-700 font-bold text-white active:scale-95"
                >
                  +2
                </button>
                <button
                  type="button"
                  onClick={() => {
                    smartAudio.playClick();
                    setQtdEmbarcar(pecaEmbarque.saldoDisponivel);
                  }}
                  className="h-12 px-2.5 rounded-xl bg-blue-500/20 text-blue-300 font-black text-xs active:scale-95"
                >
                  TODAS
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button
                type="button"
                disabled={salvandoItem}
                onClick={handleIncluirPeca}
                className="h-13 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs uppercase"
              >
                {salvandoItem ? 'Gravando...' : 'INCLUIR NO CAMINHÃO'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPecaEmbarque(null)}
                className="h-13 bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}

        {/* Lista de Peças Prontas para Embarcar */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pb-4">
          <div className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1">
            Peças com Saldo para Embarque
          </div>

          {loadingPecas ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              <span>Carregando peças prontas...</span>
            </div>
          ) : pecasProntas.filter((p) => p.saldoDisponivel > 0).length === 0 ? (
            <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-slate-800">
              <Package className="h-10 w-10 text-slate-500 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-200">
                Nenhuma peça com saldo de embarque
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Todas as peças prontas já foram embarcadas em romaneios anteriores
              </p>
            </div>
          ) : (
            pecasProntas
              .filter((p) => p.saldoDisponivel > 0)
              .map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-2xl bg-slate-800/95 border border-slate-700 flex items-center justify-between gap-2 shadow-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-amber-400">{p.marca}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-semibold">
                        {p.etapa_fase || 'Estrutural'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      Saldo p/ Embarque:{' '}
                      <span className="font-bold text-blue-400">{p.saldoDisponivel} un</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      smartAudio.playClick();
                      setPecaEmbarque(p);
                      setQtdEmbarcar(1);
                    }}
                    className="h-11 px-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl active:scale-95 text-xs uppercase shrink-0"
                  >
                    Embarcar
                  </Button>
                </div>
              ))
          )}
        </div>

        {/* Botão Finalizador: abre a tela de conferência & PDF */}
        <div className="space-y-2 mt-2">
          <Button
            type="button"
            onClick={() => {
              smartAudio.playSuccess();
              carregarItensDoRomaneio(romaneioAtivo.id);
              setSubTela('conferencia_romaneio');
            }}
            className="w-full h-15 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black rounded-2xl shadow-lg uppercase active:scale-98 gap-2"
          >
            <FileCheck className="h-5 w-5" />
            <span>CONFERIR & FINALIZAR ROMANEIO</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              smartAudio.playClick();
              setSubTela('menu');
            }}
            className="w-full h-12 bg-slate-800 border-slate-700 text-slate-300 text-xs font-bold rounded-2xl"
          >
            ⬅️ Voltar ao Menu
          </Button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: SUBTELA 'CONFERENCIA_ROMANEIO' (CONFERÊNCIA TOUCH & PDF)
  // ─────────────────────────────────────────────────────────────
  if (subTela === 'conferencia_romaneio' && romaneioAtivo) {
    const totalPecasCarregadas = itensRomaneio.reduce(
      (sum, item) => sum + Number(item.quantidade_expedida || 0),
      0
    );
    const pesoTotalCarregado = itensRomaneio.reduce(
      (sum, item) => sum + Number(item.peso_total || 0),
      0
    );

    return (
      <div className="flex flex-col flex-1 p-4 max-w-xl mx-auto w-full">
        {/* Cabeçalho da Conferência */}
        <div className="mb-3 text-center">
          <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
            CONFERÊNCIA DE EMBARQUE
          </span>
          <h2 className="text-xl font-black text-slate-100 uppercase mt-0.5">
            {romaneioAtivo.numero_romaneio}
          </h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-xs text-slate-300 font-medium">
              OF {obra.of_number} — {obra.cliente || 'Industrial'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase">
              {romaneioAtivo.status || 'Em conferência'}
            </span>
          </div>
        </div>

        {/* KPIs em Grid Rápido */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 text-center">
            <span className="text-[10px] font-black uppercase text-slate-400 block">
              Marcas
            </span>
            <span className="text-xl font-black text-amber-400">
              {itensRomaneio.length}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 text-center">
            <span className="text-[10px] font-black uppercase text-slate-400 block">
              Peças
            </span>
            <span className="text-xl font-black text-blue-400">
              {totalPecasCarregadas} un
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 text-center">
            <span className="text-[10px] font-black uppercase text-slate-400 block">
              Peso Carga
            </span>
            <span className="text-lg font-black text-emerald-400">
              {pesoTotalCarregado.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg
            </span>
          </div>
        </div>

        {/* Card de Dados do Transporte */}
        <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 mb-3 text-xs text-slate-300 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Motorista:</span>
            <span className="font-bold text-slate-200">
              {romaneioAtivo.nome_motorista || 'Não informado'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Veículo:</span>
            <span className="font-bold text-slate-200">
              {formatTransporte(romaneioAtivo.tipo_transporte)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Tipo de Frete:</span>
            <span className="font-bold text-slate-200">
              {formatFrete(romaneioAtivo.frete_tipo)}
            </span>
          </div>
        </div>

        {/* Lista de Peças Colocadas no Romaneio para Conferência */}
        <div className="flex-1 overflow-y-auto space-y-2 pb-3">
          <div className="flex items-center justify-between text-xs font-black uppercase text-slate-400 tracking-wider mb-1 px-1">
            <span>Peças Colocadas no Caminhão ({itensRomaneio.length})</span>
            <span className="text-slate-500 font-normal">Toque na lixeira para estornar</span>
          </div>

          {loadingItensRomaneio ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
              <span>Carregando itens do romaneio...</span>
            </div>
          ) : itensRomaneio.length === 0 ? (
            <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-slate-800">
              <Package className="h-10 w-10 text-slate-500 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-200">
                Nenhuma peça colocada neste romaneio ainda
              </h3>
              <p className="text-xs text-slate-400 mt-1 mb-3">
                Adicione peças prontas no caminhão para gerar o romaneio
              </p>
              <Button
                type="button"
                onClick={() => setSubTela('carregando_pecas')}
                className="h-11 px-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl"
              >
                + Adicionar Peças ao Caminhão
              </Button>
            </div>
          ) : (
            itensRomaneio.map((item, idx) => (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-slate-800/95 border border-slate-700/80 flex items-center justify-between gap-2 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-lg bg-slate-700 flex items-center justify-center text-[11px] font-black text-slate-300 shrink-0">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-amber-400">
                        {item.marca}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 font-bold border border-blue-800/40">
                        {item.fase || '1'}
                      </span>
                    </div>
                    {item.descricao && (
                      <div className="text-xs text-slate-300 line-clamp-1">
                        {item.descricao}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Peso Total: <b className="text-slate-200">{item.peso_total.toFixed(1)} kg</b> ({item.peso_unitario.toFixed(1)} kg/un)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-lg font-black text-blue-400">
                      {item.quantidade_expedida}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-semibold">un</span>
                  </div>

                  {/* Botão de Excluir / Estornar Item */}
                  <button
                    type="button"
                    disabled={removendoItemId === item.id}
                    onClick={() => handleRemoverItemRomaneio(item)}
                    className="h-9 w-9 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-400 flex items-center justify-center active:scale-95 transition-all"
                    title="Remover peça deste romaneio"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Botões de Ação na Base: Imprimir PDF, Compartilhar e Concluir */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          {/* Botão Principal: Imprimir / Baixar PDF Oficial */}
          <Button
            type="button"
            disabled={gerandoPDF || itensRomaneio.length === 0}
            onClick={() => gerarRomaneioPDF('download')}
            className="w-full h-14 bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-black rounded-2xl shadow-lg shadow-amber-950/30 uppercase active:scale-98 gap-2"
          >
            <Download className="h-5 w-5" />
            <span>{gerandoPDF ? 'Gerando Romaneio...' : 'BAIXAR / IMPRIMIR PDF DO ROMANEIO'}</span>
          </Button>

          {/* Linha com WhatsApp e Adicionar Mais Peças */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={itensRomaneio.length === 0}
              onClick={() => gerarRomaneioPDF('whatsapp')}
              className="h-12 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
            >
              <Share2 className="h-4 w-4" />
              <span>Enviar WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => {
                smartAudio.playClick();
                setSubTela('carregando_pecas');
              }}
              className="h-12 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4 text-blue-400" />
              <span>+ Adicionar Peças</span>
            </button>
          </div>

          {/* Botão de Concluir Romaneio Oficialmente */}
          <Button
            type="button"
            onClick={() => handleConcluirRomaneioOficial('Expedido')}
            className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl uppercase active:scale-98 gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>CONCLUIR & MARCAR COMO EXPEDIDO</span>
          </Button>

          {/* Voltar ao Menu */}
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              smartAudio.playClick();
              setSubTela('menu');
              setRomaneioAtivo(null);
            }}
            className="w-full h-10 text-slate-400 hover:text-slate-200 text-xs font-bold"
          >
            ⬅️ Voltar ao Menu Principal
          </Button>
        </div>
      </div>
    );
  }

  return null;
};
