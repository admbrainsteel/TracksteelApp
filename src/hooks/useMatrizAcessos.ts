import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type NivelAcesso = 'nenhum' | 'visualizar' | 'criar';

export interface UsuarioMatriz {
  id: string;
  email: string;
  fullName: string;
  status: 'active' | 'pending' | 'inactive' | 'rejected';
  privilegeId: string | null;
  privilegeName: string;
  functionId: string | null;
  functionName: string;
  profileImageUrl: string | null;
  permissoesMap: Record<string, NivelAcesso>;
}

export interface GrupoRecurso {
  key: string;
  titulo: string;
  cor: string; // 'emerald', 'sky', 'indigo', 'amber', 'teal', 'rose'
  descricao: string;
  recursos: {
    key: string;
    nome: string;
    rota?: string;
  }[];
}

// 6 Grupos Industriais Claros e Intuitivos
export const GRUPOS_MODULOS: GrupoRecurso[] = [
  {
    key: 'smart',
    titulo: 'Modo Smart (Chão de Fábrica)',
    cor: 'emerald',
    descricao: 'Interface touch para operadores e líderes de linha',
    recursos: [
      { key: 'modo-smart', nome: 'Acesso Geral Modo Smart', rota: '/smart' },
      { key: 'smart-apontamento', nome: '1. Apontar Produção', rota: '/smart' },
      { key: 'smart-metricas', nome: '2. Ver Minhas Métricas', rota: '/smart' },
      { key: 'smart-pdf', nome: '3. Gerar Relatórios e PDFs', rota: '/smart' },
    ],
  },
  {
    key: 'producao_pcp',
    titulo: 'Produção & PCP',
    cor: 'sky',
    descricao: 'Gestão de capacidade, apontamentos e mesa tática',
    recursos: [
      { key: 'producao-pcp', nome: 'Mesa Tática PCP', rota: '/pcp' },
      { key: 'producao-dashboard', nome: 'Dashboard de Produção', rota: '/dashboard-producao' },
      { key: 'producao-apontamento', nome: 'Apontamento Administrativo', rota: '/apontamento-producao' },
      { key: 'diario-producao', nome: 'Diário de Produção', rota: '/diario-producao' },
      { key: 'prioridades-fabricacao', nome: 'Prioridades de Fabricação', rota: '/prioridades-fabricacao' },
    ],
  },
  {
    key: 'engenharia_3d',
    titulo: 'Engenharia, OFs & BIM',
    cor: 'indigo',
    descricao: 'Projetos, modelos 3D, fichas técnicas e cronogramas',
    recursos: [
      { key: 'visualizador-3d', nome: 'Visualizador 3D BIM', rota: '/visualizador-3d' },
      { key: 'ofs-lista', nome: 'Ordens de Fabricação', rota: '/ofs' },
      { key: 'ofs-cronograma', nome: 'Cronogramas de Fabricação', rota: '/ofs/cronograma' },
      { key: 'cadastro-pecas', nome: 'Cadastro de Peças & Conjuntos', rota: '/cadastro/pecas' },
    ],
  },
  {
    key: 'expedicao_logistica',
    titulo: 'Expedição & Romaneios',
    cor: 'amber',
    descricao: 'Embarque, pesagem, transporte e romaneios',
    recursos: [
      { key: 'expedicao', nome: 'Painel de Expedição', rota: '/expedicao' },
      { key: 'estoque', nome: 'Controle de Estoque', rota: '/estoque' },
      { key: 'estoque-solicitacao-compras', nome: 'Solicitação de Compras', rota: '/estoque/solicitacao-compras' },
    ],
  },
  {
    key: 'obra_montagem',
    titulo: 'Obra & Montagem Externa',
    cor: 'teal',
    descricao: 'Acompanhamento do canteiro e montagem',
    recursos: [
      { key: 'obra-dashboard', nome: 'Dashboard da Obra', rota: '/obra' },
      { key: 'obra-configuracoes', nome: 'Configurações de Obra', rota: '/obra/configuracoes' },
    ],
  },
  {
    key: 'admin_sistema',
    titulo: 'Administração & Sistema',
    cor: 'rose',
    descricao: 'Controle de acessos, usuários e configurações',
    recursos: [
      { key: 'user-management', nome: 'Matriz de Usuários & Acessos', rota: '/user-management' },
      { key: 'configuracoes-gerais', nome: 'Configurações Gerais', rota: '/configuracoes' },
      { key: 'ferramentas-inconsistencias', nome: 'Auditoria de Inconsistências', rota: '/ferramentas/inconsistencias' },
      { key: 'sistema', nome: 'Painel do Sistema', rota: '/sistema' },
    ],
  },
];

