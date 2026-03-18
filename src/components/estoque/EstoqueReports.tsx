
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Filter, X } from 'lucide-react';
import { PosicaoEstoqueReport } from './reports/PosicaoEstoqueReport';
import { MovimentacoesReport } from './reports/MovimentacoesReport';
import { MateriaisCriticosReport } from './reports/MateriaisCriticosReport';
import { EmpenhosPorOFReport } from './reports/EmpenhosPorOFReport';
import { ReportPreviewModal } from './reports/ReportPreviewModal';
import { useOFsComEmpenhos } from '@/hooks/useEmpenhosMaterial';

const tiposRelatorio = [
  { value: 'posicao', label: 'Posição de Estoque', icon: FileText },
  { value: 'movimentacoes', label: 'Movimentações', icon: FileText },
  { value: 'criticos', label: 'Materiais Críticos', icon: FileText },
  { value: 'empenhos', label: 'Empenhos por OF', icon: FileText }
];

export const EstoqueReports: React.FC = () => {
  const [tipoRelatorio, setTipoRelatorio] = useState('');
  const [filters, setFilters] = useState({
    data_inicio: '',
    data_fim: '',
    descricao_material: '',
    status: 'todos',
    of_vinculada: 'todos',
    status_empenho: 'todos',
    title: ''
  });

  // Buscar OFs com empenhos usando o novo hook
  const { data: ofsComEmpenhos = [] } = useOFsComEmpenhos();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      data_inicio: '',
      data_fim: '',
      descricao_material: '',
      status: 'todos',
      of_vinculada: 'todos',
      status_empenho: 'todos',
      title: ''
    });
  };

  const renderReport = () => {
    // Ajustar os filtros para o relatório
    const reportFilters = {
      ...filters,
      of_vinculada: filters.of_vinculada === 'todos' ? '' : filters.of_vinculada
    };

    switch (tipoRelatorio) {
      case 'posicao':
        return <PosicaoEstoqueReport filters={reportFilters} />;
      case 'movimentacoes':
        return <MovimentacoesReport filters={reportFilters} />;
      case 'criticos':
        return <MateriaisCriticosReport filters={reportFilters} />;
      case 'empenhos':
        return <EmpenhosPorOFReport filters={reportFilters} />;
      default:
        return null;
    }
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== '' && value !== 'todos'
  );

  const shouldShowFilters = tipoRelatorio !== '';

  const getReportId = () => {
    return `relatorio-${tipoRelatorio}-${Date.now()}`;
  };

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relatórios de Estoque
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Seleção do tipo de relatório */}
          <div>
            <Label htmlFor="tipo-relatorio">Tipo de Relatório</Label>
            <Select value={tipoRelatorio} onValueChange={setTipoRelatorio}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de relatório" />
              </SelectTrigger>
              <SelectContent>
                {tiposRelatorio.map((tipo) => {
                  const Icon = tipo.icon;
                  return (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {tipo.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Filtros */}
          {shouldShowFilters && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                </h3>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="h-8 flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    Limpar
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Filtros de data */}
                {(tipoRelatorio === 'movimentacoes' || tipoRelatorio === 'empenhos') && (
                  <>
                    <div>
                      <Label htmlFor="data-inicio">Data Início</Label>
                      <Input
                        id="data-inicio"
                        type="date"
                        value={filters.data_inicio}
                        onChange={(e) => handleFilterChange('data_inicio', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="data-fim">Data Fim</Label>
                      <Input
                        id="data-fim"
                        type="date"
                        value={filters.data_fim}
                        onChange={(e) => handleFilterChange('data_fim', e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* Filtro de material */}
                {tipoRelatorio !== 'empenhos' && (
                  <div>
                    <Label htmlFor="descricao-material">Material (descrição)</Label>
                    <Input
                      id="descricao-material"
                      placeholder="Digite parte da descrição..."
                      value={filters.descricao_material}
                      onChange={(e) => handleFilterChange('descricao_material', e.target.value)}
                    />
                  </div>
                )}

                {/* Filtro de status para posição */}
                {tipoRelatorio === 'posicao' && (
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="Crítico">Crítico</SelectItem>
                        <SelectItem value="Excesso">Excesso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Filtros específicos para empenhos */}
                {tipoRelatorio === 'empenhos' && (
                  <>
                    <div>
                      <Label htmlFor="of-empenhos">OF com Empenhos</Label>
                      <Select value={filters.of_vinculada} onValueChange={(value) => handleFilterChange('of_vinculada', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma OF" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todas as OFs</SelectItem>
                          {ofsComEmpenhos.map((of) => (
                            <SelectItem key={of} value={of}>
                              {of}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="status-empenho">Status do Empenho</Label>
                      <Select value={filters.status_empenho} onValueChange={(value) => handleFilterChange('status_empenho', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          <SelectItem value="Empenhado">Empenhado</SelectItem>
                          <SelectItem value="Finalizado">Finalizado</SelectItem>
                          <SelectItem value="Cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Ações */}
          {tipoRelatorio && (
            <div className="flex gap-2">
              <Button onClick={() => setIsPreviewOpen(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Gerar Relatório
              </Button>
            </div>
          )}

          {/* Preview do relatório */}
          {tipoRelatorio && !isPreviewOpen && (
            <div className="border rounded-lg p-4 bg-background">
              <div className="max-h-96 overflow-auto">
                {renderReport()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ReportPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={`Relatório: ${tiposRelatorio.find(t => t.value === tipoRelatorio)?.label || ''}`}
        reportId={getReportId()}
        filters={filters}
      >
        {renderReport()}
      </ReportPreviewModal>
    </>
  );
};
