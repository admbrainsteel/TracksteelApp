
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, FileText, Printer } from 'lucide-react';
import { useOFs } from '@/hooks/useOFs';
import { useRelatorioPecasProcesso, PecaComStatus } from '@/hooks/useRelatorioPecasProcesso';
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

  // Filtrar peças por fase selecionada
  const pecasFiltradas = selectedFase === 'todas' 
    ? pecasComStatus 
    : pecasComStatus.filter(peca => peca.etapa_fase === selectedFase);

  // Recalcular estatísticas para as peças filtradas
  const estatisticasFiltradas = {
    totalPecas: pecasFiltradas.length,
    pesoTotalCorte: pecasFiltradas.filter(p => p.processos.corte).reduce((sum, p) => sum + p.peso_total, 0),
    pesoTotalSolda: pecasFiltradas.filter(p => p.processos.solda).reduce((sum, p) => sum + p.peso_total, 0),
    pesoTotalPintura: pecasFiltradas.filter(p => p.processos.pintura).reduce((sum, p) => sum + p.peso_total, 0),
    pesoTotalExpedicao: pecasFiltradas.filter(p => p.processos.expedicao).reduce((sum, p) => sum + p.peso_total, 0)
  };

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
                selectedOF={selectedOF}
                selectedFase={selectedFase}
              />
              <RelatorioPecasProcessoPrint
                pecasComStatus={pecasFiltradas}
                estatisticas={estatisticasFiltradas}
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
                
                {/* Estatísticas */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div className="bg-muted/50 p-3 rounded text-center">
                    <p className="text-sm text-muted-foreground">Total de Peças</p>
                    <p className="text-xl font-bold text-card-foreground">{estatisticasFiltradas.totalPecas}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded text-center">
                    <p className="text-sm text-muted-foreground">Peso Corte</p>
                    <p className="text-xl font-bold text-card-foreground">{estatisticasFiltradas.pesoTotalCorte.toFixed(0)} kg</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded text-center">
                    <p className="text-sm text-muted-foreground">Peso Solda</p>
                    <p className="text-xl font-bold text-card-foreground">{estatisticasFiltradas.pesoTotalSolda.toFixed(0)} kg</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded text-center">
                    <p className="text-sm text-muted-foreground">Peso Pintura</p>
                    <p className="text-xl font-bold text-card-foreground">{estatisticasFiltradas.pesoTotalPintura.toFixed(0)} kg</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded text-center">
                    <p className="text-sm text-muted-foreground">Peso Expedição</p>
                    <p className="text-xl font-bold text-card-foreground">{estatisticasFiltradas.pesoTotalExpedicao.toFixed(0)} kg</p>
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
                          <td className="border border-border p-2 text-xs text-card-foreground">{peca.marca}</td>
                          <td className="border border-border p-2 text-xs text-center text-card-foreground">{peca.quantidade}</td>
                          <td className="border border-border p-2 text-xs text-right text-card-foreground">{peca.peso_unitario.toFixed(2)} kg</td>
                          <td className="border border-border p-2 text-xs text-right text-card-foreground">{peca.peso_total.toFixed(2)} kg</td>
                          <td className="border border-border p-2 text-xs text-center text-card-foreground">
                            {peca.processos.corte ? '✓' : ''}
                          </td>
                          <td className="border border-border p-2 text-xs text-center text-card-foreground">
                            {!peca.tem_componentes ? 'S/M' : (peca.processos.solda ? '✓' : '')}
                          </td>
                          <td className="border border-border p-2 text-xs text-center text-card-foreground">
                            {peca.processos.pintura ? '✓' : ''}
                          </td>
                          <td className="border border-border p-2 text-xs text-center text-card-foreground">
                            {peca.processos.expedicao ? '✓' : ''}
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
