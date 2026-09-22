
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from "lucide-react";
import { SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MenuItem } from './types';

interface SidebarMenuItemProps {
  item: MenuItem;
  isActive: (url: string) => boolean;
  canAccessItem: (itemKey: string) => boolean;
  isAdmin: boolean;
  openGroups: { [key: string]: boolean };
  onSubmenuToggle: (itemKey: string, currentState: boolean) => void;
  onMenuItemClick: (hasSubItems?: boolean) => void;
  getIconProps: (itemKey?: string) => any;
}

export const AppSidebarMenuItem: React.FC<SidebarMenuItemProps> = ({
  item,
  isActive,
  canAccessItem,
  isAdmin,
  openGroups,
  onSubmenuToggle,
  onMenuItemClick,
  getIconProps
}) => {
  const canAccess = canAccessItem(item.key);
  
  if (!canAccess && !isAdmin) {
    return null; // Don't show item if no access
  }

  // Filtrar subitens permitidos para o usuário logado
  const subItemsPermitidos = (item.subItems || []).filter((subItem) => {
    if (subItem.url === "/admin/theme-customization" && !isAdmin) {
      return false;
    }
    return isAdmin || canAccessItem(subItem.key);
  });

  // Se o item for apenas um agrupador de subitens e todos estiverem bloqueados, não renderizar o agrupador
  if (item.subItems && item.subItems.length > 0 && subItemsPermitidos.length === 0 && !isAdmin) {
    return null;
  }
  
  return (
    <SidebarMenuItem key={item.key || item.title}>
      {item.subItems && item.subItems.length > 0 ? (
        <Collapsible 
          open={openGroups[item.key] || false}
          onOpenChange={(open) => onSubmenuToggle(item.key, openGroups[item.key] || false)}
        >
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="w-full justify-between">
              <div className="flex items-center">
                {item.icon && <item.icon {...getIconProps(item.key)} />}
                <span>{item.title}</span>
              </div>
              <ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {subItemsPermitidos.map((subItem) => (
                <SidebarMenuSubItem key={subItem.key || subItem.title}>
                  <SidebarMenuSubButton 
                    asChild
                    isActive={isActive(subItem.url)}
                  >
                    <Link 
                      to={subItem.url}
                      onClick={() => onMenuItemClick(false)}
                    >
                      {subItem.icon && <subItem.icon className="mr-2 h-4 w-4" />}
                      <span>{subItem.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <SidebarMenuButton 
          asChild
          isActive={isActive(item.url || '#')}
        >
          <Link 
            to={item.url || '#'}
            onClick={() => onMenuItemClick(false)}
          >
            {item.icon && <item.icon {...getIconProps(item.key)} />}
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      )}
    </SidebarMenuItem>
  );
};
