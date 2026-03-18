
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit } from 'lucide-react';
import { Privilege, FUNCTIONAL_PERMISSIONS } from './types';

interface PrivilegeCardProps {
  privilege: Privilege;
  onEdit: (privilege: Privilege) => void;
  onDelete: (id: string) => void;
}

export const PrivilegeCard: React.FC<PrivilegeCardProps> = ({
  privilege,
  onEdit,
  onDelete
}) => {
  const getFunctionalPermissionCount = (privilege: Privilege) => {
    if (!privilege.permissions) return 0;
    
    // Count only valid functional permissions
    const validPermissions = FUNCTIONAL_PERMISSIONS.map(p => p.key);
    return validPermissions.filter(key => privilege.permissions[key]).length;
  };

  const getActiveFunctionalPermissions = (privilege: Privilege) => {
    if (!privilege.permissions) return [];
    
    // Show only valid functional permissions
    return FUNCTIONAL_PERMISSIONS
      .filter(perm => privilege.permissions[perm.key])
      .map(perm => perm.label);
  };

  const functionalCount = getFunctionalPermissionCount(privilege);
  const activeFunctionalPermissions = getActiveFunctionalPermissions(privilege);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="font-semibold">{privilege.name}</h4>
              <div className="flex gap-2">
                <Badge variant="secondary">
                  {functionalCount} permissão funcional
                </Badge>
              </div>
            </div>
            {privilege.description && (
              <p className="text-sm text-muted-foreground mb-2">
                {privilege.description}
              </p>
            )}
            <div className="flex flex-wrap gap-1">
              {activeFunctionalPermissions.map((permName) => (
                <Badge key={permName} variant="outline" className="text-xs">
                  {permName}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(privilege)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(privilege.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
