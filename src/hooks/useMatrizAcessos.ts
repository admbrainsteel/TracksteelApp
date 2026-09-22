import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  recursosPermitidos: Set<string>;
}

export interface GrupoRecurso {
  key: string;
  titulo: string;
  cor: string; // Ex: 'emerald', 'sky', 'indigo', 'amber', 'rose'
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
  recursosPermitidos: string[];
}

export const TEMPLATES_ACESSO: TemplateAcesso[] = [
  {
    id: 'modo_smart_exclusivo',
    nome: 'Operador Chão de Fábrica (Modo Smart)',
    descricao: 'Acesso 100% restrito ao Modo Smart touch. Não enxerga nenhum menu corporativo do ERP.',
    icone: 'Factory',
    badge: 'Chão de Fábrica',
    recursosPermitidos: [
      'modo-smart',
      'smart-apontamento',
      'smart-metricas',
      'smart-pdf',
    ],
  },
  {
    id: 'pcp_planejamento',
    nome: 'PCP & Planejamento Industrial',
    descricao: 'Acesso completo à Mesa Tática do PCP, Dashboards, Cronogramas, OFs e Visualizador 3D.',
    icone: 'Layers',
    badge: 'Planejamento',
    recursosPermitidos: [
      'producao-pcp',
      'producao-dashboard',
      'diario-producao',
      'prioridades-fabricacao',
      'visualizador-3d',
      'ofs-lista',
      'ofs-cronograma',
      'cadastro-pecas',
      'modo-smart',
    ],
  },
  {
    id: 'expedicao_logistica',
    nome: 'Expedição & Almoxarifado',
    descricao: 'Controle de romaneios, pesagens, expedição de peças e solicitações de compras.',
    icone: 'Truck',
    badge: 'Logística',
    recursosPermitidos: [
      'expedicao',
      'estoque',
      'estoque-solicitacao-compras',
      'modo-smart',
    ],
  },
  {
    id: 'fiscal_obra',
    nome: 'Fiscal de Obra & Montagem',
    descricao: 'Acompanhamento do canteiro de obras, romaneios recebidos e Modo Smart de montagem.',
    icone: 'HardHat',
    badge: 'Obra',
    recursosPermitidos: [
      'obra-dashboard',
      'obra-configuracoes',
      'visualizador-3d',
      'modo-smart',
    ],
  },
  {
    id: 'administrador_total',
    nome: 'Administrador / Gestor Total',
    descricao: 'Acesso irrestrito a todas as telas, configurações, usuários e ferramentas do sistema.',
    icone: 'Crown',
    badge: 'Controle Total',
    recursosPermitidos: GRUPOS_MODULOS.flatMap((g) => g.recursos.map((r) => r.key)),
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

      // 2. Carregar recursos por privilégio
      const { data: privResources, error: privResError } = await supabase
        .from('privilege_interface_resources')
        .select('privilege_id, resource_key');

      if (privResError) console.warn('Aviso ao carregar privilege_interface_resources:', privResError);

      // Indexar recursos por privilege_id
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
        const recursos = privId && recursosPorPrivilege[privId]
          ? new Set(recursosPorPrivilege[privId])
          : new Set<string>();

        // Se o privilégio tiver nome "Admin" ou similar, já inclui todos
        const privNome = p.privileges?.name || 'Padrão';
        if (privNome.toLowerCase().includes('admin')) {
          GRUPOS_MODULOS.forEach((g) => g.recursos.forEach((r) => recursos.add(r.key)));
        }

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
          recursosPermitidos: recursos,
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

  // TOGGLE DIRETO DE UMA PERMISSÃO NA MATRIZ
  const togglePermissao = async (userId: string, resourceKey: string) => {
    const user = usuarios.find((u) => u.id === userId);
    if (!user) return;

    const temAcesso = user.recursosPermitidos.has(resourceKey);
    const novoSet = new Set(user.recursosPermitidos);

    if (temAcesso) {
      novoSet.delete(resourceKey);
    } else {
      novoSet.add(resourceKey);
    }

    // Atualização otimista na tela
    setUsuarios((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, recursosPermitidos: novoSet } : u))
    );

    try {
      // Se o usuário tem privilege_id, salvar no banco
      if (user.privilegeId) {
        if (temAcesso) {
          // Remover
          await supabase
            .from('privilege_interface_resources')
            .delete()
            .eq('privilege_id', user.privilegeId)
            .eq('resource_key', resourceKey);
        } else {
          // Adicionar
          await supabase
            .from('privilege_interface_resources')
            .upsert(
              { privilege_id: user.privilegeId, resource_key: resourceKey },
              { onConflict: 'privilege_id,resource_key' }
            );
        }
      }
      toast.success(
        temAcesso
          ? `Módulo '${resourceKey}' bloqueado para ${user.fullName}.`
          : `Módulo '${resourceKey}' liberado para ${user.fullName}!`
      );
    } catch (err) {
      console.error('Erro ao atualizar permissão:', err);
      toast.error('Erro ao salvar alteração no banco.');
      carregarDados(); // Reverter se falhar
    }
  };

  // APLICAR TEMPLATE PRÉ-CONFIGURADO EM 1 CLIQUE
  const aplicarTemplate = async (userId: string, templateId: string) => {
    const user = usuarios.find((u) => u.id === userId);
    const template = TEMPLATES_ACESSO.find((t) => t.id === templateId);
    if (!user || !template) return;

    const novoSet = new Set(template.recursosPermitidos);

    // Atualização otimista
    setUsuarios((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, recursosPermitidos: novoSet } : u))
    );

    try {
      if (user.privilegeId) {
        // Limpar recursos atuais do privilégio
        await supabase
          .from('privilege_interface_resources')
          .delete()
          .eq('privilege_id', user.privilegeId);

        // Inserir os novos recursos do template
        const records = template.recursosPermitidos.map((resKey) => ({
          privilege_id: user.privilegeId,
          resource_key: resKey,
        }));

        if (records.length > 0) {
          await supabase.from('privilege_interface_resources').insert(records);
        }
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
    togglePermissao,
    aplicarTemplate,
    recarregar: carregarDados,
  };
};
