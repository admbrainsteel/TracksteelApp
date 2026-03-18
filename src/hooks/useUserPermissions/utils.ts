
import { VALID_FUNCTIONAL_PERMISSIONS, UserPermissions } from './types';

// Function to clean permissions and keep only valid functional ones
export const cleanPermissions = (permissions: any): UserPermissions => {
  if (!permissions || typeof permissions !== 'object') {
    return { 
      can_admin: false,
      can_create_update_delete: false,
      can_create_only: false,
      can_view_only: true // Default
    };
  }

  const cleanedPermissions: UserPermissions = {
    can_admin: false,
    can_create_update_delete: false,
    can_create_only: false,
    can_view_only: false
  };
  
  // Maintain only valid functional permissions
  VALID_FUNCTIONAL_PERMISSIONS.forEach(perm => {
    if (permissions.hasOwnProperty(perm)) {
      cleanedPermissions[perm] = Boolean(permissions[perm]);
    }
  });
  
  // If no valid permission was found, set default
  const hasAnyValidPermission = Object.values(cleanedPermissions).some(Boolean);
  if (!hasAnyValidPermission) {
    cleanedPermissions.can_view_only = true;
  }
  
  console.log('🧹 Cleaned permissions:', { original: permissions, cleaned: cleanedPermissions });
  return cleanedPermissions;
};
