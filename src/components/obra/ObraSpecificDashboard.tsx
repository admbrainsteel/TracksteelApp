import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, Users, Building, Clock, AlertTriangle, CheckCircle2, TrendingUp, Camera, Edit } from 'lucide-react';
import { useDiariosObra, useContratosObra } from '@/hooks/useObra';
import { useOFs } from '@/hooks/useOFs';
import { StatusObraModal } from './StatusObraModal';

interface ObraSpecificDashboardProps {
  obraAtual: string;
  onNavigateToRDO: () => void;
  onNavigateToRelatorios: () => void;
}

export const ObraSpecificDashboard: React.FC<ObraSpecificDashboardProps> = ({
  obraAtual,
  onNavigateToRDO,
  onNavigateToRelatorios
}) => {
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const { data: rdos } = useDiariosObra(obraAtual);
  const { data: contratos } = useContratosObra();
  const { data: ofs } = useOFs();

  // Buscar dados da obra atual
  const contratoAtual = contratos?.find(c => c.of_number === obraAtual);
  const ofAtual = ofs?.find(of => of.num_of === obraAtual);

  const rdosRecentes = rdos?.slice(0, 5) || [];
  const totalRDOs = rdos?.length || 0;
  const rdosFinalizados = rdos?.filter(rdo => rdo.finalizado).length || 0;

  // Verificar se pode criar RDO (só se status for "Em Andamento")
  const canCreateRDO = contratoAtual?.status === 'Ativo';

  // Função para mapear status para exibição
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'Ativo':
        return 'Em Andamento';
      case 'Pausado':
        return 'Pausada';
      case 'Concluído':
        return 'Concluída';
      case 'Arquivada':
        return 'Arquivada';
      default:
        return 'Aguardando Início';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo':
        return 'bg-green-100 text-green-800';
      case 'Pausado':
        return 'bg-yellow-100 text-yellow-800';
      case 'Concluído':
        return 'bg-blue-100 text-blue-800';
      case 'Arquivada':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-orange-100 text-orange-800';
    }
  };

  // Calcular prazo decorrido
  const calcularPrazoDecorrido = () => {
    if (!contratoAtual?.data_inicio_contratual || !contratoAtual?.data_termino_prevista) {
      return { percentual: 0, diasDecorridos: 0, diasRestantes: 0, totalDias: 0 };
    }

    const dataInicio = new Date(contratoAtual.data_inicio_contratual);
    const dataTermino = new Date(contratoAtual.data_termino_prevista);
    const dataAtual = new Date();

    const totalDias = Math.ceil((dataTermino.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
    const diasDecorridos = Math.ceil((dataAtual.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
    const diasRestantes = totalDias - diasDecorridos;
    const percentual = Math.min(Math.max((diasDecorridos / totalDias) * 100, 0), 100);

    return { 
      percentual: Math.round(percentual), 
      diasDecorridos: Math.max(diasDecorridos, 0), 
      diasRestantes: Math.max(diasRestantes, 0), 
      totalDias 
    };
  };

  const prazoInfo = calcularPrazoDecorrido();

  const dashboardCards = [
    {
      title: "Relatórios",
      count: totalRDOs.toString(),
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      onClick: onNavigateToRelatorios
    },
    {
      title: "Atividades",
      count: "4",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Ocorrências",
      count: "2",
      icon: AlertTriangle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50"
    },
    {
      title: "Comentários",
      count: "3",
      icon: FileText,
      color: "text-gray-600",
      bgColor: "bg-gray-50"
    },
    {
      title: "Fotos",
      count: "1",
      icon: Camera,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Cards principais */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {dashboardCards.map((card, index) => (
          <Card 
            key={card.title} 
            className={`${card.bgColor} border-0 cursor-pointer hover:shadow-md transition-shadow`}
            onClick={card.onClick}
          >
            <CardContent className="p-4 text-center">
              <div className="flex flex-col items-center space-y-2">
                <div className={`p-2 rounded-full ${card.bgColor}`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <div className={`text-2xl font-bold ${card.color}`}>
                  {card.count}
                </div>
                <p className="text-sm text-gray-600">{card.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Relatórios Recentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-orange-600">Relatórios recentes</CardTitle>
            <Button 
              variant="link" 
              className="text-blue-600 p-0" 
              onClick={onNavigateToRDO}
              disabled={!canCreateRDO}
              title={!canCreateRDO ? "RDOs só podem ser criados quando a obra estiver 'Em Andamento'" : ""}
            >
              Ver tudo
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 text-sm font-medium text-gray-600 border-b pb-2">
                <span>Data</span>
                <span>N°</span>
                <span>Status</span>
                <span>Modelo de relatório</span>
              </div>
              {rdosRecentes.map((rdo) => (
                <div key={rdo.id} className="grid grid-cols-4 gap-2 text-sm items-center">
                  <span>{new Date(rdo.data).toLocaleDateString('pt-BR')}</span>
                  <span>{rdo.numero_rdo || '-'}</span>
                  <Badge variant={rdo.finalizado ? "default" : "secondary"} className="text-xs">
                    {rdo.finalizado ? "Aprovado" : "Pendente"}
                  </Badge>
                  <span className="text-xs text-gray-500">Relatório Diário de Obra (RDO)</span>
                </div>
              ))}
              {rdosRecentes.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  {!canCreateRDO ? 
                    "RDOs só podem ser criados quando a obra estiver 'Em Andamento'" : 
                    "Nenhum RDO cadastrado ainda"
                  }
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Fotos recentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-orange-600">Fotos recentes</CardTitle>
            <Button variant="link" className="text-blue-600 p-0">
              Ver tudo
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg">
              <div className="text-center text-gray-500">
                <Camera className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Nenhuma foto adicionada ainda</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informações da obra */}
      <Card>
        <CardHeader>
          <CardTitle className="text-orange-600 flex items-center gap-2">
            <Building className="w-5 h-5" />
            Informações da obra
            <Button variant="link" className="text-blue-600 p-0 ml-auto">
              Editar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">Status</div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(contratoAtual?.status || '')}>
                  {getStatusDisplay(contratoAtual?.status || '')}
                </Badge>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 w-6 p-0"
                  onClick={() => setIsStatusModalOpen(true)}
                  title="Alterar status da obra"
                >
                  <Edit className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">N° do contrato</div>
              <div className="font-semibold">{obraAtual}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Prazo decorrido</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${prazoInfo.percentual}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold">{prazoInfo.percentual}%</span>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Prazo contratual</div>
                <div className="font-medium">{prazoInfo.totalDias} dias</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Prazo decorrido</div>
                <div className="font-medium">{prazoInfo.diasDecorridos} dias</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Prazo a vencer</div>
                <div className="font-medium">{prazoInfo.diasRestantes} dias</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6 pt-6 border-t">
            <div>
              <div className="text-sm text-gray-600 mb-1">Nome da Obra</div>
              <div className="text-sm">{contratoAtual?.nome_obra || 'Não informado'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Contratante</div>
              <div className="text-sm">{contratoAtual?.cliente || 'Não informado'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Data início</div>
              <div className="text-sm">
                {contratoAtual?.data_inicio_contratual 
                  ? new Date(contratoAtual.data_inicio_contratual).toLocaleDateString('pt-BR')
                  : ofAtual?.data_abertura 
                    ? new Date(ofAtual.data_abertura).toLocaleDateString('pt-BR')
                    : 'Não informado'
                }
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Previsão de término</div>
              <div className="text-sm">
                {contratoAtual?.data_termino_prevista 
                  ? new Date(contratoAtual.data_termino_prevista).toLocaleDateString('pt-BR')
                  : ofAtual?.data_prazo 
                    ? new Date(ofAtual.data_prazo).toLocaleDateString('pt-BR')
                    : 'Não informado'
                }
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <div className="text-sm text-gray-600 mb-1">Descrição</div>
            <div className="text-sm">
              {ofAtual?.descritivo || contratoAtual?.nome_obra || 'Descrição não informada'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Status */}
      {contratoAtual && (
        <StatusObraModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          contratoId={contratoAtual.id}
          currentStatus={contratoAtual.status || 'Aguardando Inicio'}
        />
      )}
    </div>
  );
};
