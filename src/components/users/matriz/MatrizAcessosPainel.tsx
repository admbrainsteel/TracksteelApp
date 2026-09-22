import React, { useState } from 'react';
import { useMatrizAcessos, UsuarioMatriz } from '@/hooks/useMatrizAcessos';
import { MatrizGrid } from './MatrizGrid';
import { MatrizTemplatesModal } from './MatrizTemplatesModal';
import { SimuladorVisaoBar } from './SimuladorVisaoBar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, RefreshCw, Users, Shield, Factory, Sparkles } from 'lucide-react';

interface MatrizAcessosPainelProps {
  onOpenNovoUsuario?: () => void;
}

export const MatrizAcessosPainel: React.FC<MatrizAcessosPainelProps> = ({
  onOpenNovoUsuario,
}) => {
  const {
    loading,
    usuarios,
    gruposModulos,
    usuarioSimuladoId,
    setUsuarioSimuladoId,
    togglePermissao,
    aplicarTemplate,
    recarregar,
  } = useMatrizAcessos();

  const [busca, setBusca] = useState('');
  const [selectedUserForTemplate, setSelectedUserForTemplate] = useState<UsuarioMatriz | null>(null);

  // Filtragem por nome, email ou cargo
  const usuariosFiltrados = usuarios.filter((u) => {
    const termo = busca.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(termo) ||
      u.email.toLowerCase().includes(termo) ||
      u.functionName.toLowerCase().includes(termo)
    );
  });

  // Métricas rápidas
  const totalUsuarios = usuarios.length;
  const totalSmartExclusivo = usuarios.filter(
    (u) => u.recursosPermitidos.has('modo-smart') && u.recursosPermitidos.size <= 4
  ).length;
  const totalAdmins = usuarios.filter((u) =>
    u.privilegeName.toLowerCase().includes('admin')
  ).length;

  return (
    <div className="space-y-4">
      {/* 1. CARDS DE RESUMO RÁPIDO DO ACESSO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-3.5 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground">Total de Usuários</span>
            <p className="text-xl font-bold text-foreground">{totalUsuarios}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground">Operadores Modo Smart</span>
            <p className="text-xl font-bold text-emerald-400">{totalSmartExclusivo}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Factory className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground">Administradores</span>
            <p className="text-xl font-bold text-rose-400">{totalAdmins}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
            <Shield className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 2. SIMULADOR DE VISÃO */}
      <SimuladorVisaoBar
        usuarios={usuarios}
        grupos={gruposModulos}
        usuarioSimuladoId={usuarioSimuladoId}
        onSelectUsuarioSimulado={setUsuarioSimuladoId}
      />

      {/* 3. BARRA DE CONTROLE E BUSCA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border rounded-xl p-3">
        <div className="relative w-full sm:w-[320px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por colaborador, email ou cargo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8 text-xs h-9 bg-background"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={recarregar}
            disabled={loading}
            className="text-xs h-9 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          {onOpenNovoUsuario && (
            <Button
              size="sm"
              onClick={onOpenNovoUsuario}
              className="text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              + Novo Usuário
            </Button>
          )}
        </div>
      </div>

      {/* 4. A GRADE INTERATIVA (MATRIZ) */}
      {loading ? (
        <div className="py-16 text-center text-xs text-muted-foreground">
          Carregando matriz de permissões e usuários...
        </div>
      ) : (
        <MatrizGrid
          usuarios={usuariosFiltrados}
          grupos={gruposModulos}
          onTogglePermissao={togglePermissao}
          onOpenTemplates={(user) => setSelectedUserForTemplate(user)}
        />
      )}

      {/* 5. MODAL DE TEMPLATES RÁPIDOS */}
      <MatrizTemplatesModal
        user={selectedUserForTemplate}
        isOpen={Boolean(selectedUserForTemplate)}
        onClose={() => setSelectedUserForTemplate(null)}
        onSelectTemplate={aplicarTemplate}
      />
    </div>
  );
};
