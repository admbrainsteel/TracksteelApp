
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, FileText, Printer } from 'lucide-react';
import { useOFs } from '@/hooks/useOFs';
import { useRelatorioPecasProcesso, PecaComStatus } from '@/hooks/useRelatorioPecasProcesso';
import { useDashboardProducaoOtimizado } from '@/hooks/useDashboardProducaoOtimizado';
import { RelatorioPecasProcessoPDF } from './RelatorioPecasProcessoPDF';
import { RelatorioPecasProcessoPrint } from './RelatorioPecasProcessoPrint';

interface RelatorioPecasProcessoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RelatorioPecasProcessoModal: React.FC<RelatorioPecasProcessoModalProps> = ({
  isOpen,
  onClose
}) => {
  const [selectedOF, setSelectedOF] = useState('');
  const [selectedFase, setSelectedFase] = useState('todas');
  const { ofs, loading: ofsLoading } = useOFs();
  const { pecasComStatus, resumoProcessos, loading } = useRelatorioPecasProcesso(selectedOF);
  const { dashboardData } = useDashboardProducaoOtimizado(selectedOF);

  // Filtrar peças por fase selecionada
  const pecasFiltradas = useMemo(() => {
    return selectedFase === 'todas' 
      ? pecasComStatus 
      : pecasComStatus.filter(peca => peca.etapa_fase === selectedFase);
  }, [selectedFase, pecasComStatus]);

  // Recalcular estatísticas para as peças filtradas com o peso real apontado
  const estatisticasFiltradas = useMemo(() => {
    if (selectedFase === 'todas' && dashboardData?.processos && dashboardData.processos.length > 0) {
      const pCorte = dashboardData.processos.find(p => p.nome.toLowerCase().includes('corte'));
      const pSolda = dashboardData.processos.find(p => p.nome.toLowerCase().includes('solda'));
      const pPintura = dashboardData.processos.find(p => p.nome.toLowerCase().includes('pint') || p.nome.toLowerCase().includes('galv'));
      const pExp = dashboardData.processos.find(p => p.nome.toLowerCase().includes('exped'));

      return {
        totalPecas: pecasFiltradas.length,
        pesoTotalCorte: pCorte?.pesoFabricado ?? pecasFiltradas.reduce((sum, p) => sum + (p.pesoApontado?.corte || 0), 0),
        pesoTotalSolda: pSolda?.pesoFabricado ?? pecasFiltradas.reduce((sum, p) => sum + (p.pesoApontado?.solda || 0), 0),
        pesoTotalPintura: pPintura?.pesoFabricado ?? pecasFiltradas.reduce((sum, p) => sum + (p.pesoApontado?.pintura || 0), 0),
        pesoTotalExpedicao: pExp?.pesoFabricado ?? pecasFiltradas.reduce((sum, p) => sum + (p.pesoApontado?.expedicao || 0), 0)
      };
    }

    return {
      totalPecas: pecasFiltradas.length,
      pesoTotalCorte: pecasFiltradas.reduce((sum, p) => sum + (p.pesoApontado?.corte || 0), 0),
      pesoTotalSolda: pecasFiltradas.reduce((sum, p) => sum + (p.pesoApontado?.solda || 0), 0),
      pesoTotalPintura: pecasFiltradas.reduce((sum, p) => sum + (p.pesoApontado?.pintura || 0), 0),
      pesoTotalExpedicao: pecasFiltradas.reduce((sum, p) => sum + (p.pesoApontado?.expedicao || 0), 0)
    };
  }, [selectedFase, dashboardData, pecasFiltradas]);

  // Calcular percentual de progresso conforme índices da tela de Dashboard de Produção
  const percentuais = useMemo(() => {
    if (selectedFase === 'todas' && dashboardData?.processos && dashboardData.processos.length > 0) {
      const pCorte = dashboardData.processos.find(p => p.nome.toLowerCase().includes('corte'))?.progressoReal ?? 0;
      const pSolda = dashboardData.processos.find(p => p.nome.toLowerCase().includes('solda'))?.progressoReal ?? 0;
      const pPintura = dashboardData.processos.find(p => p.nome.toLowerCase().includes('pint') || p.nome.toLowerCase().includes('galv'))?.progressoReal ?? 0;
      const pExp = dashboardData.processos.find(p => p.nome.toLowerCase().includes('exped'))?.progressoReal ?? 0;

      return {
        corte: pCorte,
        solda: pSolda,
        pintura: pPintura,
        expedicao: pExp
      };
    }

    const pesoTotalGeral = pecasFiltradas.reduce((sum, p) => sum + p.peso_total, 0);
    const pesoTotalSoldavel = pecasFiltradas.filter(p => p.tem_componentes).reduce((sum, p) => sum + p.peso_total, 0) || pesoTotalGeral;

    return {
      corte: pesoTotalGeral > 0 ? (estatisticasFiltradas.pesoTotalCorte / pesoTotalGeral) * 100 : 0,
      solda: pesoTotalSoldavel > 0 ? (estatisticasFiltradas.pesoTotalSolda / pesoTotalSoldavel) * 100 : 0,
      pintura: pesoTotalGeral > 0 ? (estatisticasFiltradas.pesoTotalPintura / pesoTotalGeral) * 100 : 0,
      expedicao: pesoTotalGeral > 0 ? (estatisticasFiltradas.pesoTotalExpedicao / pesoTotalGeral) * 100 : 0,
    };
  }, [selectedFase, dashboardData, pecasFiltradas, estatisticasFiltradas]);

  // Obter fases únicas das peças
  const fasesUnicas = [...new Set(pecasComStatus.map(peca => peca.etapa_fase))].sort((a, b) => {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    return collator.compare(a, b);
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-card-foreground">
            Relatório de Peças por Processo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
            <div>
              <label className="block text-sm font-medium mb-2 text-card-foreground">Selecione a OF:</label>
              <Select value={selectedOF} onValueChange={setSelectedOF}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue placeholder={ofsLoading ? "Carregando..." : "Selecione uma OF"} />
                </SelectTrigger>
                <SelectContent>
                  {ofs.map((of) => (
                    <SelectItem key={of.id} value={of.num_of}>
                      OF {of.num_of} {of.descritivo ? `- ${of.descritivo}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-card-foreground">Selecione a Fase:</label>
              <Select value={selectedFase} onValueChange={setSelectedFase} disabled={!selectedOF}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue placeholder="Selecione uma fase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Fases</SelectItem>
                  {fasesUnicas.map((fase) => (
                    <SelectItem key={fase} value={fase}>
                      Fase {fase}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botões de Ação */}
          {selectedOF && (
            <div className="flex gap-2 justify-center">
              <RelatorioPecasProcessoPDF
                pecasComStatus={pecasFiltradas}
                estatisticas={estatisticasFiltradas}
                percentuais={percentuais}
                selectedOF={selectedOF}
                selectedFase={selectedFase}
              />
              <RelatorioPecasProcessoPrint
                pecasComStatus={pecasFiltradas}
                estatisticas={estatisticasFiltradas}
                percentuais={percentuais}
                selectedOF={selectedOF}
                selectedFase={selectedFase}
              />
            </div>
          )}

          {/* Preview da Tabela */}
          {selectedOF && pecasFiltradas.length > 0 && (
            <div className="border rounded-lg bg-background">
              <div className="p-4">
                <h3 className="text-lg font-semibold text-card-foreground mb-4">
                  Preview - OF {selectedOF} {selectedFase !== 'todas' ? `- Fase ${selectedFase}` : ''}
                </h3>
                
                {/* Estatísticas com Percentual de Progresso */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div className="bg-muted/50 p-3 rounded text-center">
                    <p className="text-sm text-muted-foreground">Total de Peças</p>
                    <p className="text-xl font-bold text-card-foreground">{estatisticasFiltradas.totalPecas}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded text-center">
                    <p className="text-sm text-muted-foreground">Peso Corte</p>
                    <p className="text-xl font-bold text-card-foreground">
                      {estatisticasFiltradas.pesoTotalCorte.toFixed(0)} kg{' '}
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        ({percentuais.corte.toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded text-center">
                    <p className="text-sm text-muted-foreground">Peso Solda</p>
                    <p className="text-xl font-bold text-card-foreground">
                      {estatisticasFiltradas.pesoTotalSolda.toFixed(0)} kg{' '}
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        ({percentuais.solda.toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded text-center">
                    <p className="text-sm text-muted-foreground">Peso Pintura</p>
                    <p className="text-xl font-bold text-card-foreground">
                      {estatisticasFiltradas.pesoTotalPintura.toFixed(0)} kg{' '}
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        ({percentuais.pintura.toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded text-center">
                    <p className="text-sm text-muted-foreground">Peso Expedição</p>
                    <p className="text-xl font-bold text-card-foreground">
                      {estatisticasFiltradas.pesoTotalExpedicao.toFixed(0)} kg{' '}
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        ({percentuais.expedicao.toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                </div>

                {/* Tabela Preview */}
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full border-collapse border border-border">
                    <thead className="bg-muted">
                      <tr>
                        <th className="border border-border p-2 text-left text-xs font-medium text-muted-foreground">OF</th>
                        <th className="border border-border p-2 text-left text-xs font-medium text-muted-foreground">Fase</th>
                        <th className="border border-border p-2 text-left text-xs font-medium text-muted-foreground">Marca</th>
                        <th className="border border-border p-2 text-center text-xs font-medium text-muted-foreground">Qtd</th>
                        <th className="border border-border p-2 text-right text-xs font-medium text-muted-foreground">Peso Unit.</th>
                        <th className="border border-border p-2 text-right text-xs font-medium text-muted-foreground">Peso Total</th>
                        <th className="border border-border p-2 text-center text-xs font-medium text-muted-foreground">Corte</th>
                        <th className="border border-border p-2 text-center text-xs font-medium text-muted-foreground">Solda</th>
                        <th className="border border-border p-2 text-center text-xs font-medium text-muted-foreground">Pint/Galv</th>
                        <th className="border border-border p-2 text-center text-xs font-medium text-muted-foreground">Expedição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pecasFiltradas.slice(0, 20).map((peca, index) => (
                        <tr key={`${peca.id}-${index}`} className="hover:bg-muted/20">
                          <td className="border border-border p-2 text-xs text-card-foreground">{peca.of_number}</td>
                          <td className="border border-border p-2 text-xs text-card-foreground">{peca.etapa_fase}</td>
                          <td className="border border-border p-2 text-xs text-card-foreground font-semibold">{peca.marca}</td>
                          <td className="border border-border p-2 text-xs text-center text-card-foreground">{peca.quantidade}</td>
                          <td className="border border-border p-2 text-xs text-right text-card-foreground">{peca.peso_unitario.toFixed(2)} kg</td>
                          <td className="border border-border p-2 text-xs text-right text-card-foreground">{peca.peso_total.toFixed(2)} kg</td>
                          
                          {/* Corte com check e data */}
                          <td className="border border-border p-2 text-xs text-center text-card-foreground">
                            {peca.processos.corte ? (
                              <div className="flex flex-col items-center justify-center leading-tight">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">✓</span>
                                {peca.datasProcessos?.corte && (
                                  <span className="text-[10px] text-muted-foreground font-medium">
                                    {peca.datasProcessos.corte}
                                  </span>
                                )}
                              </div>
                            ) : ''}
                          </td>

                          {/* Solda com check e data */}
                          <td className="border border-border p-2 text-xs text-center text-card-foreground">
                            {!peca.tem_componentes ? (
                              <span className="text-purple-600 dark:text-purple-400 font-semibold">S/M</span>
                            ) : peca.processos.solda ? (
                              <div className="flex flex-col items-center justify-center leading-tight">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">✓</span>
                                {peca.datasProcessos?.solda && (
                                  <span className="text-[10px] text-muted-foreground font-medium">
                                    {peca.datasProcessos.solda}
                                  </span>
                                )}
                              </div>
                            ) : ''}
                          </td>

                          {/* Pintura com check e data */}
                          <td className="border border-border p-2 text-xs text-center text-card-foreground">
                            {peca.processos.pintura ? (
                              <div className="flex flex-col items-center justify-center leading-tight">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">✓</span>
                                {peca.datasProcessos?.pintura && (
                                  <span className="text-[10px] text-muted-foreground font-medium">
                                    {peca.datasProcessos.pintura}
                                  </span>
                                )}
                              </div>
                            ) : ''}
                          </td>

                          {/* Expedição com check e data */}
                          <td className="border border-border p-2 text-xs text-center text-card-foreground">
                            {peca.processos.expedicao ? (
                              <div className="flex flex-col items-center justify-center leading-tight">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">✓</span>
                                {peca.datasProcessos?.expedicao && (
                                  <span className="text-[10px] text-muted-foreground font-medium">
                                    {peca.datasProcessos.expedicao}
                                  </span>
                                )}
                              </div>
                            ) : ''}
                          </td>
                        </tr>
                      ))}
                      {pecasFiltradas.length > 20 && (
                        <tr>
                          <td colSpan={10} className="border border-border p-2 text-center text-sm text-muted-foreground">
                            ... e mais {pecasFiltradas.length - 20} peças
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando dados...</p>
              </div>
            </div>
          )}

          {selectedOF && !loading && pecasFiltradas.length === 0 && (
            <div className="text-center p-8">
              <p className="text-muted-foreground">Nenhuma peça encontrada para os filtros selecionados.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
