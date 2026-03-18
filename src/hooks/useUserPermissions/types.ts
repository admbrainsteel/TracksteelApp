
import { Database } from "@/integrations/supabase/types";

export type Profiles = Database['public']['Tables']['profiles']['Row']

// Permission level type - incluindo 'no_access'
export type PermissionLevel = 'can_admin' | 'can_create_update_delete' | 'can_create_only' | 'can_view_only' | 'no_access';

// User permissions interface
export interface UserPermissions {
  can_admin: boolean;
  can_create_update_delete: boolean;
  can_create_only: boolean;
  can_view_only: boolean;
}

// Action types for permission checking
export type ActionType = 'create' | 'read' | 'update' | 'delete' | 'admin';

// Resource key type for identifying different system resources
export type ResourceKey = string;

// Functional permission type
export type FunctionalPermission = keyof UserPermissions;

// User role types
export type UserRole = 'admin' | 'gerencia' | 'diretoria' | 'user';
export type AppRole = UserRole;

// Resource permission interface
export interface ResourcePermission {
  resource_key: string;
  permission_level: PermissionLevel;
}

// User interface permission interface
export interface UserInterfacePermission {
  user_id: string;
  resource_key: string;
  permission_level: PermissionLevel;
  created_at: string;
  updated_at: string;
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

// User with permissions interface (simplified without non-existent tables)
export interface UserWithPermissions extends Profiles {
  permissions?: {
    permission_level: PermissionLevel;
  }[];
}

// Valid functional permissions constant
export const VALID_FUNCTIONAL_PERMISSIONS: FunctionalPermission[] = [
  'can_admin',
  'can_create_update_delete', 
  'can_create_only',
  'can_view_only'
];
