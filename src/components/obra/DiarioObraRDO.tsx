import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Edit, Eye, Calendar, MapPin, Thermometer } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useContratosObra, useDiariosObra } from '@/hooks/useObra';
import { RDOWizardModal } from './RDOWizardModal';
import { RDODetailView } from './RDODetailView';

interface DiarioObraRDOProps {
  obraAtual: string | null;
}

export const DiarioObraRDO: React.FC<DiarioObraRDOProps> = ({ obraAtual }) => {
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedRDO, setSelectedRDO] = useState<string | null>(null);
  const [rdoParaEdicao, setRdoParaEdicao] = useState<any>(null);

  const { data: contratos } = useContratosObra();
  const { data: diariosData, isLoading } = useDiariosObra(obraAtual || '');

  const contratoAtual = contratos?.find(c => c.of_number === obraAtual);
  const podecriarRDO = contratoAtual?.status === 'Ativo';

  if (!obraAtual) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-card-foreground mb-2">Selecione uma obra</h3>
          <p className="text-muted-foreground max-w-md">
            Para acessar o Diário de Obra (RDO), primeiro selecione uma obra no Dashboard.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleDetailRDO = (rdoId: string) => {
    setSelectedRDO(rdoId);
    setShowDetailView(true);
  };

  const handleEditRDO = (rdoId: string) => {
    const rdo = diariosData?.find(r => r.id === rdoId);
    setRdoParaEdicao(rdo);
    setShowWizardModal(true);
  };

  const handleCloseModal = () => {
    setShowWizardModal(false);
    setShowDetailView(false);
    setRdoParaEdicao(null);
    setSelectedRDO(null);
  };

  const handleCreateRDO = () => {
    if (!podecriarRDO) {
      return;
    }
    setShowWizardModal(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Diário de Obra - {obraAtual}
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os Relatórios Diários de Obra (RDO)
          </p>
        </div>
        <Button 
          onClick={handleCreateRDO}
          disabled={!podecriarRDO}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo RDO
        </Button>
      </div>

      {/* Status Warning */}
      {!podecriarRDO && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">
                RDOs só podem ser criados quando a obra estiver com status "Ativo"
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando RDOs...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* RDO List */}
          {diariosData && diariosData.length > 0 ? (
            <div className="grid gap-4">
              {diariosData.map((rdo) => (
                <Card key={rdo.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {rdo.numero_rdo || `RDO - ${format(new Date(rdo.data), 'PPP', { locale: ptBR })}`}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(rdo.data), 'PPP', { locale: ptBR })}
                          </div>
                        {rdo.condicoes_climaticas && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <span>
                              {rdo.condicoes_climaticas.icone === 'sun' && '☀️'}
                              {rdo.condicoes_climaticas.icone === 'cloud' && '☁️'}
                              {rdo.condicoes_climaticas.icone === 'cloud-rain' && '🌧️'}
                              {rdo.condicoes_climaticas.icone === 'wind' && '💨'}
                              {rdo.condicoes_climaticas.icone === 'cloud-drizzle' && '🌦️'}
                            </span>
                            {rdo.condicoes_climaticas.nome}
                          </div>
                        )}
                        {rdo.hora_inicio && rdo.hora_fim && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <span>🕐</span>
                            {rdo.hora_inicio} - {rdo.hora_fim}
                          </div>
                        )}
                        </div>
                        {rdo.usuario_nome && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Responsável: <span className="font-medium">{rdo.usuario_nome}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={rdo.finalizado ? "default" : "secondary"}>
                          {rdo.finalizado ? "Finalizado" : "Em andamento"}
                        </Badge>
                        {rdo.sincronizado && (
                          <Badge variant="outline">
                            Sincronizado
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    {rdo.condicoes_climaticas && (
                      <div className="mb-3">
                        <span className="text-sm text-muted-foreground">Condição Climática: </span>
                        <span className="text-sm font-medium">{rdo.condicoes_climaticas.nome}</span>
                      </div>
                    )}

                    {rdo.observacoes_gerais && (
                      <div className="mb-4 p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Observações:</p>
                        <p className="text-sm">{rdo.observacoes_gerais}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDetailRDO(rdo.id)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Detalhar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRDO(rdo.id)}
                        className="flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Editar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* Empty State */
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-card-foreground mb-2">
                  Nenhum RDO encontrado
                </h3>
                <p className="text-muted-foreground max-w-md mb-4">
                  {podecriarRDO 
                    ? "Comece criando seu primeiro Relatório Diário de Obra para esta obra." 
                    : "RDOs só podem ser criados quando a obra estiver com status 'Ativo'."
                  }
                </p>
                {podecriarRDO && (
                  <Button 
                    onClick={handleCreateRDO}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Criar primeiro RDO
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Modals */}
      <RDOWizardModal
        isOpen={showWizardModal}
        onClose={handleCloseModal}
        obraAtual={obraAtual}
        rdoParaEdicao={rdoParaEdicao}
      />

      <RDODetailView
        isOpen={showDetailView}
        onClose={handleCloseModal}
        rdoId={selectedRDO}
      />
    </div>
  );
};