
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle, XCircle, X } from 'lucide-react';
import { useSugestoes, SugestaoNotification } from '@/hooks/useSugestoes';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const NotificationsSugestoes: React.FC = () => {
  const { notifications, markNotificationAsRead } = useSugestoes();

  if (notifications.length === 0) {
    return null;
  }

  const getNotificationIcon = (message: string) => {
    if (message.includes('implementada')) {
      return <CheckCircle className="h-4 w-4 text-green-400" />;
    }
    if (message.includes('rejeitada')) {
      return <XCircle className="h-4 w-4 text-red-400" />;
    }
    return <Bell className="h-4 w-4 text-blue-400" />;
  };

  const getNotificationColor = (message: string) => {
    if (message.includes('implementada')) {
      return 'bg-green-900/10 border-green-400/20';
    }
    if (message.includes('rejeitada')) {
      return 'bg-red-900/10 border-red-400/20';
    }
    return 'bg-blue-900/10 border-blue-400/20';
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5" />
          Notificações de Sugestões
          <Badge variant="outline" className="text-xs">
            {notifications.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-3 rounded-lg border ${getNotificationColor(notification.message)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {getNotificationIcon(notification.message)}
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">
                    {notification.message}
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    {format(parseISO(notification.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markNotificationAsRead(notification.id)}
                className="h-6 w-6 p-0 text-slate-400 hover:text-white"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default NotificationsSugestoes;
