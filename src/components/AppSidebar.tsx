
import React, { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu } from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { useUserRole } from "@/hooks/useUserRole";
import { useIconStyle } from "@/hooks/useIconStyle";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { usePermissionControl } from "@/hooks/usePermissionControl";
import { menuGroups } from "./sidebar/menuConfig";
import { AppSidebarMenuItem } from "./sidebar/SidebarMenuItem";

export function AppSidebar() {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { iconStyle } = useIconStyle();
  const { hasAccess, loading: permissionsLoading } = useUserPermissions();
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
      
      // Se o item requer permissão especial, verificar permissões específicas
      if (requiresSpecialPermission) {
        if (itemKey === 'ferramentas') {
          return canAccessTools();
        }
        if (itemKey === 'tarefas' || itemKey === 'sistema' || itemKey === 'sugestoes') {
          return canInteractWithSpecialMenus();
        }
      }
      
      // Users with any functional permission can see most menus
      // Restriction will be applied in the pages/components themselves
      return hasAccess();
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

  console.log('🖥️ Rendering sidebar with:', { 
    isAdmin, 
    hasBasicAccess: hasAccess(),
    canAccessTools: canAccessTools(),
    canInteractWithSpecialMenus: canInteractWithSpecialMenus()
  });

  return (
    <Sidebar>
      <SidebarContent>
        {menuGroups.map(group => {
          // Filter admin groups for non-admin users
          if (!isAdmin && group.name === 'Administração') {
            console.log('🚫 Hiding admin group for non-admin user');
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
