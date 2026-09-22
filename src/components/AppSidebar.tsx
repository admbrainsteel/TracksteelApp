
import React, { useState, useMemo } from "react";
import { logger } from "@/utils/logger";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu } from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { useUserRole } from "@/hooks/useUserRole";
import { useIconStyle } from "@/hooks/useIconStyle";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Zap } from "lucide-react";
import { usePermissionControl } from "@/hooks/usePermissionControl";
import { menuGroups } from "./sidebar/menuConfig";
import { AppSidebarMenuItem } from "./sidebar/SidebarMenuItem";

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setOpenMobile } = useSidebar();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { iconStyle } = useIconStyle();
  const { hasAccess, loading: permissionsLoading, resourcePermissions } = useUserPermissions();
  const { canAccessTools, canInteractWithSpecialMenus } = usePermissionControl();
  const isMobile = useIsMobile();
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({
    'producao': true
  });

  // Handle mobile menu item click
  const handleMenuItemClick = (hasSubItems: boolean = false) => {
    if (isMobile && !hasSubItems) {
      setOpenMobile(false);
    }
  };

  // Handle submenu toggle
  const handleSubmenuToggle = (itemKey: string, currentState: boolean) => {
    setOpenGroups(prev => ({
      ...prev,
      [itemKey]: !currentState
    }));
  };
  
  const isActive = (url: string) => {
    if (url === "/dashboard" && location.pathname === "/") {
      return true;
    }
    return location.pathname === url;
  };

  const getIconProps = (itemKey?: string) => {
    const baseProps = { className: "mr-2 h-4 w-4" };
    
    // Mapeamento de cores específicas para cada ícone
    const iconColors: { [key: string]: string } = {
      'dashboard': '#3b82f6',        // azul
      'cadastro': '#10b981',         // verde
      'ferramentas': '#f59e0b',      // laranja
      'estoque': '#8b5cf6',          // roxo
      'ofs': '#eab308',              // amarelo
      'producao': '#ef4444',         // vermelho
      'painel-industrial': '#06b6d4', // ciano
      'expedicao': '#ec4899',        // rosa
      'obra': '#a3a3a3',            // marrom
      'tarefas': '#059669',          // verde escuro
      'biblioteca': '#1d4ed8',       // azul escuro
      'sistema': '#6b7280',          // cinza
      'sugestoes': '#7c3aed',        // violeta
      'atribuicoes': '#14b8a6',      // teal
      'mapa-interativo': '#6366f1',  // indigo
      'configuracoes': '#475569',    // slate
      'admin': '#dc2626',            // vermelho escuro
      'gerenciar-usuarios': '#e11d48' // vermelho médio
    };
    
    // Se temos uma cor específica para este ícone, aplicá-la
    if (itemKey && iconColors[itemKey]) {
      return { 
        ...baseProps, 
        style: { color: iconColors[itemKey] } 
      };
    }
    
    // Fallback para o comportamento original baseado no iconStyle
    switch (iconStyle) {
      case 'white':
        return { ...baseProps, className: `${baseProps.className} text-white` };
      case 'themed':
        return { ...baseProps, className: `${baseProps.className} text-primary` };
      case 'colorful':
        return { ...baseProps, style: { color: 'inherit' } };
      default:
        return baseProps;
    }
  };

  // Function to check if user can access an item
  const canAccessItem = (itemKey: string, requiresSpecialPermission?: boolean): boolean => {
    try {
      // Admin can always access everything
      if (isAdmin) return true;

      // Mapeamento de chave de menu/submenu da sidebar para resource_key do BD
      const itemToResourceMap: Record<string, string> = {
        'pcp': 'producao-pcp',
        'dashboard-producao': 'producao-dashboard',
        'apontamento-producao': 'producao-apontamento',
        'diario-producao': 'diario-producao',
        'prioridades-fabricacao': 'prioridades-fabricacao',
        'visao-geral': 'producao-visao',
        'visualizador-3d': 'visualizador-3d',
        'ordens-fabricacao': 'ofs-lista',
        'ficha-tecnica-of': 'cadastro-of',
        'cronograma': 'ofs-cronograma',
        'cadastro-pecas': 'cadastro-pecas',
        'equipamentos': 'equipamentos',
        'expedicao': 'expedicao',
        'estoque-main': 'estoque',
        'estoque': 'estoque',
        'solicitacao-compras': 'estoque-solicitacao-compras',
        'dashboard-obras': 'obra-dashboard',
        'configuracoes-obra': 'obra-configuracoes',
        'obra': 'obra-dashboard',
        'gerenciar-usuarios': 'user-management',
        'user-management': 'user-management',
        'configuracoes-gerais': 'configuracoes-gerais',
        'inconsistencias': 'ferramentas-inconsistencias',
        'ferramentas': 'ferramentas',
        'sistema': 'sistema',
        'sugestoes': 'sugestoes',
        'admin': 'admin',
        'dashboard': 'dashboard',
      };

      const resKey = itemToResourceMap[itemKey] || itemKey;

      // Se há restrição direta configurada no BD para este recurso
      if (resourcePermissions && resourcePermissions[resKey]) {
        return resourcePermissions[resKey] !== 'no_access';
      }

      // Se o usuário tem perfil de "apenas Smart" (tem modo-smart mas não tem esse recurso)
      const temAcessoSmart =
        resourcePermissions &&
        resourcePermissions['modo-smart'] &&
        resourcePermissions['modo-smart'] !== 'no_access';

      const permsCadastradas = Object.keys(resourcePermissions || {});
      const soTemSmart =
        temAcessoSmart &&
        permsCadastradas.length > 0 &&
        permsCadastradas.every(
          (k) => k.startsWith('smart') || k === 'modo-smart' || resourcePermissions[k] === 'no_access'
        );

      if (soTemSmart && !resKey.startsWith('smart') && resKey !== 'modo-smart') {
        return false;
      }
      
      // Se o item requer permissão especial, verificar permissões específicas
      if (requiresSpecialPermission) {
        if (itemKey === 'ferramentas') {
          return canAccessTools();
        }
        if (itemKey === 'tarefas' || itemKey === 'sistema' || itemKey === 'sugestoes') {
          return canInteractWithSpecialMenus();
        }
      }
      
      return hasAccess(resKey);
    } catch (error) {
      console.warn('Error checking item access:', error);
      return false;
    }
  };

  // Wait for permissions loading
  if (permissionsLoading || roleLoading) {
    return (
      <Sidebar>
        <SidebarContent>
          <div className="p-4 text-center text-slate-400">
            Carregando menu...
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  logger.debug('Renderizando sidebar', { 
    isAdmin, 
    hasBasicAccess: hasAccess(),
    canAccessTools: canAccessTools(),
    canInteractWithSpecialMenus: canInteractWithSpecialMenus()
  } as any);

  return (
    <Sidebar>
      <SidebarContent>
        {/* Banner de atalho para Modo Smart */}
        <div className="px-3 pt-3 pb-1">
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem('tracksteel_app_mode', 'smart');
              } catch {
                // ignore
              }
              if (isMobile) setOpenMobile(false);
              navigate('/smart');
            }}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/10 border border-amber-500/30 hover:border-amber-500/60 transition-all text-left group shadow-sm active:scale-[0.98]"
            title="Alternar para o Modo Smart (Chão de Fábrica Touch-First)"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <Zap className="h-4 w-4 fill-amber-500 group-hover:fill-white" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-600 dark:text-amber-400 tracking-wide uppercase">
                  Modo Smart
                </div>
                <div className="text-[11px] text-muted-foreground leading-tight">
                  Chão de Fábrica Touch
                </div>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300">
              RÁPIDO
            </span>
          </button>
        </div>

        {menuGroups.map(group => {
          // Filter admin groups for non-admin users
          if (!isAdmin && group.name === 'Administração') {
            logger.debug('Ocultando grupo admin para usuário não-admin');
            return null;
          }

          // Skip groups with no items
          if (!group.items || group.items.length === 0) {
            return null;
          }

          return (
            <SidebarGroup key={group.id}>
              <SidebarGroupLabel 
                style={{ color: group.color }}
                className="text-base font-semibold uppercase tracking-wide"
              >
                {group.name}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <AppSidebarMenuItem
                      key={item.key || item.title}
                      item={item}
                      isActive={isActive}
                      canAccessItem={(itemKey) => canAccessItem(itemKey, item.requiresSpecialPermission)}
                      isAdmin={isAdmin}
                      openGroups={openGroups}
                      onSubmenuToggle={handleSubmenuToggle}
                      onMenuItemClick={handleMenuItemClick}
                      getIconProps={(itemKey) => getIconProps(itemKey)}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
