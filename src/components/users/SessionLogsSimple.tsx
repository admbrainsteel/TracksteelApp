
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Users, Activity, Clock, BarChart3, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSessionLogsSimple } from '@/hooks/useSessionLogsSimple';
import { UserProfile } from '@/hooks/useUserManagement';

interface SessionLogsSimpleProps {
  users: UserProfile[];
}

export function SessionLogsSimple({ users }: SessionLogsSimpleProps) {
  const { 
    sessionLogs, 
    onlineUsers, 
    loading, 
    fetchSessionLogs, 
    fetchOnlineUsers, 
    exportToCsv 
  } = useSessionLogsSimple();

  const [filters, setFilters] = useState({
    userId: '',
    startDate: '',
    endDate: ''
  });

  // Carregar dados iniciais
  useEffect(() => {
    fetchSessionLogs();
    fetchOnlineUsers();
    
    // Atualizar usuários online a cada 30 segundos
    const interval = setInterval(fetchOnlineUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    const filterParams = {
      userId: filters.userId || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined
    };
    fetchSessionLogs(filterParams);
  };

  const resetFilters = () => {
    setFilters({ userId: '', startDate: '', endDate: '' });
    fetchSessionLogs();
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || user?.email || 'Usuário desconhecido';
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '0min';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  // Estatísticas simples
  const stats = {
    totalSessions: sessionLogs.length,
    activeSessions: sessionLogs.filter(log => log.is_active).length,
    onlineUsers: onlineUsers.length,
    avgDuration: sessionLogs.length > 0 
      ? Math.round(sessionLogs.reduce((acc, log) => acc + (log.duration_minutes || 0), 0) / sessionLogs.length)
      : 0
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Usuários Online</p>
                <p className="text-2xl font-bold">{stats.onlineUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Sessões Ativas</p>
                <p className="text-2xl font-bold">{stats.activeSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Sessões</p>
                <p className="text-2xl font-bold">{stats.totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Duração Média</p>
                <p className="text-2xl font-bold">{formatDuration(stats.avgDuration)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usuários Online */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários Online Agora
            <Button
              variant="outline" 
              size="sm"
              onClick={fetchOnlineUsers}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {onlineUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhum usuário online no momento
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {onlineUsers.map((user) => (
                <div key={user.user_id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.full_name || user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Online desde {formatDate(user.session_start)}
                    </p>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="user-select">Usuário</Label>
              <Select value={filters.userId} onValueChange={(value) => handleFilterChange('userId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os usuários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="start-date">Data Início</Label>
              <Input
                id="start-date"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="end-date">Data Fim</Label>
              <Input
                id="end-date"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>

            <div className="flex items-end space-x-2">
              <Button onClick={applyFilters} disabled={loading}>
                {loading ? 'Carregando...' : 'Aplicar'}
              </Button>
              <Button variant="outline" onClick={resetFilters}>
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botão de Exportação */}
      <div className="flex space-x-2">
        <Button 
          variant="outline" 
          onClick={() => exportToCsv({
            userId: filters.userId === 'all' ? undefined : filters.userId || undefined,
            startDate: filters.startDate || undefined,
            endDate: filters.endDate || undefined
          })}
          disabled={loading}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Tabela de Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Sessões</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando logs...</p>
            </div>
          ) : sessionLogs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum log de sessão encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Início da Sessão</TableHead>
                    <TableHead>Fim da Sessão</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionLogs.slice(0, 50).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{getUserName(log.user_id)}</TableCell>
                      <TableCell>{formatDate(log.session_start)}</TableCell>
                      <TableCell>
                        {log.session_end ? formatDate(log.session_end) : '-'}
                      </TableCell>
                      <TableCell>{formatDuration(log.duration_minutes)}</TableCell>
                      <TableCell>
                        <Badge variant={log.is_active ? 'default' : 'secondary'}>
                          {log.is_active ? 'Ativa' : 'Finalizada'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {sessionLogs.length > 50 && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Mostrando os primeiros 50 registros de {sessionLogs.length} total
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
