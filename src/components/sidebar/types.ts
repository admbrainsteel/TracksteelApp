
import { LucideIcon } from 'lucide-react';

export interface MenuItem {
  title: string;
  url?: string;
  icon?: LucideIcon; // Make icon optional to support subItems without icons
  key: string;
  subItems?: MenuItem[];
  requiresSpecialPermission?: boolean; // Nova propriedade para menus que precisam de permissão especial
}

export interface MenuGroup {
  id: string;
  name: string;
  color: string;
  items: MenuItem[];
}
