
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Users } from 'lucide-react';
import { useSessionLogsSimple } from '@/hooks/useSessionLogsSimple';

export function OnlineUsers() {
  const { onlineUsers, fetchOnlineUsers } = useSessionLogsSimple();

  React.useEffect(() => {
    fetchOnlineUsers();
    const interval = setInterval(fetchOnlineUsers, 30000); // Atualizar a cada 30 segundos
    return () => clearInterval(interval);
  }, [fetchOnlineUsers]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="w-4 h-4" />
          Usuários Online ({onlineUsers.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {onlineUsers.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum usuário online</p>
        ) : (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {onlineUsers.map((user) => (
              <div key={user.user_id} className="flex items-center space-x-2">
                <UserAvatar 
                  imageUrl={user.avatar_url || undefined} 
                  name={user.full_name || user.email} 
                  email={user.email} 
                  size="sm" 
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {user.full_name || 'Usuário'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