export interface TemplateAcesso {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  badge: string;
  permissoesPadrao: Record<string, NivelAcesso>;
}

export const TEMPLATES_ACESSO: TemplateAcesso[] = [
  {
    id: 'modo_smart_exclusivo',
    nome: 'Operador Chão de Fábrica (Modo Smart)',
    descricao: 'Acesso 100% restrito ao Modo Smart touch. Não enxerga nenhum menu corporativo do ERP.',
    icone: 'Factory',
    badge: 'Chão de Fábrica',
    permissoesPadrao: {
      'modo-smart': 'visualizar',
      'smart-apontamento': 'criar', // pode apontar produção
      'smart-metricas': 'visualizar', // pode ver suas métricas
      'smart-pdf': 'criar', // pode gerar checklist/PDF
    },
  },
  {
    id: 'pcp_planejamento',
    nome: 'PCP & Planejamento Industrial',
    descricao: 'Acesso completo à Mesa Tática do PCP, Dashboards, Cronogramas, OFs e Visualizador 3D.',
    icone: 'Layers',
    badge: 'Planejamento',
    permissoesPadrao: {
      'producao-pcp': 'criar',
      'producao-dashboard': 'visualizar',
      'diario-producao': 'visualizar',
      'prioridades-fabricacao': 'criar',
      'visualizador-3d': 'visualizar',
      'ofs-lista': 'criar',
      'ofs-cronograma': 'criar',
      'cadastro-pecas': 'criar',
      'modo-smart': 'visualizar',
    },
  },
  {
    id: 'expedicao_logistica',
    nome: 'Expedição & Almoxarifado',
    descricao: 'Controle de romaneios, pesagens, expedição de peças e solicitações de compras.',
    icone: 'Truck',
    badge: 'Logística',
    permissoesPadrao: {
      'expedicao': 'criar',
      'estoque': 'criar',
      'estoque-solicitacao-compras': 'criar',
      'modo-smart': 'visualizar',
    },
  },
  {
    id: 'fiscal_obra',
    nome: 'Fiscal de Obra & Montagem',
    descricao: 'Acompanhamento do canteiro de obras, romaneios recebidos e Modo Smart de montagem.',
    icone: 'HardHat',
    badge: 'Obra',
    permissoesPadrao: {
      'obra-dashboard': 'visualizar',
      'obra-configuracoes': 'visualizar',
      'visualizador-3d': 'visualizar',
      'modo-smart': 'visualizar',
    },
  },
  {
    id: 'administrador_total',
    nome: 'Administrador / Gestor Total',
    descricao: 'Acesso irrestrito com criação e edição em todas as telas e configurações.',
    icone: 'Crown',
    badge: 'Controle Total',
    permissoesPadrao: GRUPOS_MODULOS.flatMap((g) => g.recursos).reduce((acc, r) => {
      acc[r.key] = 'criar';
      return acc;
    }, {} as Record<string, NivelAcesso>),
  },
];

