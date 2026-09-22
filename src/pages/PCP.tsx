import React, { useState } from 'react';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { usePcpAnalysis, RecomendacaoPcp } from '@/hooks/usePcpAnalysis';
import { PcpOfThumbnail } from '@/components/pcp/PcpOfThumbnail';
import { PcpMesaTatica } from '@/components/pcp/PcpMesaTatica';
import { PcpHistogramaCarga } from '@/components/pcp/PcpHistogramaCarga';
import { PcpMultiGantt } from '@/components/pcp/PcpMultiGantt';
import { PcpRecomendacoesPainel } from '@/components/pcp/PcpRecomendacoesPainel';
import { PcpWhatIfSimulator } from '@/components/pcp/PcpWhatIfSimulator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Layers,
  BarChart3,
  Calendar,
  Sparkles,
  Sliders,
  Search,
  RefreshCw,
  PlusCircle,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const PCP = () => {
  const {
    loading,
    allOfs,
    selectedOfNumbers,
    ofsNaMesa,
    totaisMesa,
    cargaPorPeriodo,
    recomendacoes,
    simulador,
    alternarSelecaoOf,
    adicionarTodasOfs,
    limparMesa,
    setHorasExtras,
    setEfetivoFator,
    setDeslocamentoOf,
    resetarSimulador,
    recarregarDados,
  } = usePcpAnalysis();

  const [busca, setBusca] = useState('');
  const [activeTab, setActiveTab] = useState<'histograma' | 'gantt' | 'recomendacoes' | 'whatif'>('histograma');

  // Filtragem de OFs na gaveta lateral
  const ofsFiltradas = allOfs.filter((of) => {
    const termo = busca.toLowerCase();
    return (
      of.num_of.toLowerCase().includes(termo) ||
      of.descritivo.toLowerCase().includes(termo)
    );
  });

  // Ação ao clicar em "Simular Impacto" de uma recomendação
  const handleAplicarRecomendacao = (rec: RecomendacaoPcp) => {
    if (rec.tipo === 'nivelamento_prazo' && rec.ofAlvo && rec.sugestaoDiasAjuste) {
      setDeslocamentoOf(rec.ofAlvo, rec.sugestaoDiasAjuste);
      setActiveTab('whatif');
      toast.success(`Simulação aplicada: OF ${rec.ofAlvo} dilatada em +${rec.sugestaoDiasAjuste} dias no Simulador!`);
    } else if (rec.tipo === 'hora_extra' && rec.processoAlvo) {
      setHorasExtras(rec.processoAlvo, 2);
      setActiveTab('whatif');
      toast.success(`Simulação aplicada: +2h extras/dia adicionadas em ${rec.processoAlvo}!`);
    } else if (rec.tipo === 'rebalanceamento_equipe' && rec.processoAlvo) {
      setEfetivoFator(rec.processoAlvo, 1.25);
      setActiveTab('whatif');
      toast.success(`Simulação aplicada: +25% de capacidade transferida para ${rec.processoAlvo}!`);
    } else {
      setActiveTab('whatif');
      toast.info('Abra os controles do simulador para testar este cenário.');
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <StandardPageLayout
        title="PCP (Planejamento e Controle da Produção)"
        subtitle="Mesa Tática & Torre de Controle de Capacidade Fabril e Prazos de Obra"
        badge={{
          text: `${allOfs.length} OFs Ativas`,
          variant: 'secondary',
        }}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={recarregarDados}
              disabled={loading}
              className="text-xs h-9"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUNA ESQUERDA: GAVETA DE FIGURINHAS / THUMBNAILS DAS OFS (4 colunas) */}
          <div className="lg:col-span-4 space-y-4 bg-card/40 border border-border/60 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">
                  Catálogo de OFs
                </h3>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {selectedOfNumbers.length}/{allOfs.length} na mesa
              </Badge>
            </div>

            {/* Barra de Busca de OFs */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar OF ou obra..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>

            <p className="text-[11px] text-muted-foreground italic">
              * Dica: Arraste a figurinha para a mesa ou clique nela para incluir/remover do cálculo de capacidade.
            </p>

            {/* Lista com scroll das Figurinhas */}
            <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
              {loading ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Carregando ordens de fabricação e cronogramas...
                </div>
              ) : ofsFiltradas.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Nenhuma OF encontrada para o filtro.
                </div>
              ) : (
                ofsFiltradas.map((of) => (
                  <PcpOfThumbnail
                    key={of.id}
                    of={of}
                    isSelected={selectedOfNumbers.includes(of.num_of)}
                    onToggle={alternarSelecaoOf}
                  />
                ))
              )}
            </div>
          </div>

          {/* COLUNA DIREITA: MESA TÁTICA E VISUALIZADORES ACUMULADOS (8 colunas) */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. MESA TÁTICA DE DROP E AGRUPAMENTO */}
            <PcpMesaTatica
              ofsNaMesa={ofsNaMesa}
              totais={totaisMesa}
              onRemoveOf={alternarSelecaoOf}
              onDropOf={(numOf) => {
                if (!selectedOfNumbers.includes(numOf)) {
                  alternarSelecaoOf(numOf);
                  toast.success(`OF ${numOf} adicionada à mesa de análise acumulada!`);
                }
              }}
              onClear={limparMesa}
              onSelectAll={adicionarTodasOfs}
              onAnalisar={() => {
                setActiveTab('histograma');
                toast.success('Cenário consolidado processado!');
              }}
            />

            {/* 2. ABAS DE VISUALIZAÇÃO DO CENÁRIO ACUMULADO */}
            <Tabs
              value={activeTab}
              onValueChange={(val: any) => setActiveTab(val)}
              className="w-full space-y-4"
            >
              <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1 bg-muted/60">
                <TabsTrigger
                  value="histograma"
                  className="flex items-center gap-1.5 text-xs py-2"
                >
                  <BarChart3 className="h-3.5 w-3.5 text-sky-400" />
                  Carga vs Capacidade
                </TabsTrigger>

                <TabsTrigger
                  value="gantt"
                  className="flex items-center gap-1.5 text-xs py-2"
                >
                  <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                  Cronograma Multi-OF
                </TabsTrigger>

                <TabsTrigger
                  value="recomendacoes"
                  className="flex items-center gap-1.5 text-xs py-2 relative"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  Plano & Ações
                  {recomendacoes.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block ml-0.5" />
                  )}
                </TabsTrigger>

                <TabsTrigger
                  value="whatif"
                  className="flex items-center gap-1.5 text-xs py-2"
                >
                  <Sliders className="h-3.5 w-3.5 text-emerald-400" />
                  Simulador What-If
                </TabsTrigger>
              </TabsList>

              {/* ABA 1: HISTOGRAMA DE CARGA VS CAPACIDADE */}
              <TabsContent value="histograma" className="m-0 focus-visible:outline-none">
                <PcpHistogramaCarga dadosCarga={cargaPorPeriodo} />
              </TabsContent>

              {/* ABA 2: CRONOGRAMA GANTT INTEGRADO */}
              <TabsContent value="gantt" className="m-0 focus-visible:outline-none">
                <PcpMultiGantt ofs={ofsNaMesa} />
              </TabsContent>

              {/* ABA 3: RECOMENDAÇÕES E BALANCEAMENTO */}
              <TabsContent value="recomendacoes" className="m-0 focus-visible:outline-none">
                <PcpRecomendacoesPainel
                  recomendacoes={recomendacoes}
                  onAplicarSimulacao={handleAplicarRecomendacao}
                />
              </TabsContent>

              {/* ABA 4: SIMULADOR WHAT-IF */}
              <TabsContent value="whatif" className="m-0 focus-visible:outline-none">
                <PcpWhatIfSimulator
                  ofs={ofsNaMesa}
                  simulador={simulador}
                  onSetHorasExtras={setHorasExtras}
                  onSetEfetivoFator={setEfetivoFator}
                  onSetDeslocamentoOf={setDeslocamentoOf}
                  onReset={resetarSimulador}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </StandardPageLayout>
    </div>
  );
};

export default PCP;
