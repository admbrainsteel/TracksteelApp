import {
  BarChart3,
  FileText,
  Wrench,
  Warehouse,
  FolderOpen,
  Building2,
  Monitor,
  Truck,
  HardHat,
  CheckSquare,
  Book,
  Clipboard,
  MessageSquare,
  Users,
  Network,
  Settings,
  Shield,
  UserCog,
  Cog
} from "lucide-react";
import { MenuItem, MenuGroup } from './types';

export const menuGroups: MenuGroup[] = [
  {
    id: 'main',
    name: 'Principal',
    color: '#3b82f6',
    items: [
      {
        key: "dashboard",
        title: "Dashboard",
        url: "/dashboard",
        icon: BarChart3,
      },
      {
        key: "cadastro",
        title: "Cadastro",
        icon: FileText,
        subItems: [
          {
            key: "ordens-fabricacao",
            title: "Ordens de Fabricação",
            url: "/ofs",
          },
          {
            key: "cadastro-pecas",
            title: "Cadastro de Peças",
            url: "/seletor-of",
          },
          {
            key: "equipamentos",
            title: "Equipamentos",
            url: "/equipamentos",
          }
        ]
      },
      {
        key: "ferramentas",
        title: "Ferramentas",
        icon: Wrench,
        requiresSpecialPermission: true,
        subItems: [
          {
            key: "conversores",
            title: "Conversores de dados",
            url: "/ferramentas/conversores",
          },
          {
            key: "inconsistencias",
            title: "Ver Inconsistências",
            url: "/ferramentas/inconsistencias",
          }
        ]
      },
      {
        key: "estoque",
        title: "Estoque",
        icon: Warehouse,
        subItems: [
          {
            key: "estoque-main",
            title: "Estoque",
            url: "/estoque",
          },
          {
            key: "solicitacao-compras",
            title: "Solicitação de Compras",
            url: "/estoque/solicitacao-compras",
          }
        ]
      },
      {
        key: "ofs",
        title: "OFs",
        icon: FolderOpen,
        subItems: [
          {
            key: "ficha-tecnica-of",
            title: "Ficha Técnica da OF",
            url: "/cadastro-of",
          },
          {
            key: "cronograma",
            title: "Cronograma",
            url: "/ofs/cronograma",
          },
          {
            key: "ofs-concluidas",
            title: "OFs Concluídas",
            url: "/cadastro/ofs-concluidas",
          }
        ]
      },
      {
        key: "producao",
        title: "Produção",
        icon: Building2,
        subItems: [
          {
            key: "visao-geral",
            title: "Visão Geral",
            url: "/producao",
          },
          {
            key: "diario-producao",
            title: "Diário de Produção",
            url: "/diario-producao",
          },
          {
            key: "apontamento-producao",
            title: "Apontamento de Produção",
            url: "/apontamento-producao",
          },
          {
            key: "dashboard-producao",
            title: "Dashboard de Produção",
            url: "/dashboard-producao",
          },
          {
            key: "prioridades-fabricacao",
            title: "Prioridades de Fabricação",
            url: "/prioridades-fabricacao",
          }
        ]
      },
      {
        key: "painel-industrial",
        title: "Painel Industrial",
        url: "/painel-industrial",
        icon: Monitor,
      },
      {
        key: "expedicao",
        title: "Expedição",
        url: "/expedicao",
        icon: Truck,
      },
      {
        key: "obra",
        title: "Obra",
        icon: HardHat,
        subItems: [
          {
            key: "dashboard-obras",
            title: "Dashboard de Obras",
            url: "/obra",
          },
          {
            key: "configuracoes-obra",
            title: "Configurações da Obra",
            url: "/obra/configuracoes",
          }
        ]
      },
      {
        key: "tarefas",
        title: "Tarefas",
        icon: CheckSquare,
        requiresSpecialPermission: true,
        subItems: [
          {
            key: "lista-tarefas",
            title: "Lista de Tarefas",
            url: "/tarefas",
          },
          {
            key: "historico-tarefas",
            title: "Histórico de Tarefas",
            url: "/tarefas/historico",
          }
        ]
      },
      {
        key: "biblioteca",
        title: "Biblioteca",
        icon: Book,
        subItems: [
          {
            key: "catalogos",
            title: "Catálogos",
            url: "/biblioteca/catalogos",
          },
          {
            key: "normas",
            title: "Normas",
            url: "/biblioteca/normas",
          },
          {
            key: "referencias",
            title: "Referências",
            url: "/biblioteca/referencias",
          }
        ]
      },
      {
        key: "sistema",
        title: "Sistema",
        url: "/sistema",
        icon: Clipboard,
        requiresSpecialPermission: true,
      },
      {
        key: "sugestoes",
        title: "Sugestões",
        url: "/sugestoes",
        icon: MessageSquare,
        requiresSpecialPermission: true,
      },
      {
        key: "atribuicoes",
        title: "Atribuições",
        url: "/atribuicoes",
        icon: Users,
      },
      {
        key: "mapa-interativo",
        title: "Mapa Interativo",
        url: "/mapa-interativo",
        icon: Network,
      },
      {
        key: "configuracoes",
        title: "Configurações",
        icon: Settings,
        subItems: [
          {
            key: "configuracoes-gerais",
            title: "Configurações Gerais",
            url: "/configuracoes",
          },
          {
            key: "personalizacao-tema",
            title: "Personalização de Tema",
            url: "/admin/theme-customization",
          }
        ]
      }
    ]
  },
  {
    id: 'admin',
    name: 'Administração',
    color: '#dc2626',
    items: [
      {
        key: "admin",
        title: "Admin",
        url: "/admin",
        icon: Shield,
      },
      {
        key: "gerenciar-usuarios",
        title: "Gerenciar Usuários",
        url: "/user-management",
        icon: UserCog,
      }
    ]
  }
];
