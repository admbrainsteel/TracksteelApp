import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Thermometer, FileText, Package } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDiariosObra } from '@/hooks/useObra';
import { useApontamentosPecaObra } from '@/hooks/useApontamentosPecaObra';
import { usePecasExpedidas } from '@/hooks/usePecasExpedidas';

interface RDODetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  rdoId: string | null;
}

export const RDODetailView: React.FC<RDODetailViewProps> = ({
  isOpen,
  onClose,
  rdoId
}) => {
  const { data: diariosData } = useDiariosObra();
  const { data: apontamentosPecas = [] } = useApontamentosPecaObra(rdoId || undefined);
  
  const rdo = diariosData?.find(r => r.id === rdoId);
  const { data: pecasExpedidas = [] } = usePecasExpedidas(rdo?.of_number || '');

  if (!rdo) return null;

  // Calcular estatísticas das peças
  const totalApontadoHoje = apontamentosPecas.reduce((acc, a) => acc + a.quantidade, 0);
  const totalExpedido = pecasExpedidas.reduce((acc, p) => acc + p.quantidade_expedida, 0);
  const totalJaApontado = pecasExpedidas.reduce((acc, p) => acc + p.quantidade_ja_apontada, 0);
  const saldoDisponivel = pecasExpedidas.reduce((acc, p) => acc + p.saldo_disponivel, 0);

  // Agrupar apontamentos por peça para exibição detalhada
  const apontamentosAgrupados = apontamentosPecas.reduce((acc, apontamento) => {
    const marca = apontamento.marca_peca;
    if (!acc[marca]) {
      acc[marca] = [];
    }
    acc[marca].push(apontamento);
    return acc;
  }, {} as Record<string, typeof apontamentosPecas>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            RDO {rdo.numero_rdo} - OF {rdo.of_number}
          </DialogTitle>
          <DialogDescription>
            Detalhes do Relatório Diário de Obra
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Gerais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data</p>
                    <p className="font-medium">
                      {format(new Date(rdo.data), 'PPP', { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {rdo.hora_inicio && rdo.hora_fim && (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 text-muted-foreground">🕐</div>
                    <div>
                      <p className="text-sm text-muted-foreground">Horário de Trabalho</p>
                      <p className="font-medium">{rdo.hora_inicio} - {rdo.hora_fim}</p>
                      {rdo.total_horas_trabalhadas && (
                        <p className="text-xs text-muted-foreground">
                          Total: {rdo.total_horas_trabalhadas}h
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {rdo.condicoes_climaticas && (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 text-muted-foreground">☀️</div>
                    <div>
                      <p className="text-sm text-muted-foreground">Condição Climática</p>
                      <p className="font-medium">{rdo.condicoes_climaticas.nome}</p>
                    </div>
                  </div>
                )}
              </div>

              {rdo.observacoes_gerais && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Observações Gerais</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">{rdo.observacoes_gerais}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Badge variant={rdo.finalizado ? "default" : "secondary"}>
                  {rdo.finalizado ? "Finalizado" : "Em andamento"}
                </Badge>
                <Badge variant={rdo.sincronizado ? "default" : "outline"}>
                  {rdo.sincronizado ? "Sincronizado" : "Não sincronizado"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Resumo de Peças */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5" />
                Resumo de Peças
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{totalExpedido}</div>
                  <p className="text-xs text-muted-foreground">Total Expedido</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{totalJaApontado}</div>
                  <p className="text-xs text-muted-foreground">Total Apontado (Geral)</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-primary">{totalApontadoHoje}</div>
                  <p className="text-xs text-muted-foreground">Apontado Hoje</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{saldoDisponivel}</div>
                  <p className="text-xs text-muted-foreground">Saldo Disponível</p>
                </div>
              </div>

              {/* Detalhes por peça */}
              {Object.keys(apontamentosAgrupados).length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-medium">Peças Apontadas Hoje</h4>
                  {Object.entries(apontamentosAgrupados).map(([marca, apontamentos]) => {
                    const totalMarca = apontamentos.reduce((acc, a) => acc + a.quantidade, 0);
                    const pecaInfo = pecasExpedidas.find(p => p.marca === marca);
                    
                    return (
                      <div key={marca} className="border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium">{marca}</h5>
                          <Badge variant="outline">
                            Total: {totalMarca} peças
                          </Badge>
                        </div>
                        
                        {pecaInfo && (
                          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-3">
                            <span>Expedido: {pecaInfo.quantidade_expedida}</span>
                            <span>Já apontado: {pecaInfo.quantidade_ja_apontada}</span>
                            <span>Saldo: {pecaInfo.saldo_disponivel}</span>
                          </div>
                        )}

                        <div className="space-y-1">
                          {apontamentos.map((apontamento, index) => (
                            <div key={apontamento.id} className="flex justify-between text-sm">
                              <span>Apontamento #{index + 1}</span>
                              <span className="font-medium">{apontamento.quantidade} peças</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma peça foi apontada neste RDO</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informações do Sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Responsável:</span>
                  <span className="ml-2 font-medium">{rdo.usuario_nome || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Criado em:</span>
                  <span className="ml-2 font-medium">
                    {format(new Date(rdo.created_at), 'PPp', { locale: ptBR })}
                  </span>
                </div>
                {rdo.updated_at !== rdo.created_at && (
                  <div>
                    <span className="text-muted-foreground">Última modificação:</span>
                    <span className="ml-2 font-medium">
                      {format(new Date(rdo.updated_at), 'PPp', { locale: ptBR })}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};