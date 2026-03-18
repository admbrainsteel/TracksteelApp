
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Calendar, Users, FileText } from 'lucide-react';
import { useContratosObra } from '@/hooks/useObra';
import { ContratoObraModal } from './ContratoObraModal';

interface ObraDashboardProps {
  onSelectObra: (ofNumber: string) => void;
}

export const ObraDashboard: React.FC<ObraDashboardProps> = ({ onSelectObra }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: contratos, isLoading } = useContratosObra();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Pausado':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Concluído':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'Ativo':
        return 'Em Andamento';
      case 'Pausado':
        return 'Pausado';
      case 'Concluído':
        return 'Concluída';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Carregando obras...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Dashboard de Obras</h2>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nova Obra
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contratos?.map((contrato) => (
          <Card 
            key={contrato.id} 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onSelectObra(contrato.of_number)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-lg">{contrato.of_number}</CardTitle>
                </div>
                <Badge className={getStatusColor(contrato.status)}>
                  {getStatusDisplay(contrato.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h3 className="font-medium text-foreground">
                  {contrato.nome_obra || 'Nome não informado'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {contrato.cliente || 'Cliente não informado'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Início:</span>
                  <div className="font-medium">
                    {contrato.data_inicio_contratual 
                      ? new Date(contrato.data_inicio_contratual).toLocaleDateString('pt-BR')
                      : 'Não definido'
                    }
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Prazo:</span>
                  <div className="font-medium">
                    {contrato.data_termino_prevista 
                      ? new Date(contrato.data_termino_prevista).toLocaleDateString('pt-BR')
                      : 'Não definido'
                    }
                  </div>
                </div>
              </div>

              {contrato.status === 'Ativo' && (
                <div className="flex justify-between items-center pt-2 border-t">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>RDO Hoje</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      <span>Relatórios</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {(!contratos || contratos.length === 0) && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-card-foreground mb-2">Nenhuma obra cadastrada</h3>
              <p className="text-muted-foreground max-w-md mb-4">
                Comece criando sua primeira obra para começar a gerenciar os diários de obra (RDO).
              </p>
              <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Criar primeira obra
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <ContratoObraModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
