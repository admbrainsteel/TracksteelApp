import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  FileText, 
  Download, 
  Mail, 
  X, 
  CheckCircle2, 
  Clock, 
  Circle, 
  AlertCircle,
  MessageCircle,
  Filter,
  RotateCcw,
  Layers
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

interface SmartConsultaRelatoriosFlowProps {
  obra: OFAtiva;
  onVoltarHub: () => void;
  abrirDiretoTurno?: boolean;
}

interface PecaStatus {
  id: string;
  marca: string;
  descricao: string;
  etapa_fase: string;
  perfil_principal?: string;
  material?: string;
  quantidade: number;
  peso_unitario: number;
  detalhamento: number;
  corte: number;
  montagem: number;
  solda: number;
  pintura: number;
  expedido: number;
  montado_obra: number;
  tem_componentes?: boolean | null;
}

export const SmartConsultaRelatoriosFlow: React.FC<SmartConsultaRelatoriosFlowProps> = ({
  obra,
  onVoltarHub,
  abrirDiretoTurno = false,
}) => {
  const { user } = useAuth();

  // Aba ativa: 'consulta' | 'relatorios'
  const [abaAtiva, setAbaAtiva] = useState<'consulta' | 'relatorios'>(
    abrirDiretoTurno ? 'relatorios' : 'consulta'
  );

  // Estados da Consulta e Filtros
  const [busca, setBusca] = useState('');
  const [filtroFase, setFiltroFase] = useState<string>('todas');
  const [filtroPerfilRapido, setFiltroPerfilRapido] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'fabricando' | 'pronto' | 'embarcado' | 'montado'>('todos');

  const [pecasStatus, setPecasStatus] = useState<PecaStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Relatórios
  const [gerandoPDF, setGerandoPDF] = useState(false);

  // Carregar dados de peças, processos e apontamentos da OF
  const carregarDadosCompletos = React.useCallback(async () => {
    try {
      setLoading(true);

      const [resPecas, resProcessos, resApontamentos, resExpedidos, resMontados] = await Promise.all([
        // 1. Peças da OF
        supabase
          .from('pecas')
          .select('id, marca, descricao, etapa_fase, quantidade, peso_unitario, perfil_principal, material, tem_componentes')
          .eq('of_number', obra.of_number),

        // 2. Processos de fabricação (para mapear nome sem depender de foreign key)
        supabase
          .from('processos_fabricacao')
          .select('id, nome, ordem'),

        // 3. Apontamentos da OF
        supabase
          .from('apontamentos_producao')
          .select('peca_id, processo_id, quantidade_produzida')
          .eq('of_number', obra.of_number),

        // 4. Expedição em Romaneios
        supabase
          .from('itens_romaneio_pecas')
          .select(`
            marca,
            quantidade_expedida,
            romaneios_expedicao!inner(of_number)
          `)
          .eq('romaneios_expedicao.of_number', obra.of_number),

        // 5. Montagem em Obra (RDO)
        supabase
          .from('apontamentos_peca_obra')
          .select(`
            marca_peca,
            quantidade,
            diario_obra_rdo!inner(of_number)
          `)
          .eq('diario_obra_rdo.of_number', obra.of_number),
      ]);

      // Mapear processos por ID -> Nome em minúsculas
      const mapaNomeProcesso = new Map<string, string>();
      (resProcessos.data || []).forEach((proc) => {
        mapaNomeProcesso.set(proc.id, proc.nome.toLowerCase().trim());
      });

      // Mapear apontamentos por peca_id
      const mapaProcPeca = new Map<
        string,
        { detalhamento: number; corte: number; montagem: number; solda: number; pintura: number }
      >();

      (resApontamentos.data || []).forEach((ap: any) => {
        const pecaId = ap.peca_id;
        const nomeProc = mapaNomeProcesso.get(ap.processo_id) || '';
        const qtd = Number(ap.quantidade_produzida || 0);

        const atual = mapaProcPeca.get(pecaId) || {
          detalhamento: 0,
          corte: 0,
          montagem: 0,
          solda: 0,
          pintura: 0,
        };

        if (nomeProc.includes('detalh')) {
          atual.detalhamento += qtd;
        } else if (nomeProc.includes('corte')) {
          atual.corte += qtd;
        } else if (nomeProc.includes('montag')) {
          atual.montagem += qtd;
        } else if (nomeProc.includes('solda')) {
          atual.solda += qtd;
        } else if (nomeProc.includes('pint') || nomeProc.includes('galv') || nomeProc.includes('jateam')) {
          atual.pintura += qtd;
        }

        mapaProcPeca.set(pecaId, atual);
      });

      // Mapear expedição por marca
      const mapaExp = new Map<string, number>();
      (resExpedidos.data || []).forEach((item: any) => {
        const marca = item.marca;
        mapaExp.set(marca, (mapaExp.get(marca) || 0) + Number(item.quantidade_expedida || 0));
      });

      // Mapear montagem por marca
      const mapaMont = new Map<string, number>();
      (resMontados.data || []).forEach((item: any) => {
        const marca = item.marca_peca;
        mapaMont.set(marca, (mapaMont.get(marca) || 0) + Number(item.quantidade || 0));
      });

      // Montar PecaStatus com ordenação natural alfanumérica
      const lista: PecaStatus[] = (resPecas.data || []).map((p) => {
        const procs = mapaProcPeca.get(p.id) || {
          detalhamento: 0,
          corte: 0,
          montagem: 0,
          solda: 0,
          pintura: 0,
        };

        return {
          id: p.id,
          marca: p.marca || '',
          descricao: p.descricao || '',
          etapa_fase: p.etapa_fase || '1',
          perfil_principal: p.perfil_principal || '',
          material: p.material || '',
          quantidade: Number(p.quantidade || 0),
          peso_unitario: Number(p.peso_unitario || 0),
          detalhamento: procs.detalhamento,
          corte: procs.corte,
          montagem: procs.montagem,
          solda: procs.solda,
          pintura: procs.pintura,
          expedido: mapaExp.get(p.marca) || 0,
          montado_obra: mapaMont.get(p.marca) || 0,
          tem_componentes: p.tem_componentes,
        };
      });

      // ORDENAÇÃO NATURAL: 1, 2, 3... 10... ou P1, P2, P10, V1, V101
      lista.sort((a, b) =>
        a.marca.localeCompare(b.marca, undefined, { numeric: true, sensitivity: 'base' })
      );

      setPecasStatus(lista);
    } catch (e) {
      console.error('Erro ao carregar dados de status:', e);
      toast.error('Erro ao consultar status das peças');
    } finally {
      setLoading(false);
    }
  }, [obra.of_number]);

  useEffect(() => {
    carregarDadosCompletos();
  }, [carregarDadosCompletos]);

  // Lista de fases únicas para filtro
  const fasesUnicas = useMemo(() => {
    const setF = new Set<string>();
    pecasStatus.forEach((p) => {
      if (p.etapa_fase && p.etapa_fase.trim()) {
        setF.add(p.etapa_fase.trim());
      }
    });
    return Array.from(setF).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [pecasStatus]);

  // Filtragem da lista refinada por Fase, Perfil Rápido, Texto e Status
  const pecasFiltradas = useMemo(() => {
    return pecasStatus.filter((p) => {
      // 1. Filtro por Fase
      if (filtroFase !== 'todas') {
        if ((p.etapa_fase || '').trim() !== filtroFase) return false;
      }

      // 2. Filtro rápido de Perfil / Material (W/HP, L, CH, U, RED, TUB)
      if (filtroPerfilRapido) {
        const perfilNorm = (p.perfil_principal || '').toLowerCase();
        const descNorm = (p.descricao || '').toLowerCase();
        const matNorm = (p.material || '').toLowerCase();
        const buscaP = filtroPerfilRapido.toLowerCase();

        let bateuPerfil = false;
        if (buscaP === 'w_hp') {
          bateuPerfil =
            perfilNorm.startsWith('w') ||
            perfilNorm.startsWith('hp') ||
            perfilNorm.includes('perfil w') ||
            perfilNorm.includes('hp') ||
            descNorm.startsWith('w') ||
            descNorm.startsWith('hp');
        } else if (buscaP === 'l') {
          bateuPerfil =
            perfilNorm.startsWith('l') ||
            perfilNorm.includes('cant') ||
            descNorm.startsWith('l') ||
            descNorm.includes('cant');
        } else if (buscaP === 'ch') {
          bateuPerfil =
            perfilNorm.includes('chapa') ||
            perfilNorm.includes('ch.') ||
            perfilNorm.startsWith('ch') ||
            perfilNorm.startsWith('pl') ||
            descNorm.includes('chapa') ||
            descNorm.includes('ch.') ||
            descNorm.includes('arruela') ||
            matNorm.includes('chapa');
        } else if (buscaP === 'u') {
          bateuPerfil =
            perfilNorm.startsWith('u') ||
            perfilNorm.startsWith('c') ||
            perfilNorm.includes('perfil u') ||
            perfilNorm.includes('viga u') ||
            descNorm.startsWith('u') ||
            descNorm.includes('perfil u');
        } else if (buscaP === 'red') {
          bateuPerfil =
            perfilNorm.includes('red') ||
            perfilNorm.includes('ferro') ||
            perfilNorm.includes('barra') ||
            perfilNorm.includes('ø') ||
            descNorm.includes('red') ||
            descNorm.includes('ferro') ||
            descNorm.includes('barra') ||
            descNorm.includes('chumb') ||
            descNorm.includes('ø');
        } else if (buscaP === 'tub') {
          bateuPerfil =
            perfilNorm.includes('tubo') ||
            perfilNorm.includes('tubular') ||
            perfilNorm.startsWith('tub') ||
            descNorm.includes('tubo') ||
            descNorm.includes('tubular');
        } else {
          bateuPerfil = perfilNorm.includes(buscaP) || descNorm.includes(buscaP) || matNorm.includes(buscaP);
        }

        if (!bateuPerfil) return false;
      }

      // 3. Filtro texto (busca por marca, perfil, descrição ou material)
      if (busca.trim()) {
        const t = busca.toLowerCase().trim();
        const match =
          p.marca.toLowerCase().includes(t) ||
          (p.perfil_principal && p.perfil_principal.toLowerCase().includes(t)) ||
          (p.descricao && p.descricao.toLowerCase().includes(t)) ||
          (p.material && p.material.toLowerCase().includes(t)) ||
          p.etapa_fase.toLowerCase().includes(t);
        if (!match) return false;
      }

      // 4. Filtro por status
      if (filtroStatus === 'todos') return true;
      if (filtroStatus === 'montado') return p.montado_obra >= p.quantidade;
      if (filtroStatus === 'embarcado') return p.expedido >= p.quantidade;
      if (filtroStatus === 'pronto') return p.pintura >= p.quantidade || p.solda >= p.quantidade;
      if (filtroStatus === 'fabricando') return (p.corte > 0 || p.detalhamento > 0) && p.pintura < p.quantidade;

      return true;
    });
  }, [pecasStatus, busca, filtroFase, filtroPerfilRapido, filtroStatus]);

  // Limpar todos os filtros
  const handleLimparFiltros = () => {
    smartAudio.playClick();
    setBusca('');
    setFiltroFase('todas');
    setFiltroPerfilRapido('');
    setFiltroStatus('todos');
    toast.info('Filtros restaurados');
  };

  const temFiltroAtivo =
    busca !== '' || filtroFase !== 'todas' || filtroPerfilRapido !== '' || filtroStatus !== 'todos';

  // Badge da etapa
  const getBadgeEtapa = (concluido: number, total: number) => {
    if (concluido >= total && total > 0) {
      return { icon: <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />, cor: 'text-emerald-700 dark:text-emerald-400', label: `${concluido}` };
    }
    if (concluido > 0) {
      return { icon: <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />, cor: 'text-amber-700 dark:text-amber-400', label: `${concluido}/${total}` };
    }
    return { icon: <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600" />, cor: 'text-slate-400 dark:text-slate-500', label: '0' };
  };

  // ─────────────────────────────────────────────────────────────
  // GERAÇÃO DE RELATÓRIOS EM PDF (jsPDF)
  // ─────────────────────────────────────────────────────────────

  // 1. Relatório do Turno de Hoje
  const gerarRelatorioTurnoPDF = async (acao: 'download' | 'whatsapp' | 'email') => {
    try {
      setGerandoPDF(true);
      const hoje = new Date().toISOString().split('T')[0];

      const { data: meusApontamentos, error } = await supabase
        .from('apontamentos_producao')
        .select(`
          quantidade_produzida,
          data_apontamento,
          created_at,
          pecas (
            marca,
            descricao,
            peso_unitario,
            etapa_fase
          ),
          processos_fabricacao (
            nome
          )
        `)
        .eq('of_number', obra.of_number)
        .eq('data_apontamento', hoje)
        .eq('created_by', user?.id || '');

      if (error) throw error;

      const doc = new jsPDF();
      const titulo = `RELATÓRIO DO TURNO - MODO SMART`;
      const dataFormatada = new Date().toLocaleDateString('pt-BR');
      const horaFormatada = new Date().toLocaleTimeString('pt-BR');

      // 1. TOPO LIMPO (FUNDO BRANCO, AZUL MARINHO & VERDE - ZERO DESPERDÍCIO DE TONER)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 43, 92); // Azul Marinho
      doc.text(titulo, 14, 16);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105); // Verde
      doc.text(`TURNO DO OPERADOR`, 150, 16);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(31, 41, 55); // Preto / Grafite
      doc.text(`OF: ${obra.of_number}   |   Cliente: ${obra.cliente || 'Industrial'}`, 14, 23);
      doc.text(`Operador: ${user?.email || 'Chão de Fábrica'}   |   Data: ${dataFormatada} às ${horaFormatada}`, 14, 29);

      // Linha divisória de topo fina: Azul Marinho com terminal em Verde
      doc.setDrawColor(30, 58, 138); // Azul Marinho
      doc.setLineWidth(1.2);
      doc.line(14, 33, 165, 33);
      doc.setDrawColor(5, 150, 105); // Verde
      doc.setLineWidth(1.2);
      doc.line(165, 33, 196, 33);

      let totalPecas = 0;
      let totalKg = 0;

      const tableRows = (meusApontamentos || []).map((ap: any) => {
        const marca = ap.pecas?.marca || 'N/A';
        const fase = ap.pecas?.etapa_fase || 'Geral';
        const processo = ap.processos_fabricacao?.nome || 'Produção';
        const qtd = Number(ap.quantidade_produzida || 0);
        const pesoUnit = Number(ap.pecas?.peso_unitario || 0);
        const pesoTotal = qtd * pesoUnit;

        totalPecas += qtd;
        totalKg += pesoTotal;

        return [
          marca,
          fase,
          processo,
          qtd.toString(),
          `${pesoUnit.toFixed(1)} kg`,
          `${pesoTotal.toFixed(1)} kg`,
        ];
      });

      autoTable(doc, {
        startY: 38,
        head: [['Marca', 'Fase', 'Processo', 'Qtd', 'Peso Unit.', 'Peso Total']],
        body: tableRows,
        theme: 'plain',
        headStyles: {
          fillColor: [248, 250, 252], // Fundo branco/gelo suave
          textColor: [15, 43, 92],    // Azul Marinho
          fontStyle: 'bold',
          lineWidth: 0.4,
          lineColor: [30, 58, 138],   // Linha azul marinho
        },
        styles: {
          fontSize: 8.5,
          textColor: [31, 41, 55],    // Preto nítido
          cellPadding: 2.5,
          lineWidth: 0.1,
          lineColor: [226, 232, 240], // Linha cinza clara
        },
        columnStyles: {
          0: { cellWidth: 26, fontStyle: 'bold', textColor: [15, 43, 92] }, // Marca em Azul Marinho
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 45 },
          3: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
          4: { cellWidth: 32, halign: 'right' },
          5: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: [22, 101, 52] }, // Peso em Verde
        },
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 80;

      // Quadro de Resumo com Fundo Branco, Barra e Borda Verde
      const boxResumoY = finalY + 5;
      doc.setFillColor(5, 150, 105); // Barra lateral verde
      doc.roundedRect(14, boxResumoY, 3, 16, 1, 1, 'F');

      doc.setDrawColor(5, 150, 105);
      doc.setLineWidth(0.4);
      doc.roundedRect(17, boxResumoY, 179, 16, 1.5, 1.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(22, 101, 52); // Verde
      doc.text(`RESUMO DO TURNO:`, 22, boxResumoY + 6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42); // Preto
      doc.text(
        `Total de Peças Apontadas: ${totalPecas} un    |    Peso Total: ${totalKg.toFixed(1)} kg`,
        22,
        boxResumoY + 12
      );

      const nomeArquivo = `Turno_${obra.of_number}_${hoje}.pdf`;

      if (acao === 'download') {
        doc.save(nomeArquivo);
        smartAudio.playSuccess();
        toast.success('Relatório em PDF baixado com sucesso!');
      } else if (acao === 'whatsapp') {
        smartAudio.playClick();
        const textoMsg = encodeURIComponent(
          `*TRACKSTEEL - RELATÓRIO DO TURNO*\n` +
          `*Obra:* OF ${obra.of_number} - ${obra.cliente || ''}\n` +
          `*Data:* ${dataFormatada}\n` +
          `*Operador:* ${user?.email || 'Chão de Fábrica'}\n` +
          `*Produção:* ${totalPecas} peças apontadas (${totalKg.toFixed(1)} kg)\n\n` +
          `_Registrado com sucesso via Modo Smart TrackSteel._`
        );
        window.open(`https://wa.me/?text=${textoMsg}`, '_blank');
      } else if (acao === 'email') {
        smartAudio.playClick();
        const assunto = encodeURIComponent(`Relatório de Turno - OF ${obra.of_number}`);
        const corpo = encodeURIComponent(
          `Segue o resumo do turno operacional:\n\n` +
          `Obra: OF ${obra.of_number}\n` +
          `Data: ${dataFormatada}\n` +
          `Total de Peças Apontadas: ${totalPecas} un\n` +
          `Peso Total: ${totalKg.toFixed(1)} kg\n`
        );
        window.open(`mailto:?subject=${assunto}&body=${corpo}`, '_blank');
      }
    } catch (e: any) {
      smartAudio.playAlert();
      console.error('Erro ao gerar relatório:', e);
      toast.error('Erro ao gerar relatório: ' + (e?.message || ''));
    } finally {
      setGerandoPDF(false);
    }
  };

  // 2. Relatório Geral da Obra
  const gerarRelatorioGeralObraPDF = (acao: 'download' | 'whatsapp' | 'email' = 'download') => {
    try {
      setGerandoPDF(true);
      const doc = new jsPDF();
      const agora = new Date();
      const dataFormatada = agora.toLocaleDateString('pt-BR');
      const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Agrupar peças por fase
      const fasesMap = new Map<string, PecaStatus[]>();
      pecasStatus.forEach((p) => {
        const faseKey = (p.etapa_fase && p.etapa_fase.trim()) ? p.etapa_fase.trim() : '1';
        if (!fasesMap.has(faseKey)) {
          fasesMap.set(faseKey, []);
        }
        fasesMap.get(faseKey)!.push(p);
      });

      // Ordenar as fases de forma natural (1, 2, 3...)
      const fasesOrdenadas = Array.from(fasesMap.keys()).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      );

      // Totais gerais consolidados da OF
      let grandTotalQtd = 0;
      let grandTotalDet = 0;
      let grandTotalCorte = 0;
      let grandTotalSolda = 0;
      let grandTotalPint = 0;
      let grandTotalExp = 0;
      let grandTotalObra = 0;
      let grandTotalPeso = 0;

      const tableBody: any[] = [];

      fasesOrdenadas.forEach((faseKey) => {
        const pecasFase = fasesMap.get(faseKey)!;

        // Ordenar as marcas dentro de cada fase por ordem natural alfanumérica (1, 2, 3... 10... ou P1, P2...)
        pecasFase.sort((a, b) =>
          a.marca.localeCompare(b.marca, undefined, { numeric: true, sensitivity: 'base' })
        );

        let faseQtd = 0;
        let faseDet = 0;
        let faseCorte = 0;
        let faseSolda = 0;
        let fasePint = 0;
        let faseExp = 0;
        let faseObra = 0;
        let fasePeso = 0;

        pecasFase.forEach((p) => {
          faseQtd += p.quantidade;
          faseDet += p.detalhamento;
          faseCorte += p.corte;
          faseSolda += p.solda;
          fasePint += p.pintura;
          faseExp += p.expedido;
          faseObra += p.montado_obra;
          fasePeso += (p.peso_unitario || 0) * (p.quantidade || 0);
        });

        grandTotalQtd += faseQtd;
        grandTotalDet += faseDet;
        grandTotalCorte += faseCorte;
        grandTotalSolda += faseSolda;
        grandTotalPint += fasePint;
        grandTotalExp += faseExp;
        grandTotalObra += faseObra;
        grandTotalPeso += fasePeso;

        // Formatação refinada do título da fase
        const faseNum = faseKey.toLowerCase().replace(/^fase\s*/i, '').trim();
        const nomeFaseExibicao = `FASE ${faseNum || faseKey}`;

        // 1. Linha de subdivisão da Fase (cabeçalho de seção interna ocupando as 9 colunas)
        const infoFase = `${nomeFaseExibicao}   •   ${pecasFase.length} ${pecasFase.length === 1 ? 'marca' : 'marcas'}   |   Total: ${faseQtd} un${fasePeso > 0 ? `   |   ${fasePeso.toFixed(1)} kg` : ''}`;

        tableBody.push([
          {
            content: infoFase,
            colSpan: 9,
            styles: {
              fillColor: [15, 43, 92],      // Azul Marinho Corporativo
              textColor: [255, 255, 255],   // Branco Puro
              fontStyle: 'bold',
              fontSize: 8,
              cellPadding: { top: 3.2, bottom: 3.2, left: 4, right: 4 },
              halign: 'left',
            },
          },
        ]);

        // 2. Linhas das marcas ordenadas pertencentes a esta fase
        pecasFase.forEach((p) => {
          tableBody.push([
            p.marca,
            p.perfil_principal || p.descricao || '-',
            p.quantidade.toString(),
            p.detalhamento.toString(),
            p.corte.toString(),
            p.solda.toString(),
            p.pintura.toString(),
            p.expedido.toString(),
            p.montado_obra.toString(),
          ]);
        });

        // 3. Linha de Subtotal da Fase
        tableBody.push([
          {
            content: `Subtotal ${nomeFaseExibicao}:`,
            colSpan: 2,
            styles: {
              fontStyle: 'bold',
              halign: 'right',
              fillColor: [241, 245, 249],
              textColor: [15, 43, 92],
              fontSize: 7.5,
              cellPadding: 2,
            },
          },
          {
            content: faseQtd.toString(),
            styles: { fontStyle: 'bold', halign: 'center', fillColor: [241, 245, 249], textColor: [15, 43, 92], fontSize: 7.5, cellPadding: 2 },
          },
          {
            content: faseDet.toString(),
            styles: { fontStyle: 'bold', halign: 'center', fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 7.5, cellPadding: 2 },
          },
          {
            content: faseCorte.toString(),
            styles: { fontStyle: 'bold', halign: 'center', fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 7.5, cellPadding: 2 },
          },
          {
            content: faseSolda.toString(),
            styles: { fontStyle: 'bold', halign: 'center', fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 7.5, cellPadding: 2 },
          },
          {
            content: fasePint.toString(),
            styles: { fontStyle: 'bold', halign: 'center', fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 7.5, cellPadding: 2 },
          },
          {
            content: faseExp.toString(),
            styles: { fontStyle: 'bold', halign: 'center', fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 7.5, cellPadding: 2 },
          },
          {
            content: faseObra.toString(),
            styles: { fontStyle: 'bold', halign: 'center', fillColor: [241, 245, 249], textColor: [22, 101, 52], fontSize: 7.5, cellPadding: 2 },
          },
        ]);
      });

      // 4. Linha de Total Geral Consolidado da Obra (OF)
      tableBody.push([
        {
          content: 'TOTAL GERAL DA OBRA (OF):',
          colSpan: 2,
          styles: {
            fontStyle: 'bold',
            halign: 'right',
            fillColor: [30, 58, 138],
            textColor: [255, 255, 255],
            fontSize: 8,
            cellPadding: 3,
          },
        },
        {
          content: grandTotalQtd.toString(),
          styles: { fontStyle: 'bold', halign: 'center', fillColor: [30, 58, 138], textColor: [255, 255, 255], fontSize: 8, cellPadding: 3 },
        },
        {
          content: grandTotalDet.toString(),
          styles: { fontStyle: 'bold', halign: 'center', fillColor: [30, 58, 138], textColor: [255, 255, 255], fontSize: 8, cellPadding: 3 },
        },
        {
          content: grandTotalCorte.toString(),
          styles: { fontStyle: 'bold', halign: 'center', fillColor: [30, 58, 138], textColor: [255, 255, 255], fontSize: 8, cellPadding: 3 },
        },
        {
          content: grandTotalSolda.toString(),
          styles: { fontStyle: 'bold', halign: 'center', fillColor: [30, 58, 138], textColor: [255, 255, 255], fontSize: 8, cellPadding: 3 },
        },
        {
          content: grandTotalPint.toString(),
          styles: { fontStyle: 'bold', halign: 'center', fillColor: [30, 58, 138], textColor: [255, 255, 255], fontSize: 8, cellPadding: 3 },
        },
        {
          content: grandTotalExp.toString(),
          styles: { fontStyle: 'bold', halign: 'center', fillColor: [30, 58, 138], textColor: [255, 255, 255], fontSize: 8, cellPadding: 3 },
        },
        {
          content: grandTotalObra.toString(),
          styles: { fontStyle: 'bold', halign: 'center', fillColor: [30, 58, 138], textColor: [134, 239, 172], fontSize: 8, cellPadding: 3 },
        },
      ]);

      // --- CABEÇALHO MODERNO E EXECUTIVO NA PÁGINA 1 ---
      // Acento visual azul marinho
      doc.setFillColor(15, 43, 92);
      doc.roundedRect(14, 11, 4, 13, 1, 1, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 43, 92);
      doc.text('RELATÓRIO GERAL DE FABRICAÇÃO', 21, 17);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Acompanhamento Físico de Produção e Avanço por Fases', 21, 22.5);

      // Badge elegante da OF no canto superior direito
      doc.setFillColor(236, 253, 245);
      doc.roundedRect(144, 10, 52, 14, 2, 2, 'F');
      doc.setDrawColor(5, 150, 105);
      doc.setLineWidth(0.5);
      doc.roundedRect(144, 10, 52, 14, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(5, 150, 105);
      doc.text(`OF: ${obra.of_number}`, 170, 16.5, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(4, 120, 87);
      doc.text('TRACKSTEEL INDUSTRIAL', 170, 21.5, { align: 'center' });

      // Box de Metadados / Resumo Executivo da Obra
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 26, 182, 12, 1.5, 1.5, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(14, 26, 182, 12, 1.5, 1.5, 'S');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('Cliente:', 18, 31);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`${obra.cliente || 'Industrial'}`, 30, 31);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Emissão:', 18, 35.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`${dataFormatada} às ${horaFormatada}`, 31, 35.5);

      // Métricas consolidadas à direita no box
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Fases:', 110, 31);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 43, 92);
      doc.text(`${fasesOrdenadas.length}`, 121, 31);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Marcas:', 135, 31);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 43, 92);
      doc.text(`${pecasStatus.length}`, 148, 31);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Peças Totais:', 162, 31);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text(`${grandTotalQtd} un`, 181, 31);

      if (grandTotalPeso > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text('Peso Total:', 110, 35.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 43, 92);
        doc.text(`${grandTotalPeso.toFixed(1)} kg`, 128, 35.5);
      }

      // Linha divisória fina com acento Azul e Verde
      doc.setDrawColor(30, 58, 138);
      doc.setLineWidth(1.2);
      doc.line(14, 40, 155, 40);
      doc.setDrawColor(5, 150, 105);
      doc.setLineWidth(1.2);
      doc.line(155, 40, 196, 40);

      // --- EXECUÇÃO DO AUTOTABLE ---
      autoTable(doc, {
        startY: 43,
        head: [['Marca', 'Perfil / Peça', 'Total', 'Det.', 'Corte', 'Solda', 'Pint.', 'Exp.', 'Obra']],
        body: tableBody,
        theme: 'plain',
        margin: { top: 16, bottom: 16, left: 14, right: 14 },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 43, 92],
          fontStyle: 'bold',
          fontSize: 8,
          lineWidth: { top: 0.4, bottom: 0.8, left: 0.1, right: 0.1 },
          lineColor: [30, 58, 138],
          halign: 'center',
          cellPadding: 2.5,
        },
        styles: {
          fontSize: 7.5,
          textColor: [31, 41, 55],
          cellPadding: 2,
          lineWidth: 0.1,
          lineColor: [226, 232, 240],
        },
        alternateRowStyles: {
          fillColor: [249, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 22, fontStyle: 'bold', textColor: [15, 43, 92], halign: 'center' },
          1: { cellWidth: 44, halign: 'left' },
          2: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
          3: { cellWidth: 16, halign: 'center' },
          4: { cellWidth: 16, halign: 'center' },
          5: { cellWidth: 16, halign: 'center' },
          6: { cellWidth: 16, halign: 'center' },
          7: { cellWidth: 18, halign: 'center' },
          8: { cellWidth: 18, halign: 'center', textColor: [22, 101, 52], fontStyle: 'bold' },
        },
        didDrawPage: (data) => {
          // Cabeçalho simplificado apenas nas páginas seguintes à primeira
          if (data.pageNumber > 1) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(15, 43, 92);
            doc.text(`TRACKSTEEL • RELATÓRIO GERAL DE FABRICAÇÃO  —  OF: ${obra.of_number}`, 14, 10);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text(`Cliente: ${obra.cliente || 'Industrial'}  |  Emissão: ${dataFormatada}`, 196, 10, { align: 'right' });
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.4);
            doc.line(14, 12, 196, 12);
          }
        },
      });

      // --- RODAPÉ EM TODAS AS PÁGINAS ---
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(14, 287, 196, 287);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text('TrackSteel Industrial • Modo Smart', 14, 291);
        doc.text(`OF ${obra.of_number} — ${obra.cliente || 'Industrial'}`, 105, 291, { align: 'center' });
        doc.text(`Página ${i} de ${totalPages}`, 196, 291, { align: 'right' });
      }

      const nomeArquivo = `Progresso_Geral_OF_${obra.of_number}.pdf`;

      if (acao === 'download') {
        doc.save(nomeArquivo);
        smartAudio.playSuccess();
        toast.success('Relatório Geral da Obra baixado com sucesso!');
      } else if (acao === 'whatsapp') {
        smartAudio.playClick();
        const pctCorte = grandTotalQtd > 0 ? Math.round((grandTotalCorte / grandTotalQtd) * 100) : 0;
        const pctSolda = grandTotalQtd > 0 ? Math.round((grandTotalSolda / grandTotalQtd) * 100) : 0;
        const pctPint = grandTotalQtd > 0 ? Math.round((grandTotalPint / grandTotalQtd) * 100) : 0;
        const pctExp = grandTotalQtd > 0 ? Math.round((grandTotalExp / grandTotalQtd) * 100) : 0;
        const pctObra = grandTotalQtd > 0 ? Math.round((grandTotalObra / grandTotalQtd) * 100) : 0;

        const textoMsg = encodeURIComponent(
          `*TRACKSTEEL - RELATÓRIO GERAL DE FABRICAÇÃO*\n` +
          `*Obra:* OF ${obra.of_number} - ${obra.cliente || ''}\n` +
          `*Data:* ${dataFormatada}\n` +
          `*Escopo:* ${grandTotalQtd} peças (${fasesOrdenadas.length} fases / ${pecasStatus.length} marcas)\n\n` +
          `*Avanço Consolidado:*\n` +
          `• Detalhamento: ${grandTotalDet}/${grandTotalQtd}\n` +
          `• Corte: ${grandTotalCorte}/${grandTotalQtd} (${pctCorte}%)\n` +
          `• Solda: ${grandTotalSolda}/${grandTotalQtd} (${pctSolda}%)\n` +
          `• Pintura: ${grandTotalPint}/${grandTotalQtd} (${pctPint}%)\n` +
          `• Expedido: ${grandTotalExp}/${grandTotalQtd} (${pctExp}%)\n` +
          `• Montado Obra: ${grandTotalObra}/${grandTotalQtd} (${pctObra}%)\n\n` +
          `_Gerado via Modo Smart TrackSteel._`
        );
        window.open(`https://wa.me/?text=${textoMsg}`, '_blank');
      } else if (acao === 'email') {
        smartAudio.playClick();
        const assunto = encodeURIComponent(`Relatório Geral de Produção - OF ${obra.of_number}`);
        const corpo = encodeURIComponent(
          `Segue o resumo geral de fabricação da obra:\n\n` +
          `Obra: OF ${obra.of_number}\n` +
          `Cliente: ${obra.cliente || 'Industrial'}\n` +
          `Data de Emissão: ${dataFormatada}\n` +
          `Total de Fases: ${fasesOrdenadas.length}\n` +
          `Total de Peças: ${grandTotalQtd} un\n` +
          `${grandTotalPeso > 0 ? `Peso Total: ${grandTotalPeso.toFixed(1)} kg\n` : ''}\n` +
          `Avanço por Processo:\n` +
          `- Detalhamento: ${grandTotalDet} un\n` +
          `- Corte: ${grandTotalCorte} un\n` +
          `- Solda: ${grandTotalSolda} un\n` +
          `- Pintura: ${grandTotalPint} un\n` +
          `- Expedido: ${grandTotalExp} un\n` +
          `- Montado na Obra: ${grandTotalObra} un\n\n` +
          `Gerado automaticamente pelo TrackSteel Modo Smart.`
        );
        window.open(`mailto:?subject=${assunto}&body=${corpo}`, '_blank');
      }
    } catch (e: any) {
      smartAudio.playAlert();
      console.error('Erro ao gerar relatório geral:', e);
      toast.error('Erro ao gerar relatório: ' + (e?.message || ''));
    } finally {
      setGerandoPDF(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 p-3.5 max-w-xl mx-auto w-full">
      {/* Navegação entre Abas: Consulta Rápida vs Relatórios */}
      <div className="grid grid-cols-2 gap-2 mb-3 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-2xl border border-slate-300 dark:border-slate-700">
        <button
          type="button"
          onClick={() => {
            smartAudio.playClick();
            setAbaAtiva('consulta');
          }}
          className={`h-11 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
            abaAtiva === 'consulta'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
          }`}
        >
          <Search className="h-4 w-4" />
          <span>Consultar Peças</span>
        </button>

        <button
          type="button"
          onClick={() => {
            smartAudio.playClick();
            setAbaAtiva('relatorios');
          }}
          className={`h-11 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
            abaAtiva === 'relatorios'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Relatórios & PDF</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ABA 1: CONSULTA RÁPIDA DE PEÇAS COM FILTROS AVANÇADOS E TIMELINE
          ───────────────────────────────────────────────────────────── */}
      {abaAtiva === 'consulta' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Campo de Busca Rápida */}
          <div className="relative mb-2">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <Input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por Marca, Perfil (W, L...), Descrição..."
              className="h-13 pl-11 pr-11 bg-white dark:bg-slate-800/90 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm sm:text-base font-medium rounded-2xl placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* FILTRO 1: Pílulas Rápidas de Perfis Abreviações (W/HP, L, CH, U, RED, TUB) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-1.5 no-scrollbar">
            <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 px-1 shrink-0">
              PERFIL:
            </span>
            {[
              { id: 'w_hp', label: 'W/HP' },
              { id: 'l', label: 'L' },
              { id: 'ch', label: 'CH' },
              { id: 'u', label: 'U' },
              { id: 'red', label: 'RED' },
              { id: 'tub', label: 'TUB' },
            ].map((p) => {
              const ativo = filtroPerfilRapido === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    smartAudio.playClick();
                    setFiltroPerfilRapido(ativo ? '' : p.id);
                  }}
                  className={`h-8 px-3 rounded-lg text-xs font-black whitespace-nowrap shrink-0 transition-all border ${
                    ativo
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:border-slate-600 shadow-sm'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* FILTRO 2: Fases da Obra (Com botão 'Todas' travado/fixo) */}
          <div className="flex items-center gap-1.5 pb-1.5 mb-1.5">
            <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-400 px-1 shrink-0">
              FASE:
            </span>
            <button
              type="button"
              onClick={() => {
                smartAudio.playClick();
                setFiltroFase('todas');
              }}
              className={`h-8 px-3 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all border ${
                filtroFase === 'todas'
                  ? 'bg-blue-600 text-white border-blue-500 font-black shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shadow-sm'
              }`}
            >
              Todas
            </button>

            {fasesUnicas.length > 0 && <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />}

            {/* Demais fases rolando horizontalmente */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 py-0.5">
              {fasesUnicas.map((fase) => (
                <button
                  key={fase}
                  type="button"
                  onClick={() => {
                    smartAudio.playClick();
                    setFiltroFase(fase);
                  }}
                  className={`h-8 px-3 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all border ${
                    filtroFase === fase
                      ? 'bg-blue-600 text-white border-blue-500 font-black shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shadow-sm'
                  }`}
                >
                  Fase {fase}
                </button>
              ))}
            </div>
          </div>

          {/* FILTRO 3: Status Fabril (Com botão 'Todos' travado/fixo sem scroll) e Botão Limpar */}
          <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
            {/* Botão "Todos" fixo/travado à esquerda */}
            <button
              type="button"
              onClick={() => {
                smartAudio.playClick();
                setFiltroStatus('todos');
              }}
              className={`h-7 px-3 rounded-md text-[11px] font-bold whitespace-nowrap shrink-0 transition-all ${
                filtroStatus === 'todos'
                  ? 'bg-slate-800 text-white font-black dark:bg-slate-200 dark:text-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200 dark:border-slate-700 shadow-sm'
              }`}
            >
              Todos
            </button>

            {/* Divisor vertical */}
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />

            {/* Demais botões roláveis horizontalmente */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 py-0.5">
              {[
                { id: 'fabricando', label: 'Em Fabricação' },
                { id: 'pronto', label: 'Pronto Pátio' },
                { id: 'embarcado', label: 'Expedido' },
                { id: 'montado', label: 'Montado' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    smartAudio.playClick();
                    setFiltroStatus(f.id as any);
                  }}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-bold whitespace-nowrap shrink-0 transition-all ${
                    filtroStatus === f.id
                      ? 'bg-slate-800 text-white font-black dark:bg-slate-200 dark:text-slate-900 shadow-sm'
                      : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:text-slate-200 dark:border-slate-700/60 shadow-sm'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Botão Limpar fixo à direita */}
            {temFiltroAtivo && (
              <button
                type="button"
                onClick={handleLimparFiltros}
                className="h-7 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 dark:bg-red-950/50 dark:hover:bg-red-900/60 dark:border-red-800/60 dark:text-red-300 text-[11px] font-bold flex items-center gap-1 shrink-0 active:scale-95 ml-auto shadow-sm"
                title="Limpar todos os filtros aplicados"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Limpar</span>
              </button>
            )}
          </div>

          {/* Contador de Peças Encontradas */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 mb-2">
            <span>
              Exibindo <b className="text-amber-700 dark:text-amber-400 font-bold">{pecasFiltradas.length}</b> de{' '}
              {pecasStatus.length} marcas
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              Ordem Numérica Natural
            </span>
          </div>

          {/* Lista de Peças Ordenadas com Timeline Completa */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pb-4">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                <span>Carregando peças e apontamentos...</span>
              </div>
            ) : pecasFiltradas.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <AlertCircle className="h-10 w-10 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Nenhuma peça encontrada</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                  Tente ajustar a busca, a fase ou clique em limpar filtros
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLimparFiltros}
                  className="h-10 px-4 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-amber-700 dark:text-amber-400 font-bold text-xs rounded-xl shadow-sm"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Limpar Filtros
                </Button>
              </div>
            ) : (
              pecasFiltradas.map((peca) => (
                <div
                  key={peca.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                  {/* Linha Superior: Marca, Perfil, Fase e Quantidade */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl font-black text-amber-700 dark:text-amber-400 tracking-wider">
                          {peca.marca}
                        </span>

                        {peca.tem_componentes === false && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold border border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800/50">
                            S/M
                          </span>
                        )}

                        {peca.perfil_principal && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-black border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
                            {peca.perfil_principal}
                          </span>
                        )}

                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 font-bold border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30">
                          Fase {peca.etapa_fase}
                        </span>

                        {peca.material && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-transparent">
                            {peca.material}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-1">
                        {peca.descricao || 'Peça Estrutural'}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Total</span>
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        {peca.quantidade}{' '}
                        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">un</span>
                      </span>
                    </div>
                  </div>

                  {/* Linha do Tempo Visual com Etapas Fabris Corretas: Det → Corte → Solda → Pint → Emb → Obra */}
                  <div className="grid grid-cols-6 gap-1 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/80 text-center">
                    {[
                      { nome: 'Det.', valor: peca.detalhamento, isPula: false },
                      { nome: 'Corte', valor: peca.corte, isPula: false },
                      { nome: 'Solda', valor: peca.solda, isPula: peca.tem_componentes === false },
                      { nome: 'Pint.', valor: peca.pintura, isPula: false },
                      { nome: 'Exp.', valor: peca.expedido, isPula: false },
                      { nome: 'Obra', valor: peca.montado_obra, isPula: false },
                    ].map((etapa, idx) => {
                      if (etapa.isPula) {
                        return (
                          <div key={idx} className="flex flex-col items-center opacity-70">
                            <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-0.5 uppercase">
                              {etapa.nome}
                            </div>
                            <div className="h-5 px-1 rounded-md bg-purple-50 dark:bg-slate-900 border border-purple-200 dark:border-purple-800/40 mb-0.5 flex items-center justify-center">
                              <span className="text-[9px] font-bold text-purple-700 dark:text-purple-400">S/M</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                              N/A
                            </span>
                          </div>
                        );
                      }

                      const badge = getBadgeEtapa(etapa.valor, peca.quantidade);
                      return (
                        <div key={idx} className="flex flex-col items-center">
                          <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-0.5 uppercase">
                            {etapa.nome}
                          </div>
                          <div className="p-0.5 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 mb-0.5">
                            {badge.icon}
                          </div>
                          <span className={`text-[10px] font-black ${badge.cor}`}>
                            {badge.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ABA 2: EMISSÃO DE RELATÓRIOS EM PDF & COMPARTILHAMENTO
          ───────────────────────────────────────────────────────────── */}
      {abaAtiva === 'relatorios' && (
        <div className="flex flex-col flex-1 overflow-y-auto space-y-4 pb-4">
          <div className="text-center mb-1">
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase">
              Selecione o Relatório Desejado
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gere documentos oficiais para download ou envio imediato
            </p>
          </div>

          {/* CARD 1: RELATÓRIO DO MEU TURNO */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white dark:from-amber-500/15 dark:via-slate-800 dark:to-slate-800 border border-amber-300 dark:border-amber-500/30 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <span className="text-xs font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider">
                  Opção 1
                </span>
                <h4 className="text-base font-black text-slate-800 dark:text-slate-100">
                  Relatório do Meu Turno (Hoje)
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Lista todas as peças apontadas por você no turno de hoje
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400">
                <FileText className="h-6 w-6" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <Button
                type="button"
                disabled={gerandoPDF}
                onClick={() => gerarRelatorioTurnoPDF('download')}
                className="h-12 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl gap-1.5 active:scale-95 shadow-sm"
              >
                <Download className="h-4 w-4" />
                <span>Baixar PDF</span>
              </Button>

              <Button
                type="button"
                disabled={gerandoPDF}
                onClick={() => gerarRelatorioTurnoPDF('whatsapp')}
                className="h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl gap-1.5 active:scale-95 shadow-sm"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp</span>
              </Button>

              <Button
                type="button"
                disabled={gerandoPDF}
                onClick={() => gerarRelatorioTurnoPDF('email')}
                className="h-12 bg-slate-700 hover:bg-slate-600 text-white font-black text-xs rounded-xl gap-1.5 active:scale-95 shadow-sm"
              >
                <Mail className="h-4 w-4" />
                <span>E-mail</span>
              </Button>
            </div>
          </div>

          {/* CARD 2: RELATÓRIO GERAL DA OBRA */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <span className="text-xs font-black uppercase text-blue-700 dark:text-blue-400 tracking-wider">
                  Opção 2
                </span>
                <h4 className="text-base font-black text-slate-800 dark:text-slate-100">
                  Relatório de Produção Geral da Obra
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Quadro completo de todas as marcas com avanço por etapa
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400">
                <FileText className="h-6 w-6" />
              </div>
            </div>

            {/* 3 Botões de Ação para o Relatório Geral: Baixar, WhatsApp e E-mail */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                disabled={gerandoPDF}
                onClick={() => gerarRelatorioGeralObraPDF('download')}
                className="h-11 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl gap-1.5 active:scale-95 shadow-sm"
              >
                <Download className="h-4 w-4" />
                <span>Baixar PDF</span>
              </Button>

              <Button
                type="button"
                disabled={gerandoPDF}
                onClick={() => gerarRelatorioGeralObraPDF('whatsapp')}
                className="h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl gap-1.5 active:scale-95 shadow-sm"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp</span>
              </Button>

              <Button
                type="button"
                disabled={gerandoPDF}
                onClick={() => gerarRelatorioGeralObraPDF('email')}
                className="h-11 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl gap-1.5 active:scale-95 shadow-sm"
              >
                <Mail className="h-4 w-4" />
                <span>E-mail</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Botão de Voltar ao Hub */}
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          smartAudio.playClick();
          onVoltarHub();
        }}
        className="w-full h-13 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-2xl mt-2 active:scale-98 shadow-sm"
      >
        ⬅️ Voltar ao Menu Principal
      </Button>
    </div>
  );
};
