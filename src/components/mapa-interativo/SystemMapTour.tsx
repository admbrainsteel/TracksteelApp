import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  X,
  Play,
  FileText,
  Building2,
  Truck,
  Users
} from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  content: string[];
}

const tourSteps: TourStep[] = [
  {
    title: 'Bem-vindo ao Mapa Interativo',
    description: 'Explore a arquitetura completa do sistema',
    icon: Play,
    content: [
      'Este mapa mostra todos os módulos do sistema e suas interações',
      'Clique nos módulos para navegar diretamente',
      'Use os filtros para focar em áreas específicas',
      'As linhas mostram o fluxo de dados e processos'
    ]
  },
  {
    title: 'Fluxo Principal do Sistema',
    description: 'Jornada completa: do cadastro à instalação',
    icon: FileText,
    content: [
      '1. Cadastro de OF - Criação da ordem de fabricação',
      '2. Cadastro de Peças - Definição dos itens a produzir',
      '3. Gestão de Estoque - Controle de materiais necessários',
      '4. Produção - Fabricação das peças',
      '5. Expedição - Preparação para envio',
      '6. Obra - Instalação no canteiro'
    ]
  },
  {
    title: 'Módulos de Produção',
    description: 'Gestão completa do processo produtivo',
    icon: Building2,
    content: [
      'Dashboard de Produção - Visão geral da fábrica',
      'Prioridades - Sequenciamento da produção',
      'Diário de Produção - Registro diário de atividades',
      'Apontamentos - Controle de quantidade produzida',
      'Painel Industrial - Monitoramento em tempo real'
    ]
  },
  {
    title: 'Gestão de Expedição e Obra',
    description: 'Do produto acabado à instalação',
    icon: Truck,
    content: [
      'Romaneios - Documentos de expedição',
      'Apontamento Automático - Integração com produção',
      'RDO - Relatório Diário de Obra',
      'Controle de Peças em Canteiro',
      'Relatórios de Progresso'
    ]
  },
  {
    title: 'Sistema de Apoio',
    description: 'Ferramentas auxiliares e administração',
    icon: Users,
    content: [
      'Sistema de Tarefas - Comunicação entre equipes',
      'Biblioteca - Catálogos e documentos técnicos',
      'Gestão de Usuários - Controle de acesso',
      'Configurações - Personalização do sistema',
      'Relatórios e Dashboards'
    ]
  }
];

interface SystemMapTourProps {
  onClose: () => void;
}

export function SystemMapTour({ onClose }: SystemMapTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = tourSteps[currentStep];
  const Icon = step.icon;

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <Icon className="w-6 h-6 text-primary" />
              {step.title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress */}
          <div className="flex items-center gap-2">
            {tourSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  index === currentStep 
                    ? 'bg-primary' 
                    : index < currentStep 
                      ? 'bg-primary/50' 
                      : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>

                <div className="space-y-3">
                  {step.content.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Badge variant="outline" className="mt-0.5 min-w-fit">
                        {index + 1}
                      </Badge>
                      <p className="text-sm leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {currentStep + 1} de {tourSteps.length}
            </div>

            {currentStep < tourSteps.length - 1 ? (
              <Button onClick={nextStep} className="gap-2">
                Próximo
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={onClose} className="gap-2">
                Finalizar Tour
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}