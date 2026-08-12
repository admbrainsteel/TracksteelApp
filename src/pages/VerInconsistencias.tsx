
import React, { useState, useEffect } from 'react';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, Download, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { useOFsAtivas } from '@/hooks/useOFsAtivas';
import { useAuditoriaInconsistencias, InconsistenciaItem } from '@/hooks/useAuditoriaInconsistencias';
import { InconsistenciaDetalhesModal } from '@/components/auditoria/InconsistenciaDetalhesModal';
import { generateProfessionalPDF } from '@/utils/pdfGenerator';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const VerInconsistencias = () => {
  const [selectedOF, setSelectedOF] = useState<string>('');
  const [selectedFase, setSelectedFase] = useState<string>('');
  const [selectedProcesso, setSelectedProcesso] = useState<string>('todas');
  const [fasesDaOF, setFasesDaOF] = useState<string[]>([]);
  const [detalhesModal, setDetalhesModal] = useState<{ open: boolean; inconsistencia: InconsistenciaItem | null }>({
    open: false,
    inconsistencia: null
  });

  const { data: ofs = [] } = useOFsAtivas();
  const { 
    data: resultadoAuditoria, 
    loading, 
    executarAuditoria 
  } = useAuditoriaInconsistencias();

  const processos = ['Corte', 'Solda', 'Pintura', 'Expedição'];

  // Buscar fases da OF selecionada
  useEffect(() => {
    const buscarFasesDaOF = async () => {
      if (!selectedOF) {
        setFasesDaOF([]);
        setSelectedFase('');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('pecas')
          .select('etapa_fase')
          .eq('of_number', selectedOF)
          .not('etapa_fase', 'is', null);

        if (error) {
          console.error('Erro ao buscar fases da OF:', error);
          return;
        }

        const fasesUnicas = [...new Set(data.map(p => p.etapa_fase))]
          .filter((fase): fase is string => Boolean(fase))
          .sort();

        setFasesDaOF(fasesUnicas);
        
        // Limpar seleção de fase se não existir mais
        if (selectedFase && !fasesUnicas.includes(selectedFase)) {
          setSelectedFase('');
        }
      } catch (error) {
        console.error('Erro ao buscar fases:', error);
      }
    };

    buscarFasesDaOF();
  }, [selectedOF, selectedFase]);

  const handleChecarInconsistencias = () => {
    if (!selectedOF) {
      toast({
        title: 'OF obrigatória',
        description: 'Selecione uma OF para verificar inconsistências',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedFase) {
      toast({
        title: 'Fase obrigatória',
        description: 'Selecione uma fase da OF para verificar inconsistências',
        variant: 'destructive'
      });
      return;
    }
    
    executarAuditoria(selectedOF, selectedProcesso === 'todas' ? undefined : selectedProcesso, selectedFase);
  };

  const handleExportarPDF = async () => {
    if (!resultadoAuditoria) return;
    
    try {
      await generateProfessionalPDF('auditoria-inconsistencias', 'auditoria-inconsistencias.pdf');
      toast({
        title: 'PDF gerado',
        description: 'Relatório de inconsistências exportado com sucesso'
      });
    } catch (error) {
      toast({
        title: 'Erro ao gerar PDF',
        description: 'Não foi possível exportar o relatório',
        variant: 'destructive'
      });
    }
  };

  const getTotalInconsistencias = () => {
    if (!resultadoAuditoria) return 0;
    return Object.values(resultadoAuditoria.inconsistencias).reduce((total, categoria: InconsistenciaItem[]) => total + categoria.length, 0);
  };

  return (
    <StandardPageLayout
      title="Ver Inconsistências"
      subtitle="Ferramenta de auditoria para verificar inconsistências no sistema"
    >
      <div className="space-y-6">
        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Parâmetros de Auditoria
            </CardTitle>
            <CardDescription>
              Selecione a OF e fase para verificar inconsistências
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Ordem de Fabricação</label>
                <Select value={selectedOF} onValueChange={setSelectedOF}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma OF" />
                  </SelectTrigger>
                  <SelectContent>
                    {ofs.map((of) => (
                      <SelectItem key={of.of_number} value={of.of_number}>
                        {of.of_number} - {of.descricao_resumida || 'Sem descrição'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Fase</label>
                <Select value={selectedFase} onValueChange={setSelectedFase} disabled={!selectedOF}>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedOF ? "Selecione uma fase" : "Selecione uma OF primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {fasesDaOF.map((fase) => (
                      <SelectItem key={fase} value={fase}>
                        {fase}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Processo</label>
                <Select value={selectedProcesso} onValueChange={setSelectedProcesso}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todos os Processos</SelectItem>
                    {processos.map((processo) => (
                      <SelectItem key={processo} value={processo}>
                        {processo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={handleChecarInconsistencias}
                  disabled={loading || !selectedOF || !selectedFase}
                  className="w-full"
                >
                  {loading ? 'Verificando...' : 'Checar Inconsistências'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        {resultadoAuditoria && (
          <div id="auditoria-inconsistencias" className="space-y-6">
            {/* Resumo */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getTotalInconsistencias() > 0 ? (
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      Resultado da Auditoria
                    </CardTitle>
                    <CardDescription>
                      OF: {selectedOF} | Fase: {selectedFase} | Processo: {selectedProcesso === 'todas' ? 'Todos' : selectedProcesso}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleExportarPDF} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {resultadoAuditoria.inconsistencias.processos?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Processos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {resultadoAuditoria.inconsistencias.quantidades?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Quantidades</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {resultadoAuditoria.inconsistencias.expedicao?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Expedição</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {resultadoAuditoria.inconsistencias.prioridades?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Prioridades</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inconsistências por Categoria */}
            {Object.entries(resultadoAuditoria.inconsistencias).map(([categoria, inconsistencias]) => (
              <Card key={categoria}>
                <CardHeader>
                  <CardTitle className="capitalize">
                    Inconsistências de {categoria}
                    <Badge variant="secondary" className="ml-2">
                      {(inconsistencias as InconsistenciaItem[]).length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(inconsistencias as any[]).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      Nenhuma inconsistência encontrada nesta categoria
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(inconsistencias as InconsistenciaItem[]).map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{item.descricao}</div>
                            <div className="text-sm text-muted-foreground">
                              Marca: {item.marca} | Tipo: {item.tipo}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetalhesModal({ open: true, inconsistencia: item })}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Verificações Concluídas */}
            <Card>
              <CardHeader>
                <CardTitle>Verificações Realizadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {resultadoAuditoria.verificacoesRealizadas.map((verificacao, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {verificacao}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal de Detalhes */}
        <InconsistenciaDetalhesModal
          open={detalhesModal.open}
          onOpenChange={(open) => setDetalhesModal({ open, inconsistencia: null })}
          inconsistencia={detalhesModal.inconsistencia}
        />
      </div>
    </StandardPageLayout>
  );
};

export default VerInconsistencias;
