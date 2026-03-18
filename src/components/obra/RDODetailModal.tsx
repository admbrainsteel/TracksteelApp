
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RDODetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  rdoId: string;
}

export const RDODetailModal: React.FC<RDODetailModalProps> = ({
  isOpen,
  onClose,
  rdoId,
}) => {
  const [activeTab, setActiveTab] = useState('geral');

  const { data: rdo, isLoading } = useQuery({
    queryKey: ['rdo_detail', rdoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diario_obra_rdo')
        .select(`
          *,
          condicoes_climaticas:condicao_climatica_id(*)
        `)
        .eq('id', rdoId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!rdoId,
  });

  const { data: apontamentosPecas } = useQuery({
    queryKey: ['apontamentos_peca_obra', rdoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apontamentos_peca_obra')
        .select('*')
        .eq('rdo_id', rdoId);

      if (error) throw error;
      return data;
    },
    enabled: !!rdoId,
  });

  const { data: apontamentosRecursos } = useQuery({
    queryKey: ['apontamentos_recursos_obra', rdoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apontamentos_recursos_obra')
        .select(`
          *,
          recursos_obra:recurso_id(*)
        `)
        .eq('rdo_id', rdoId);

      if (error) throw error;
      return data;
    },
    enabled: !!rdoId,
  });

  const { data: apontamentosImprodutivos } = useQuery({
    queryKey: ['apontamentos_improdutivos', rdoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apontamentos_improdutivos')
        .select(`
          *,
          motivos_improdutivos:motivo_id(*)
        `)
        .eq('rdo_id', rdoId);

      if (error) throw error;
      return data;
    },
    enabled: !!rdoId,
  });

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            Carregando RDO...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!rdo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl">
                {rdo.numero_rdo || `RDO - ${format(new Date(rdo.data), 'PPP', { locale: ptBR })}`}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                OF: {rdo.of_number} • Responsável: {rdo.usuario_nome || 'Não informado'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="geral">Informações Gerais</TabsTrigger>
            <TabsTrigger value="pecas">Apontamento de Peças</TabsTrigger>
            <TabsTrigger value="recursos">Recursos Humanos</TabsTrigger>
            <TabsTrigger value="improdutivos">Tempo Improdutivo</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados Climáticos e Observações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Data</label>
                    <p className="font-medium">{format(new Date(rdo.data), 'PPP', { locale: ptBR })}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Temperatura</label>
                    <p className="font-medium">
                      {rdo.temperatura_aproximada ? `${rdo.temperatura_aproximada}°C` : 'Não informado'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Condição Climática</label>
                    <p className="font-medium">
                      {rdo.condicoes_climaticas?.nome || 'Não informado'}
                    </p>
                  </div>
                </div>
                
                {rdo.observacoes_gerais && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Observações Gerais</label>
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <p className="text-sm">{rdo.observacoes_gerais}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Badge variant={rdo.finalizado ? "default" : "secondary"}>
                    {rdo.finalizado ? 'Finalizado' : 'Em Andamento'}
                  </Badge>
                  <Badge variant={rdo.sincronizado ? "default" : "outline"}>
                    {rdo.sincronizado ? 'Sincronizado' : 'Não Sincronizado'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pecas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Apontamento de Peças</CardTitle>
              </CardHeader>
              <CardContent>
                {apontamentosPecas && apontamentosPecas.length > 0 ? (
                  <div className="space-y-3">
                    {apontamentosPecas.map((apontamento) => (
                      <div key={apontamento.id} className="p-3 border rounded-md">
                        <div className="grid grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="font-medium">Marca:</span>
                            <p>{apontamento.marca_peca}</p>
                          </div>
                          <div>
                            <span className="font-medium">Quantidade:</span>
                            <p>{apontamento.quantidade}</p>
                          </div>
                          <div>
                            <span className="font-medium">Período:</span>
                            <p>{apontamento.periodo}</p>
                          </div>
                          <div>
                            <span className="font-medium">Status:</span>
                            <Badge variant="outline">{apontamento.status}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum apontamento de peça registrado
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recursos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recursos Humanos</CardTitle>
              </CardHeader>
              <CardContent>
                {apontamentosRecursos && apontamentosRecursos.length > 0 ? (
                  <div className="space-y-3">
                    {apontamentosRecursos.map((apontamento) => (
                      <div key={apontamento.id} className="p-3 border rounded-md">
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="font-medium">Recurso:</span>
                            <p>{apontamento.recursos_obra?.nome_recurso}</p>
                          </div>
                          <div>
                            <span className="font-medium">Tipo:</span>
                            <p>{apontamento.recursos_obra?.tipo_recurso}</p>
                          </div>
                          <div>
                            <span className="font-medium">Horas Trabalhadas:</span>
                            <p>{apontamento.horas_trabalhadas}h</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum recurso registrado
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="improdutivos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tempos Improdutivos</CardTitle>
              </CardHeader>
              <CardContent>
                {apontamentosImprodutivos && apontamentosImprodutivos.length > 0 ? (
                  <div className="space-y-3">
                    {apontamentosImprodutivos.map((apontamento) => (
                      <div key={apontamento.id} className="p-3 border rounded-md">
                        <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                          <div>
                            <span className="font-medium">Motivo:</span>
                            <p>{apontamento.motivos_improdutivos?.motivo}</p>
                          </div>
                          <div>
                            <span className="font-medium">Categoria:</span>
                            <Badge variant="outline">
                              {apontamento.motivos_improdutivos?.categoria}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="font-medium">Início:</span>
                            <p>{apontamento.hora_inicio}</p>
                          </div>
                          <div>
                            <span className="font-medium">Fim:</span>
                            <p>{apontamento.hora_fim}</p>
                          </div>
                          <div>
                            <span className="font-medium">Duração:</span>
                            <p>{String(apontamento.duracao_total)}</p>
                          </div>
                        </div>
                        {apontamento.descricao && (
                          <div className="mt-2">
                            <span className="font-medium text-sm">Descrição:</span>
                            <p className="text-sm text-muted-foreground">{apontamento.descricao}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum tempo improdutivo registrado
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
