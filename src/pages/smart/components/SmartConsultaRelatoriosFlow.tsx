import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  FileText, 
  Share2, 
  Download, 
  Mail, 
  X, 
  CheckCircle2, 
  Clock, 
  Circle, 
  AlertCircle,
  Eye,
  MessageCircle
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
  quantidade: number;
  peso_unitario: number;
  corte: number;
  montagem: number;
  solda: number;
  pintura: number;
  expedido: number;
  montado_obra: number;
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

  // Estados da Consulta
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'fabricando' | 'pronto' | 'embarcado' | 'montado'>('todos');
  const [pecasStatus, setPecasStatus] = useState<PecaStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Relatórios
  const [gerandoPDF, setGerandoPDF] = useState(false);

  // Carregar dados de peças e progresso
  const carregarDadosCompletos = React.useCallback(async () => {
    try {
      setLoading(true);

      const [resPecas, resApontamentos, resExpedidos, resMontados] = await Promise.all([
        supabase
          .from('pecas')
          .select('id, marca, descricao, etapa_fase, quantidade, peso_unitario')
          .eq('of_number', obra.of_number),
        supabase
          .from('apontamentos_producao')
          .select(`
            peca_id,
            quantidade_produzida,
            processos_fabricacao (
              nome
            )
          `)
          .eq('of_number', obra.of_number),
        supabase
          .from('itens_romaneio_pecas')
          .select(`
            marca,
            quantidade_expedida,
            romaneios_expedicao!inner(of_number)
          `)
          .eq('romaneios_expedicao.of_number', obra.of_number),
        supabase
          .from('apontamentos_peca_obra')
          .select(`
            marca_peca,
            quantidade,
            diario_obra_rdo!inner(of_number)
          `)
          .eq('diario_obra_rdo.of_number', obra.of_number),
      ]);

      // Mapear apontamentos por peça e nome de processo
      const mapaProc = new Map<string, { corte: number; montagem: number; solda: number; pintura: number }>();
      (resApontamentos.data || []).forEach((ap: any) => {
        const pecaId = ap.peca_id;
        const nomeProc = (ap.processos_fabricacao?.nome || '').toLowerCase();
        const qtd = Number(ap.quantidade_produzida || 0);

        const atual = mapaProc.get(pecaId) || { corte: 0, montagem: 0, solda: 0, pintura: 0 };
        if (nomeProc.includes('corte')) atual.corte += qtd;
        else if (nomeProc.includes('montag')) atual.montagem += qtd;
        else if (nomeProc.includes('solda')) atual.solda += qtd;
        else if (nomeProc.includes('pintura')) atual.pintura += qtd;

        mapaProc.set(pecaId, atual);
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

      // Montar PecaStatus
      const lista: PecaStatus[] = (resPecas.data || []).map((p) => {
        const procs = mapaProc.get(p.id) || { corte: 0, montagem: 0, solda: 0, pintura: 0 };
        return {
          id: p.id,
          marca: p.marca,
          descricao: p.descricao,
          etapa_fase: p.etapa_fase,
          quantidade: p.quantidade,
          peso_unitario: p.peso_unitario,
          corte: procs.corte,
          montagem: procs.montagem,
          solda: procs.solda,
          pintura: procs.pintura,
          expedido: mapaExp.get(p.marca) || 0,
          montado_obra: mapaMont.get(p.marca) || 0,
        };
      });

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

  // Filtragem da lista
  const pecasFiltradas = useMemo(() => {
    return pecasStatus.filter((p) => {
      // Filtro texto
      if (busca.trim()) {
        const t = busca.toLowerCase();
        const match = p.marca.toLowerCase().includes(t) || p.descricao?.toLowerCase().includes(t);
        if (!match) return false;
      }

      // Filtro status
      if (filtroStatus === 'todos') return true;
      if (filtroStatus === 'montado') return p.montado_obra >= p.quantidade;
      if (filtroStatus === 'embarcado') return p.expedido >= p.quantidade;
      if (filtroStatus === 'pronto') return p.pintura >= p.quantidade || p.solda >= p.quantidade;
      if (filtroStatus === 'fabricando') return p.corte > 0 && p.pintura < p.quantidade;

      return true;
    });
  }, [pecasStatus, busca, filtroStatus]);

  // Status visual de cada etapa
  const getBadgeEtapa = (concluido: number, total: number) => {
    if (concluido >= total && total > 0) {
      return { icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />, cor: 'text-emerald-400', label: 'OK' };
    }
    if (concluido > 0) {
      return { icon: <Clock className="h-4 w-4 text-amber-400" />, cor: 'text-amber-400', label: `${concluido}/${total}` };
    }
    return { icon: <Circle className="h-4 w-4 text-slate-600" />, cor: 'text-slate-500', label: '0' };
  };

  // ─────────────────────────────────────────────────────────────
  // GERAÇÃO DE RELATÓRIOS PDF (jsPDF)
  // ─────────────────────────────────────────────────────────────

  // 1. Relatório do Turno de Hoje do Operador
  const gerarRelatorioTurnoPDF = async (acao: 'download' | 'whatsapp' | 'email') => {
    try {
      setGerandoPDF(true);
      const hoje = new Date().toISOString().split('T')[0];

      // Buscar apontamentos feitos hoje pelo operador autenticado
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

      // Cabeçalho
      doc.setFillColor(15, 23, 42); // Slate-900
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(251, 191, 36); // Amber-400
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(titulo, 14, 15);

      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(`OF: ${obra.of_number} | Cliente: ${obra.cliente || 'Industrial'}`, 14, 23);
      doc.text(`Data: ${dataFormatada} às ${horaFormatada}`, 145, 23);

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

      // Tabela de Apontamentos
      autoTable(doc, {
        startY: 38,
        head: [['Marca', 'Fase', 'Processo', 'Qtd', 'Peso Unit.', 'Peso Total']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], textColor: [251, 191, 36], fontStyle: 'bold' },
        styles: { fontSize: 9 },
      });

      // Rodapé Resumo
      const finalY = (doc as any).lastAutoTable?.finalY || 80;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, finalY + 5, 182, 20, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`RESUMO DO TURNO:`, 20, finalY + 14);
      doc.text(`Total de Peças: ${totalPecas} un | Peso Total: ${totalKg.toFixed(1)} kg`, 20, finalY + 20);

      // Tratamento da Ação
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
      toast.error('Erro ao gerar relatório do turno: ' + (e?.message || ''));
    } finally {
      setGerandoPDF(false);
    }
  };

  // 2. Relatório Geral da Obra
  const gerarRelatorioGeralObraPDF = () => {
    try {
      setGerandoPDF(true);
      const doc = new jsPDF();
      const dataFormatada = new Date().toLocaleDateString('pt-BR');

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(251, 191, 36);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`RELATÓRIO GERAL DE FABRICAÇÃO`, 14, 15);

      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(`OF: ${obra.of_number} | Cliente: ${obra.cliente || 'Industrial'} | Emissão: ${dataFormatada}`, 14, 23);

      const tableRows = pecasStatus.map((p) => [
        p.marca,
        p.etapa_fase || 'Geral',
        p.quantidade.toString(),
        p.corte.toString(),
        p.montagem.toString(),
        p.solda.toString(),
        p.pintura.toString(),
        p.expedido.toString(),
        p.montado_obra.toString(),
      ]);

      autoTable(doc, {
        startY: 38,
        head: [['Marca', 'Fase', 'Total', 'Corte', 'Mont.', 'Solda', 'Pint.', 'Exped.', 'Obra']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [251, 191, 36], fontStyle: 'bold' },
        styles: { fontSize: 8 },
      });

      doc.save(`Progresso_Geral_OF_${obra.of_number}.pdf`);
      smartAudio.playSuccess();
      toast.success('Relatório Geral da Obra gerado!');
    } catch (e: any) {
      smartAudio.playAlert();
      toast.error('Erro ao gerar relatório: ' + e?.message);
    } finally {
      setGerandoPDF(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 p-4 max-w-xl mx-auto w-full">
      {/* Navegação entre Abas: Consulta Rápida vs Relatórios */}
      <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
        <button
          type="button"
          onClick={() => {
            smartAudio.playClick();
            setAbaAtiva('consulta');
          }}
          className={`h-11 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
            abaAtiva === 'consulta'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-300 hover:text-white'
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
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Relatórios & PDF</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ABA 1: CONSULTA RÁPIDA DE PEÇAS COM TIMELINE
          ───────────────────────────────────────────────────────────── */}
      {abaAtiva === 'consulta' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Campo de Busca Gigante Touch */}
          <div className="relative mb-3">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-5 w-5 text-amber-400" />
            </div>
            <Input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite a marca (ex: V101, P205)..."
              className="h-14 pl-11 pr-11 bg-slate-800/90 border-slate-700 text-slate-100 text-base font-medium rounded-2xl"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Pílulas de Filtro Rápido */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'fabricando', label: 'Fabricando' },
              { id: 'pronto', label: 'Pronto Pátio' },
              { id: 'embarcado', label: 'Embarcado' },
              { id: 'montado', label: 'Montado' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  smartAudio.playClick();
                  setFiltroStatus(f.id as any);
                }}
                className={`h-9 px-3 rounded-xl font-bold text-xs whitespace-nowrap transition-all border ${
                  filtroStatus === f.id
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Lista de Peças com Linha do Tempo Visual */}
          <div className="flex-1 overflow-y-auto space-y-3 pb-4">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                <span>Carregando timeline das peças...</span>
              </div>
            ) : pecasFiltradas.length === 0 ? (
              <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-slate-800">
                <AlertCircle className="h-10 w-10 text-slate-500 mx-auto mb-2" />
                <h3 className="text-base font-bold text-slate-200">Nenhuma peça encontrada</h3>
                <p className="text-xs text-slate-400 mt-1">Verifique o termo de busca ou filtro</p>
              </div>
            ) : (
              pecasFiltradas.map((peca) => (
                <div
                  key={peca.id}
                  className="p-4 rounded-2xl bg-slate-800/95 border border-slate-700 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xl font-black text-amber-400 tracking-wider">
                        {peca.marca}
                      </span>
                      <span className="ml-2 text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-semibold">
                        {peca.etapa_fase || 'Estrutural'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-300">
                      Total: <span className="font-black text-white">{peca.quantidade} un</span>
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 mt-0.5 truncate">
                    {peca.descricao || 'Peça Estrutural'}
                  </div>

                  {/* Linha do Tempo Visual da Peça */}
                  <div className="grid grid-cols-6 gap-1 mt-3.5 pt-3 border-t border-slate-700/80 text-center">
                    {[
                      { nome: 'Corte', valor: peca.corte },
                      { nome: 'Mont.', valor: peca.montagem },
                      { nome: 'Solda', valor: peca.solda },
                      { nome: 'Pint.', valor: peca.pintura },
                      { nome: 'Emb.', valor: peca.expedido },
                      { nome: 'Obra', valor: peca.montado_obra },
                    ].map((etapa, idx) => {
                      const badge = getBadgeEtapa(etapa.valor, peca.quantidade);
                      return (
                        <div key={idx} className="flex flex-col items-center">
                          <div className="text-[10px] font-bold text-slate-400 mb-1">
                            {etapa.nome}
                          </div>
                          <div className="p-1 rounded-lg bg-slate-900 border border-slate-700/60 mb-1">
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
            <h3 className="text-base font-black text-slate-100 uppercase">
              Selecione o Relatório Desejado
            </h3>
            <p className="text-xs text-slate-400">
              Gere documentos oficiais para download ou envio imediato
            </p>
          </div>

          {/* CARD 1: RELATÓRIO DO MEU TURNO */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-slate-800 to-slate-800 border border-amber-500/30 shadow-md">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
                  Opção 1
                </span>
                <h4 className="text-base font-black text-slate-100">
                  Relatório do Meu Turno (Hoje)
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Lista todas as peças apontadas por você no turno de hoje
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                <FileText className="h-6 w-6" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <Button
                type="button"
                disabled={gerandoPDF}
                onClick={() => gerarRelatorioTurnoPDF('download')}
                className="h-12 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl gap-1.5 active:scale-95"
              >
                <Download className="h-4 w-4" />
                <span>Baixar PDF</span>
              </Button>

              <Button
                type="button"
                disabled={gerandoPDF}
                onClick={() => gerarRelatorioTurnoPDF('whatsapp')}
                className="h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl gap-1.5 active:scale-95"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp</span>
              </Button>

              <Button
                type="button"
                disabled={gerandoPDF}
                onClick={() => gerarRelatorioTurnoPDF('email')}
                className="h-12 bg-slate-700 hover:bg-slate-650 text-white font-black text-xs rounded-xl gap-1.5 active:scale-95"
              >
                <Mail className="h-4 w-4" />
                <span>E-mail</span>
              </Button>
            </div>
          </div>

          {/* CARD 2: RELATÓRIO GERAL DA OBRA */}
          <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 shadow-md">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <span className="text-xs font-black uppercase text-blue-400 tracking-wider">
                  Opção 2
                </span>
                <h4 className="text-base font-black text-slate-100">
                  Relatório de Produção Geral da Obra
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Quadro completo de todas as marcas com avanço por etapa
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                <FileText className="h-6 w-6" />
              </div>
            </div>

            <Button
              type="button"
              disabled={gerandoPDF}
              onClick={gerarRelatorioGeralObraPDF}
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl gap-2 active:scale-95"
            >
              <Download className="h-4 w-4" />
              <span>Gerar e Baixar PDF Geral</span>
            </Button>
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
        className="w-full h-14 bg-slate-800 border-slate-700 text-slate-200 text-sm font-bold rounded-2xl mt-2 active:scale-98"
      >
        ⬅️ Voltar ao Menu Principal
      </Button>
    </div>
  );
};