export const useMatrizAcessos = () => {
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<UsuarioMatriz[]>([]);
  const [usuarioSimuladoId, setUsuarioSimuladoId] = useState<string | null>(null);

  const carregarDados = async () => {
    try {
      setLoading(true);

      // 1. Carregar profiles com functions e privileges
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          status,
          privilege_id,
          function_id,
          profile_image_url,
          privileges:privilege_id (
            id,
            name
          ),
          user_functions:function_id (
            id,
            name
          )
        `)
        .order('full_name', { ascending: true });

      if (profError) throw profError;

      // 2. Carregar recursos específicos diretos por usuário (user_interface_permissions)
      const { data: userInterfacePerms } = await supabase
        .from('user_interface_permissions')
        .select('user_id, resource_key, permission');

      // Indexar por user_id -> resource_key -> permission
      const userPermsMap: Record<string, Record<string, string>> = {};
      (userInterfacePerms || []).forEach((uip: any) => {
        if (!userPermsMap[uip.user_id]) userPermsMap[uip.user_id] = {};
        userPermsMap[uip.user_id][uip.resource_key] = uip.permission;
      });

      // 3. Carregar recursos por privilégio como fallback
      const { data: privResources } = await supabase
        .from('privilege_interface_resources')
        .select('privilege_id, resource_key');

      const recursosPorPrivilege: Record<string, Set<string>> = {};
      (privResources || []).forEach((pr: any) => {
        if (!recursosPorPrivilege[pr.privilege_id]) {
          recursosPorPrivilege[pr.privilege_id] = new Set();
        }
        recursosPorPrivilege[pr.privilege_id].add(pr.resource_key);
      });

      // Mapear usuários para a Matriz
      const mapped: UsuarioMatriz[] = (profiles || []).map((p: any) => {
        const privId = p.privilege_id;
        const privNome = p.privileges?.name || 'Padrão';
        const isAdmin = privNome.toLowerCase().includes('admin');
        const recursosSet = privId && recursosPorPrivilege[privId]
          ? recursosPorPrivilege[privId]
          : new Set<string>();

        const directPerms = userPermsMap[p.id] || {};

        const permissoesMap: Record<string, NivelAcesso> = {};

        GRUPOS_MODULOS.forEach((g) => {
          g.recursos.forEach((r) => {
            if (directPerms[r.key]) {
              // Prioridade 1: Permissão direta do usuário configurada na Matriz
              const perm = directPerms[r.key];
              if (perm === 'can_create_update_delete' || perm === 'can_admin' || perm === 'can_create_only') {
                permissoesMap[r.key] = 'criar';
              } else if (perm === 'can_view_only') {
                permissoesMap[r.key] = 'visualizar';
              } else {
                permissoesMap[r.key] = 'nenhum';
              }
            } else if (isAdmin) {
              // Se for admin e não tiver sobreposição direta, padrão é criar
              permissoesMap[r.key] = 'criar';
            } else if (recursosSet.has(`${r.key}:edit`) || recursosSet.has(`${r.key}_edit`)) {
              permissoesMap[r.key] = 'criar';
            } else if (recursosSet.has(r.key)) {
              permissoesMap[r.key] = 'visualizar';
            } else {
              permissoesMap[r.key] = 'nenhum';
            }
          });
        });

        return {
          id: p.id,
          email: p.email || '',
          fullName: p.full_name || p.email?.split('@')[0] || 'Usuário',
          status: p.status || 'active',
          privilegeId: privId,
          privilegeName: privNome,
          functionId: p.function_id,
          functionName: p.user_functions?.name || 'Sem Cargo',
          profileImageUrl: p.profile_image_url,
          permissoesMap,
        };
      });

      setUsuarios(mapped);
    } catch (err: any) {
      console.error('Erro ao carregar dados da matriz de acessos:', err);
      toast.error('Erro ao carregar dados de usuários e permissões.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // LÓGICA SOLICITADA PELO USUÁRIO PARA BOTÕES V E C:
  // - Clicar em V (Visualizar):
  //    * Se o nível atual for 'criar' -> rebaixa para 'visualizar' (desativa o C)
  //    * Se o nível atual for 'visualizar' -> desativa ambos ('nenhum')
  //    * Se o nível atual for 'nenhum' -> ativa 'visualizar' (V verde, C desativado)
  // - Clicar em C (Criar/Editar):
  //    * Se o nível for 'nenhum' ou 'visualizar' -> ativa 'criar' (ambos V e C ficam verdes!)
  //    * Se o nível já for 'criar' -> desliga C (rebaixa para 'visualizar')
  const toggleNivel = async (userId: string, resourceKey: string, tipo: 'V' | 'C') => {
    const user = usuarios.find((u) => u.id === userId);
    if (!user) return;

    const nivelAtual = user.permissoesMap[resourceKey] || 'nenhum';
    let novoNivel: NivelAcesso = 'nenhum';

    if (tipo === 'V') {
      if (nivelAtual === 'criar') {
        novoNivel = 'visualizar'; // desativa o C
      } else if (nivelAtual === 'visualizar') {
        novoNivel = 'nenhum'; // desliga ambos
      } else {
        novoNivel = 'visualizar'; // liga V
      }
    } else {
      // tipo === 'C'
      if (nivelAtual === 'criar') {
        novoNivel = 'visualizar'; // desliga C mantendo V
      } else {
        novoNivel = 'criar'; // ativa C e V juntos!
      }
    }

    // Atualização otimista imediata na tela
    const novoMap = { ...user.permissoesMap, [resourceKey]: novoNivel };
    setUsuarios((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, permissoesMap: novoMap } : u))
    );

    try {
      // Garantir que a chave do recurso exista em interface_resources para evitar erro de Foreign Key
      const { error: resourceError } = await supabase
        .from('interface_resources')
        .upsert(
          { 
            resource_key: resourceKey, 
            resource_name: resourceKey, 
            is_submenu: false 
          }, 
          { onConflict: 'resource_key' }
        );

      if (resourceError) {
        console.error('Erro ao registrar recurso na tabela interface_resources:', resourceError);
      }

      // 1. Gravação direta e individual por usuário na tabela user_interface_permissions (Prioridade Máxima)
      const dbPermission =
        novoNivel === 'criar'
          ? 'can_create_update_delete'
          : novoNivel === 'visualizar'
            ? 'can_view_only'
            : 'no_access';

      const { error: uipError } = await supabase
        .from('user_interface_permissions')
        .upsert(
          {
            user_id: userId,
            resource_key: resourceKey,
            permission: dbPermission as any,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,resource_key' }
        );

      if (uipError) {
        console.error('Erro ao salvar em user_interface_permissions:', uipError);
        throw uipError;
      }

      const desc = {
        nenhum: 'Bloqueado (✕)',
        visualizar: 'Apenas Visualização [V]',
        criar: 'Criação e Edição Total [V + C]',
      }[novoNivel];

      toast.success(`${resourceKey}: ${desc} para ${user.fullName}`);
    } catch (err) {
      console.error('Erro ao atualizar nível de permissão:', err);
      toast.error('Erro ao salvar alteração no banco.');
      carregarDados();
    }
  };

  // APLICAR TEMPLATE PRÉ-CONFIGURADO EM 1 CLIQUE
  const aplicarTemplate = async (userId: string, templateId: string) => {
    const user = usuarios.find((u) => u.id === userId);
    const template = TEMPLATES_ACESSO.find((t) => t.id === templateId);
    if (!user || !template) return;

    const novoMap: Record<string, NivelAcesso> = {};
    GRUPOS_MODULOS.forEach((g) => {
      g.recursos.forEach((r) => {
        novoMap[r.key] = template.permissoesPadrao[r.key] || 'nenhum';
      });
    });

    // Atualização otimista
    setUsuarios((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, permissoesMap: novoMap } : u))
    );

    try {
      // Garantir que todos os recursos do template existam em interface_resources
      const resourceRecords = Object.keys(novoMap).map(resKey => ({
        resource_key: resKey,
        resource_name: resKey,
        is_submenu: false
      }));

      const { error: resourceError } = await supabase
        .from('interface_resources')
        .upsert(resourceRecords, { onConflict: 'resource_key' });

      if (resourceError) {
        console.error('Erro ao registrar recursos na tabela interface_resources:', resourceError);
      }

      // 1. Gravação direta em lote na tabela user_interface_permissions
      const uipRecords = Object.entries(novoMap).map(([resKey, nivel]) => ({
        user_id: userId,
        resource_key: resKey,
        permission: (nivel === 'criar'
          ? 'can_create_update_delete'
          : nivel === 'visualizar'
            ? 'can_view_only'
            : 'no_access') as any,
        updated_at: new Date().toISOString(),
      }));

      const { error: batchError } = await supabase
        .from('user_interface_permissions')
        .upsert(uipRecords, { onConflict: 'user_id,resource_key' });

      if (batchError) {
        console.error('Erro no batch upsert em user_interface_permissions:', batchError);
        throw batchError;
      }

      toast.success(`Template '${template.nome}' aplicado com sucesso a ${user.fullName}!`);
    } catch (err) {
      console.error('Erro ao aplicar template:', err);
      toast.error('Erro ao salvar template.');
      carregarDados();
    }
  };

  // Usuário sendo simulado atualmente (para o visualizador "Ver como este usuário")
  const usuarioSimulado = useMemo(() => {
    return usuarios.find((u) => u.id === usuarioSimuladoId) || null;
  }, [usuarios, usuarioSimuladoId]);

  return {
    loading,
    usuarios,
    gruposModulos: GRUPOS_MODULOS,
    templates: TEMPLATES_ACESSO,
    usuarioSimulado,
    usuarioSimuladoId,
    setUsuarioSimuladoId,
    toggleNivel,
    aplicarTemplate,
    recarregar: carregarDados,
  };
};
