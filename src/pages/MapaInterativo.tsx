import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from '@/components/ui/sheet';
import { 
  Workflow, 
  Compass, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Boxes, 
  CalendarClock, 
  ListOrdered, 
  Factory, 
  BarChart3, 
  Truck, 
  ExternalLink, 
  ShieldCheck, 
  Info, 
  Sparkles, 
  Target,
  FileSpreadsheet,
  Layers,
  Clock,
  Check,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProcessStep {
  id: string;
  orderNumber: number;
  title: string;
  subtitle: string;
  route: string;
  phaseId: 'engenharia' | 'pcp' | 'producao' | 'expedicao';
  phaseName: string;
  phaseColor: {
    border: string;
    bgLight: string;
    badge: string;
    accent: string;
    glow: string;
  };
  icon: React.ElementType;
  responsibleRoles: string[];
  purpose: string;
  dependsOn: { stepId: string; label: string; reason: string }[];
  feedsInto: { stepId: string; label: string }[];
  prerequisites: string[];
  deliverables: string[];
  criticalRules: string[];
}

const PHASES = [
  {
    id: 'engenharia',
    name: '1. Engenharia & Cadastros',
    description: 'Definição de escopo, contratos, criação de OFs e cadastro detalhado das peças.',
    colorTheme: 'blue',
    borderClass: 'border-blue-500/40',
    headerBg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    dotColor: 'bg-blue-500',
  },
  {
    id: 'pcp',
    name: '2. Planejamento & PCP',
    description: 'Definição de metas, cronogramas por etapa e sequenciamento de prioridades.',
    colorTheme: 'amber',
    borderClass: 'border-amber-500/40',
    headerBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    dotColor: 'bg-amber-500',
  },
  {
    id: 'producao',
    name: '3. Chão de Fábrica & Apontamento',
    description: 'Fabricação física nos postos (Corte, Solda, Pintura) e monitoramento em tempo real.',
    colorTheme: 'emerald',
    borderClass: 'border-emerald-500/40',
    headerBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    dotColor: 'bg-emerald-500',
  },
  {
    id: 'expedicao',
    name: '4. Logística & Expedição',
    description: 'Separação de carga pronta, auditoria de pendências e liberação do romaneio.',
    colorTheme: 'purple',
    borderClass: 'border-purple-500/40',
    headerBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
    dotColor: 'bg-purple-500',
  },
];

const STEPS: ProcessStep[] = [
  {
    id: 'ficha-tecnica',
    orderNumber: 1,
    title: 'Ficha Técnica & Contrato',
    subtitle: 'Especificações e base do cliente',
    route: '/ficha-tecnica',
    phaseId: 'engenharia',
    phaseName: '1. Engenharia & Cadastros',
    phaseColor: {
      border: 'border-blue-300 dark:border-blue-800',
      bgLight: 'hover:bg-blue-50/60 dark:hover:bg-blue-950/20',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
      accent: 'text-blue-600 dark:text-blue-400',
      glow: 'ring-blue-500/50 shadow-blue-500/20',
    },
    icon: FileSpreadsheet,
    responsibleRoles: ['Engenharia', 'Comercial', 'Administrador'],
    purpose: 'Centralizar o contrato, requisitos de normas técnicas, sistema de pintura, especificações de perfis e diretrizes gerais da obra.',
    dependsOn: [],
    feedsInto: [
      { stepId: 'ofs', label: 'Cadastro de OFs' }
    ],
    prerequisites: [
      'Contrato assinado ou escopo preliminar aprovado com o cliente.',
      'Definição básica dos tratamentos de superfície (Galvanização, Pintura, primer).'
    ],
    deliverables: [
      'Documento de parâmetros que guiará a criação da OF e limites de fabricação.'
    ],
    criticalRules: [
      'Sem uma especificação ou contrato base, a OF não terá os vínculos contratuais e prazos contratuais de entrega definidos.'
    ]
  },
  {
    id: 'ofs',
    orderNumber: 2,
    title: 'Ordem de Fabricação (OF)',
    subtitle: 'A identidade do lote industrial',
    route: '/ofs',
    phaseId: 'engenharia',
    phaseName: '1. Engenharia & Cadastros',
    phaseColor: {
      border: 'border-blue-300 dark:border-blue-800',
      bgLight: 'hover:bg-blue-50/60 dark:hover:bg-blue-950/20',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
      accent: 'text-blue-600 dark:text-blue-400',
      glow: 'ring-blue-500/50 shadow-blue-500/20',
    },
    icon: FileText,
    responsibleRoles: ['PCP', 'Engenharia', 'Administrador'],
    purpose: 'Cria a "pasta-mãe" do projeto na fábrica (ex: OF B138, Fase 2). Define o cliente, peso total estimado, status e vinculação da obra.',
    dependsOn: [
      { stepId: 'ficha-tecnica', label: 'Ficha Técnica / Contrato', reason: 'Necessária para vincular cliente, dados e prazos previstos.' }
    ],
    feedsInto: [
      { stepId: 'pecas', label: 'Cadastro de Peças' },
      { stepId: 'cronograma', label: 'Cronograma de Produção' }
    ],
    prerequisites: [
      'Definição do número da OF (ex: B138) e da Etapa/Fase (ex: 1, 2, 3).',
      'Data prevista de início e término contratual.'
    ],
    deliverables: [
      'OF ativa no sistema, pronta para receber a lista de peças e o planejamento de prazos.'
    ],
    criticalRules: [
      'Nenhuma peça pode ser cadastrada solta no sistema sem estar vinculada a uma OF e Fase válidas.'
    ]
  },
  {
    id: 'pecas',
    orderNumber: 3,
    title: 'Cadastro de Peças & Conjuntos',
    subtitle: 'A lista de corte e montagem',
    route: '/cadastro/pecas',
    phaseId: 'engenharia',
    phaseName: '1. Engenharia & Cadastros',
    phaseColor: {
      border: 'border-blue-300 dark:border-blue-800',
      bgLight: 'hover:bg-blue-50/60 dark:hover:bg-blue-950/20',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
      accent: 'text-blue-600 dark:text-blue-400',
      glow: 'ring-blue-500/50 shadow-blue-500/20',
    },
    icon: Boxes,
    responsibleRoles: ['Detalhamento', 'Engenharia', 'PCP'],
    purpose: 'Importar ou cadastrar cada marca/tag de peça que será fabricada, com quantidade, perfil, comprimento, peso unitário e se possui componentes.',
    dependsOn: [
      { stepId: 'ofs', label: 'Ordem de Fabricação (OF)', reason: 'As peças precisam de uma OF e Fase de destino.' }
    ],
    feedsInto: [
      { stepId: 'prioridades', label: 'Prioridades de Fabricação' }
    ],
    prerequisites: [
      'Projeto de detalhamento aprovado (lista de materiais / Tekla / CAD).',
      'OF já cadastrada no sistema.'
    ],
    deliverables: [
      'Estoque planejado de peças da OF alimentado com pesos e composições.'
    ],
    criticalRules: [
      'REGRA CRUCIAL: Marcar corretamente se a peça "Tem Componentes" (C/M) ou é "Solta" (S/M). Peças sem componentes (S/M) NUNCA passam pela solda e encerram seu ciclo fabril no Corte!'
    ]
  },
  {
    id: 'cronograma',
    orderNumber: 4,
    title: 'Cronograma & Metas',
    subtitle: 'Curva planejada por processo',
    route: '/cronograma',
    phaseId: 'pcp',
    phaseName: '2. Planejamento & PCP',
    phaseColor: {
      border: 'border-amber-300 dark:border-amber-800',
      bgLight: 'hover:bg-amber-50/60 dark:hover:bg-amber-950/20',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
      accent: 'text-amber-600 dark:text-amber-400',
      glow: 'ring-amber-500/50 shadow-amber-500/20',
    },
    icon: CalendarClock,
    responsibleRoles: ['PCP', 'Gerência Industrial'],
    purpose: 'Distribuir os prazos e pesos diários de cada processo fabril (Detalhamento ➔ Corte ➔ Solda ➔ Pintura/Galv ➔ Montagem/Obra).',
    dependsOn: [
      { stepId: 'ofs', label: 'Ordem de Fabricação (OF)', reason: 'O cronograma é montado com base nas datas da OF e peso cadastrado.' }
    ],
    feedsInto: [
      { stepId: 'painel-industrial', label: 'Painel Industrial (Metas)' }
    ],
    prerequisites: [
      'OF criada com peso total cadastrado.',
      'Definição das datas de início e fim de cada etapa produtiva.'
    ],
    deliverables: [
      'Linha de base (baseline) e metas quinzenais que alimentam as cores do Painel Industrial.'
    ],
    criticalRules: [
      'Se o cronograma não tiver datas ou peso previsto, o Painel Industrial não conseguirá calcular o percentual planejado nem o status de atraso/adiantamento.'
    ]
  },
  {
    id: 'prioridades',
    orderNumber: 5,
    title: 'Prioridades de Fabricação',
    subtitle: 'Kanban & Checklist de Produção',
    route: '/prioridades-fabricacao',
    phaseId: 'pcp',
    phaseName: '2. Planejamento & PCP',
    phaseColor: {
      border: 'border-amber-300 dark:border-amber-800',
      bgLight: 'hover:bg-amber-50/60 dark:hover:bg-amber-950/20',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
      accent: 'text-amber-600 dark:text-amber-400',
      glow: 'ring-amber-500/50 shadow-amber-500/20',
    },
    icon: ListOrdered,
    responsibleRoles: ['PCP', 'Líder de Fábrica'],
    purpose: 'Classificar as peças da OF em colunas de urgência (P1 - Urgente, P2 - Alta, P3 - Média, P4 - Baixa) e emitir a folha de Checklist de Produção em PDF.',
    dependsOn: [
      { stepId: 'pecas', label: 'Cadastro de Peças', reason: 'As peças precisam estar cadastradas na OF para serem puxadas para as colunas de prioridade.' }
    ],
    feedsInto: [
      { stepId: 'apontamento', label: 'Apontamento de Produção' }
    ],
    prerequisites: [
      'Peças cadastradas na OF selecionada.',
      'Alinhamento com a montagem sobre quais conjuntos devem ser cortados primeiro.'
    ],
    deliverables: [
      'Kanban de prioridades ordenado por Marca (Tag) e Checklist impresso para o chão de fábrica.'
    ],
    criticalRules: [
      'Use o botão de ordenação por marca (A-Z) para dispor as peças sequencialmente na coluna antes de gerar a folha de checklist para o operador.'
    ]
  },
  {
    id: 'apontamento',
    orderNumber: 6,
    title: 'Apontamento de Produção',
    subtitle: 'Registro real de peças feitas',
    route: '/apontamento-producao',
    phaseId: 'producao',
    phaseName: '3. Chão de Fábrica & Apontamento',
    phaseColor: {
      border: 'border-emerald-300 dark:border-emerald-800',
      bgLight: 'hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
      accent: 'text-emerald-600 dark:text-emerald-400',
      glow: 'ring-emerald-500/50 shadow-emerald-500/20',
    },
    icon: Factory,
    responsibleRoles: ['Operador de Máquina', 'Soldador', 'Apontador', 'Líder de Turno'],
    purpose: 'Registrar a cada turno a quantidade e peso das peças que foram cortadas, soldadas e pintadas, dando baixa no checklist físico.',
    dependsOn: [
      { stepId: 'prioridades', label: 'Prioridades / Peças Cadastradas', reason: 'O operador só consegue selecionar peças que existem na OF.' }
    ],
    feedsInto: [
      { stepId: 'painel-industrial', label: 'Painel Industrial' },
      { stepId: 'romaneio', label: 'Romaneios de Expedição' }
    ],
    prerequisites: [
      'Peça fabricada fisicamente pelo operador.',
      'OF e posto de trabalho selecionados no formulário.'
    ],
    deliverables: [
      'Saldo produzido atualizado instantaneamente no banco de dados e avanço nos gráficos.'
    ],
    criticalRules: [
      'Peças soltas (S/M): apontou no Corte, já estão 100% fabricadas! Peças compostas (C/M): precisam obrigatoriamente de apontamento no Corte e depois na Solda.'
    ]
  },
  {
    id: 'painel-industrial',
    orderNumber: 7,
    title: 'Painel Industrial (BI & Metas)',
    subtitle: 'Cockpit de monitoramento em tempo real',
    route: '/painel-industrial',
    phaseId: 'producao',
    phaseName: '3. Chão de Fábrica & Apontamento',
    phaseColor: {
      border: 'border-emerald-300 dark:border-emerald-800',
      bgLight: 'hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
      accent: 'text-emerald-600 dark:text-emerald-400',
      glow: 'ring-emerald-500/50 shadow-emerald-500/20',
    },
    icon: BarChart3,
    responsibleRoles: ['Gerência', 'Diretoria', 'PCP', 'Líderes de Fábrica'],
    purpose: 'Painel visual (tipo telão de fábrica) com comparação automática de ritmo: Azul (Adiantado), Verde (No Prazo), Amarelo (Atenção) e Vermelho (Atrasado).',
    dependsOn: [
      { stepId: 'cronograma', label: 'Cronograma', reason: 'Fornece a linha de base planejada.' },
      { stepId: 'apontamento', label: 'Apontamento de Produção', reason: 'Fornece o peso real produzido.' }
    ],
    feedsInto: [
      { stepId: 'romaneio', label: 'Liberação para Expedição' }
    ],
    prerequisites: [
      'Cronograma ativo e apontamentos sendo realizados pela equipe.'
    ],
    deliverables: [
      'Termômetro visual de entregas da quinzena e alertas imediatos de gargalo na produção.'
    ],
    criticalRules: [
      'O painel respeita a tolerância de 99.5% para marcar processos como concluídos (verde/azul), evitando falsos alertas por dízimas de peso.'
    ]
  },
  {
    id: 'romaneio',
    orderNumber: 8,
    title: 'Romaneios de Expedição',
    subtitle: 'Montagem de carga e envio à obra',
    route: '/expedicao',
    phaseId: 'expedicao',
    phaseName: '4. Logística & Expedição',
    phaseColor: {
      border: 'border-purple-300 dark:border-purple-800',
      bgLight: 'hover:bg-purple-50/60 dark:hover:bg-purple-950/20',
      badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200',
      accent: 'text-purple-600 dark:text-purple-400',
      glow: 'ring-purple-500/50 shadow-purple-500/20',
    },
    icon: Truck,
    responsibleRoles: ['Expedição', 'Logística', 'Qualidade'],
    purpose: 'Agrupar as peças prontas em um romaneio de carga de caminhão, conferir peso de transporte, gerar a minuta de envio e dar baixa definitiva de fábrica.',
    dependsOn: [
      { stepId: 'apontamento', label: 'Apontamento de Produção', reason: 'Apenas peças que foram realmente fabricadas e apontadas podem ser expedidas.' }
    ],
    feedsInto: [],
    prerequisites: [
      'Peças da OF apontadas em todos os processos exigidos.',
      'Definição da transportadora, motorista, placa e data de carregamento.'
    ],
    deliverables: [
      'Relatório de Romaneio oficial de expedição e baixa de peças da fábrica.'
    ],
    criticalRules: [
      'VALIDAÇÃO BLOQUEANTE: O sistema não permite mudar o status para "Entregue" se qualquer peça do romaneio possuir pendência de apontamento em Corte ou Solda!'
    ]
  }
];

const USER_ROLES = [
  { id: 'all', label: 'Esteira Completa (Todos)', icon: Workflow, desc: 'Visão holística de toda a interligação de ponta a ponta.' },
  { id: 'engenharia', label: 'Engenharia & Cadastros', icon: FileSpreadsheet, desc: 'Foco na definição de contratos, OFs e lista de peças.' },
  { id: 'pcp', label: 'PCP & Planejamento', icon: CalendarClock, desc: 'Foco em cronogramas, metas e sequenciamento de prioridades.' },
  { id: 'producao', label: 'Chão de Fábrica', icon: Factory, desc: 'Foco no checklist físico, execução de corte/solda e apontamentos.' },
  { id: 'expedicao', label: 'Expedição & Logística', icon: Truck, desc: 'Foco em peças prontas, montagem de carga e romaneios.' },
];

const GOAL_SIMULATIONS = [
  {
    id: 'criar_of',
    label: 'Como criar e liberar uma nova OF?',
    sequence: ['ficha-tecnica', 'ofs', 'pecas', 'cronograma'],
    summary: 'Para iniciar uma obra: defina a Ficha Técnica/Contrato ➔ Crie a OF ➔ Cadastre as Peças ➔ Estabeleça o Cronograma de Prazos.'
  },
  {
    id: 'priorizar_fabrica',
    label: 'Como organizar a ordem de corte para a fábrica?',
    sequence: ['ofs', 'pecas', 'prioridades'],
    summary: 'Para enviar o checklist aos operadores: Tenha a OF e as Peças cadastradas ➔ Organize o Kanban de Prioridades ➔ Ordene por Marca e Imprima o PDF.'
  },
  {
    id: 'apontar_producao',
    label: 'Como registrar o trabalho do dia no chão de fábrica?',
    sequence: ['prioridades', 'apontamento', 'painel-industrial'],
    summary: 'No chão de fábrica: Consulte a folha de Prioridades ➔ Faça o Apontamento de cada peça no seu posto ➔ Acompanhe o Painel Industrial.'
  },
  {
    id: 'expedir_carga',
    label: 'Como montar um caminhão e emitir o romaneio?',
    sequence: ['apontamento', 'romaneio'],
    summary: 'Para despachar materiais: Garanta que todas as peças foram apontadas em Corte e Solda ➔ Monte o Romaneio ➔ Valide as pendências e emita o PDF.'
  },
];

export default function MapaInterativo() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<ProcessStep | null>(null);

  // Filtro de passos de acordo com o papel ou objetivo
  const activeGoal = useMemo(() => {
    return GOAL_SIMULATIONS.find(g => g.id === activeGoalId) || null;
  }, [activeGoalId]);

  // Checar se o passo está destacado pelo objetivo ativo
  const isStepInActiveGoal = (stepId: string) => {
    if (!activeGoal) return false;
    return activeGoal.sequence.includes(stepId);
  };

  const getStepGoalOrder = (stepId: string) => {
    if (!activeGoal) return null;
    const index = activeGoal.sequence.indexOf(stepId);
    return index >= 0 ? index + 1 : null;
  };

  // Checar se o passo pertence ao papel selecionado
  const isStepRelevantToRole = (step: ProcessStep) => {
    if (selectedRole === 'all') return true;
    if (selectedRole === 'engenharia') return ['ficha-tecnica', 'ofs', 'pecas'].includes(step.id);
    if (selectedRole === 'pcp') return ['ofs', 'pecas', 'cronograma', 'prioridades', 'painel-industrial'].includes(step.id);
    if (selectedRole === 'producao') return ['prioridades', 'apontamento', 'painel-industrial'].includes(step.id);
    if (selectedRole === 'expedicao') return ['apontamento', 'romaneio'].includes(step.id);
    return true;
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Cabeçalho Principal com Filosofia Didática */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Compass className="h-6 w-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Mapa do Fluxo Operacional TrackSteel
            </h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Entenda como cada tela se conecta, quais são os pré-requisitos obrigatórios de cada ação e nunca mais fique perdido no sistema.
          </p>
        </div>

        {/* Botão de Ajuda Rápida */}
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1.5 text-xs font-semibold gap-1.5 border-primary/30 text-primary bg-primary/5">
            <Sparkles className="h-3.5 w-3.5" />
            Guia Interativo de Processos
          </Badge>
        </div>
      </div>

      {/* Barra de Filtro por Função (Trilhas de Papéis) */}
      <Card className="border-border/60 shadow-sm bg-background/80 backdrop-blur-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" />
              Filtrar por Área de Atuação:
            </span>
            {selectedRole !== 'all' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedRole('all')}
                className="h-6 text-xs text-muted-foreground hover:text-foreground"
              >
                Limpar filtro
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {USER_ROLES.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.id;
              return (
                <Button
                  key={role.id}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedRole(role.id);
                    setActiveGoalId(null);
                  }}
                  className={cn(
                    "text-xs font-medium gap-1.5 transition-all",
                    isSelected ? "shadow-md" : "hover:border-primary/40 hover:bg-muted/50"
                  )}
                  title={role.desc}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {role.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Assistente: "O que você quer fazer hoje?" (Simulador de Caminhos) */}
      <div className="bg-gradient-to-r from-primary/5 via-blue-500/5 to-purple-500/5 border border-primary/20 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-sm text-foreground">
              Assistente de Jornada: "O que você precisa fazer hoje?"
            </h3>
          </div>
          {activeGoalId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveGoalId(null)}
              className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
            >
              Resetar Trilha
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {GOAL_SIMULATIONS.map((goal) => {
            const isActive = activeGoalId === goal.id;
            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => {
                  setActiveGoalId(isActive ? null : goal.id);
                  if (!isActive) setSelectedRole('all');
                }}
                className={cn(
                  "text-left p-3 rounded-lg border text-xs font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
                    : "bg-background/90 border-border hover:border-primary/50 text-foreground hover:bg-background"
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <span>{goal.label}</span>
                  <ChevronRight className={cn("h-4 w-4 shrink-0 transition-transform", isActive ? "rotate-90 text-primary-foreground" : "text-muted-foreground")} />
                </div>
              </button>
            );
          })}
        </div>

        {activeGoal && (
          <div className="mt-3.5 pt-3 border-t border-primary/20 text-xs text-foreground/90 flex items-center gap-2">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span>
              <strong>Sequência recomendada:</strong> {activeGoal.summary}
            </span>
          </div>
        )}
      </div>

      {/* A ESTEIRA INDUSTRIAL: As 4 Fases e seus Módulos Conectados */}
      <div className="space-y-8">
        {PHASES.map((phase, phaseIdx) => {
          const phaseSteps = STEPS.filter(step => step.phaseId === phase.id);

          return (
            <div 
              key={phase.id} 
              className={cn(
                "rounded-2xl border p-4 sm:p-6 bg-card/60 backdrop-blur-sm transition-all",
                phase.borderClass
              )}
            >
              {/* Cabeçalho da Fase */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3 mb-5">
                <div className="flex items-center gap-2.5">
                  <span className={cn("w-3 h-3 rounded-full animate-pulse", phase.dotColor)} />
                  <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                    {phase.name}
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground sm:max-w-md text-left sm:text-right">
                  {phase.description}
                </p>
              </div>

              {/* Grid de Passos dentro da Fase */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {phaseSteps.map((step) => {
                  const Icon = step.icon;
                  const isRelevant = isStepRelevantToRole(step);
                  const inGoal = isStepInActiveGoal(step.id);
                  const goalOrder = getStepGoalOrder(step.id);

                  return (
                    <Card
                      key={step.id}
                      onClick={() => setSelectedStep(step)}
                      className={cn(
                        "relative cursor-pointer transition-all duration-300 border-2 overflow-hidden group",
                        step.phaseColor.border,
                        step.phaseColor.bgLight,
                        // Opacidade se filtrado por papel
                        !isRelevant && "opacity-35 grayscale hover:opacity-100 hover:grayscale-0",
                        // Destaque se estiver no objetivo simulado ativo
                        inGoal && "ring-4 ring-offset-2 ring-primary scale-[1.02] shadow-xl border-primary",
                        !inGoal && "hover:shadow-lg hover:-translate-y-0.5"
                      )}
                    >
                      {/* Badge de Passo da Jornada Ativa */}
                      {goalOrder && (
                        <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground font-black text-xs px-2.5 py-0.5 rounded-full shadow-md animate-bounce">
                          PASSO {goalOrder}
                        </div>
                      )}

                      <CardContent className="p-4 sm:p-5 space-y-3">
                        {/* Topo do Card */}
                        <div className="flex items-start gap-3">
                          <div className={cn("p-2.5 rounded-xl shrink-0 bg-muted/80 text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors")}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-muted-foreground">
                                #{step.orderNumber}
                              </span>
                              <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                {step.title}
                              </h3>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {step.subtitle}
                            </p>
                          </div>
                        </div>

                        {/* Relações de Dependência e Entrega */}
                        <div className="pt-2 border-t border-border/50 text-[11px] space-y-1.5">
                          {step.dependsOn.length > 0 ? (
                            <div className="flex items-center gap-1 text-muted-foreground truncate">
                              <span className="font-semibold text-foreground/80">Depende de:</span>
                              <span className="truncate text-amber-600 dark:text-amber-400 font-medium">
                                {step.dependsOn.map(d => d.label).join(', ')}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Ponto de Partida Inicial</span>
                            </div>
                          )}

                          {step.feedsInto.length > 0 && (
                            <div className="flex items-center gap-1 text-muted-foreground truncate">
                              <span className="font-semibold text-foreground/80">Alimenta:</span>
                              <span className="truncate text-blue-600 dark:text-blue-400 font-medium">
                                {step.feedsInto.map(f => f.label).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Rodapé do Card com Tags de Responsáveis e Botão de Detalhes */}
                        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                          <div className="flex flex-wrap gap-1">
                            {step.responsibleRoles.slice(0, 2).map((role) => (
                              <Badge key={role} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {role}
                              </Badge>
                            ))}
                          </div>
                          <span className="text-primary font-semibold flex items-center gap-0.5 text-[11px] group-hover:translate-x-0.5 transition-transform">
                            Ver regras ➔
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Conector Visual entre Fases (Seta Indicativa para baixo) */}
              {phaseIdx < PHASES.length - 1 && (
                <div className="flex justify-center pt-5 -mb-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-muted/60 rounded-full text-xs font-semibold text-muted-foreground border border-border/40 shadow-xs">
                    <span>Próxima Etapa do Fluxo</span>
                    <ArrowRight className="h-3.5 w-3.5 text-primary rotate-90" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* DRAWER / GAVETA LATERAL DIDÁTICA (O Coração da Experiência) */}
      <Sheet open={selectedStep !== null} onOpenChange={(open) => !open && setSelectedStep(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-6 space-y-6">
          {selectedStep && (
            <>
              {/* Cabeçalho do Drawer */}
              <SheetHeader className="space-y-2 border-b border-border/60 pb-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={selectedStep.phaseColor.badge}>
                    Etapa {selectedStep.orderNumber} • {selectedStep.phaseName}
                  </Badge>
                </div>
                <SheetTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
                  <selectedStep.icon className={cn("h-6 w-6", selectedStep.phaseColor.accent)} />
                  {selectedStep.title}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  {selectedStep.subtitle}
                </SheetDescription>
              </SheetHeader>

              {/* Botão de Ação Direta para a Tela Real */}
              <div>
                <Button
                  onClick={() => navigate(selectedStep.route)}
                  className="w-full font-bold gap-2 py-5 text-sm shadow-md"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir Tela de {selectedStep.title} Agora
                </Button>
                <p className="text-[11px] text-muted-foreground text-center mt-1.5">
                  Rota do sistema: <code className="text-primary font-mono">{selectedStep.route}</code>
                </p>
              </div>

              {/* 1. Objetivo da Tela */}
              <div className="bg-muted/40 p-3.5 rounded-xl border border-border/60 space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-primary" />
                  Qual é o objetivo desta tela?
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {selectedStep.purpose}
                </p>
              </div>

              {/* 2. O que você precisa ter feito antes? (Pré-requisitos) */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  O que precisa existir antes? (Pré-requisitos)
                </h4>
                <ul className="space-y-1.5">
                  {selectedStep.prerequisites.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90 bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-md border border-amber-200/50 dark:border-amber-900/30">
                      <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 3. O que esta tela entrega? (Saídas) */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  O que esta tela produz? (Entregáveis)
                </h4>
                <ul className="space-y-1.5">
                  {selectedStep.deliverables.map((deliv, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90 bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-md border border-emerald-200/50 dark:border-emerald-900/30">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{deliv}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 4. Regras Críticas / Pegadinhas do Chão de Fábrica */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Regras Importantes de Processo:
                </h4>
                <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-950 dark:text-blue-200 space-y-1.5">
                  {selectedStep.criticalRules.map((rule, idx) => (
                    <p key={idx} className="leading-relaxed">
                      💡 {rule}
                    </p>
                  ))}
                </div>
              </div>

              {/* 5. Quem normalmente opera esta tela? */}
              <div className="pt-2 border-t border-border/60">
                <span className="text-[11px] font-semibold text-muted-foreground">Responsáveis Típicos:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selectedStep.responsibleRoles.map((role) => (
                    <Badge key={role} variant="outline" className="text-xs font-medium">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
