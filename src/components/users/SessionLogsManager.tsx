
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, BarChart3, Users, Clock, Activity, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSessionLogs } from '@/hooks/useSessionLogs';
import { UserProfile } from '@/hooks/useUserManagement';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { toast } from 'sonner';

interface SessionLogsManagerProps {
  users: UserProfile[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function SessionLogsManager({ users }: SessionLogsManagerProps) {
  const { 
    sessionLogs, 
    sessionStats, 
    loading, 
    fetchSessionLogs, 
    fetchSessionStats, 
    exportReport 
  } = useSessionLogs();

  const [filters, setFilters] = useState({
    userId: '',
    period: 'week' as 'day' | 'week' | 'month',
    startDate: '',
    endDate: ''
  });

  const [activeView, setActiveView] = useState<'logs' | 'dashboard'>('logs');

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchSessionLogs();
        await fetchSessionStats({ period: filters.period });
      } catch (error) {
        console.error('Erro ao carregar dados dos logs de sessão:', error);
        toast.error('Erro ao carregar logs de sessão');
      }
    };

    loadData();
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = async () => {
    try {
      const filterParams = {
        userId: filters.userId || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      };
      
      await fetchSessionLogs(filterParams);
      await fetchSessionStats({ 
        userId: filters.userId || undefined, 
        period: filters.period 
      });
      
      toast.success('Filtros aplicados com sucesso');
    } catch (error) {
      console.error('Erro ao aplicar filtros:', error);
      toast.error('Erro ao aplicar filtros');
    }
  };

  const resetFilters = async () => {
    try {
      setFilters({
        userId: '',
        period: 'week',
        startDate: '',
        endDate: ''
      });
      await fetchSessionLogs();
      await fetchSessionStats({ period: 'week' });
      toast.success('Filtros limpos com sucesso');
    } catch (error) {
      console.error('Erro ao limpar filtros:', error);
      toast.error('Erro ao limpar filtros');
    }
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

  // Dados para gráficos
  const getDashboardData = () => {
    if (!sessionLogs.length) {
      return { userSessions: [], dailyActivity: [], timeRangeData: [] };
    }

    // Sessões por usuário
    const userSessions = users.map(user => {
      const userLogs = sessionLogs.filter(log => log.user_id === user.id);
      return {
        name: user.full_name?.split(' ')[0] || user.email.split('@')[0],
        sessions: userLogs.length,
        totalTime: userLogs.reduce((acc, log) => acc + (log.duration_minutes || 0), 0)
      };
    }).filter(data => data.sessions > 0);

    // Atividade por dia (últimos 7 dias)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyActivity = last7Days.map(date => {
      const dayLogs = sessionLogs.filter(log => 
        log.session_start.split('T')[0] === date
      );
      return {
        date: format(new Date(date), 'dd/MM', { locale: ptBR }),
        sessions: dayLogs.length,
        users: new Set(dayLogs.map(log => log.user_id)).size
      };
    });

    // Duração média por período do dia
    const timeRanges = [
      { name: 'Manhã (6-12h)', start: 6, end: 12 },
      { name: 'Tarde (12-18h)', start: 12, end: 18 },
      { name: 'Noite (18-24h)', start: 18, end: 24 },
      { name: 'Madrugada (0-6h)', start: 0, end: 6 }
    ];

    const timeRangeData = timeRanges.map(range => {
      const rangeLogs = sessionLogs.filter(log => {
        const hour = new Date(log.session_start).getHours();
        return hour >= range.start && hour < range.end;
      });
      const avgDuration = rangeLogs.length > 0 
        ? rangeLogs.reduce((acc, log) => acc + (log.duration_minutes || 0), 0) / rangeLogs.length
        : 0;
      
      return {
        name: range.name,
        avgDuration: Math.round(avgDuration),
        sessions: rangeLogs.length
      };
    });

    return { userSessions, dailyActivity, timeRangeData };
  };

  const { userSessions, dailyActivity, timeRangeData } = getDashboardData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando logs de sessão...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Usuários</p>
                <p className="text-2xl font-bold">{sessionStats?.total_users || 0}</p>
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
                <p className="text-2xl font-bold">{sessionStats?.active_sessions || 0}</p>
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
                <p className="text-2xl font-bold">{sessionStats?.total_sessions || 0}</p>
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
                <p className="text-2xl font-bold">{formatDuration(sessionStats?.average_duration || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navegação entre Views */}
      <div className="flex space-x-2">
        <Button 
          variant={activeView === 'logs' ? 'default' : 'outline'}
          onClick={() => setActiveView('logs')}
        >
          <FileText className="h-4 w-4 mr-2" />
          Logs de Sessão
        </Button>
        <Button 
          variant={activeView === 'dashboard' ? 'default' : 'outline'}
          onClick={() => setActiveView('dashboard')}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Dashboard
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="user-select">Usuário</Label>
              <Select value={filters.userId} onValueChange={(value) => handleFilterChange('userId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os usuários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os usuários</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="period-select">Período</Label>
              <Select value={filters.period} onValueChange={(value) => handleFilterChange('period', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Último dia</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
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
              <Button onClick={applyFilters}>Aplicar</Button>
              <Button variant="outline" onClick={resetFilters}>Limpar</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões de Exportação */}
      <div className="flex space-x-2">
        <Button 
          variant="outline" 
          onClick={() => exportReport('csv', {
            userId: filters.userId || undefined,
            startDate: filters.startDate || undefined,
            endDate: filters.endDate || undefined
          })}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
        <Button 
          variant="outline"
          onClick={() => exportReport('json', {
            userId: filters.userId || undefined,
            startDate: filters.startDate || undefined,
            endDate: filters.endDate || undefined
          })}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar JSON
        </Button>
      </div>

      {/* Conteúdo Principal */}
      {activeView === 'logs' ? (
        // Tabela de Logs
        <Card>
          <CardHeader>
            <CardTitle>Logs de Sessão</CardTitle>
          </CardHeader>
          <CardContent>
            {sessionLogs.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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
                      <TableHead>User Agent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{getUserName(log.user_id)}</TableCell>
                        <TableCell>
                          {format(new Date(log.session_start), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {log.session_end 
                            ? format(new Date(log.session_end), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                            : '-'
                          }
                        </TableCell>
                        <TableCell>{formatDuration(log.duration_minutes)}</TableCell>
                        <TableCell>
                          <Badge variant={log.is_active ? 'default' : 'secondary'}>
                            {log.is_active ? 'Ativa' : 'Finalizada'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {log.user_agent}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // Dashboard com Gráficos
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sessões por Usuário */}
          <Card>
            <CardHeader>
              <CardTitle>Sessões por Usuário</CardTitle>
            </CardHeader>
            <CardContent>
              {userSessions.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={userSessions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="sessions" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Atividade Diária */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade dos Últimos 7 Dias</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="sessions" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="users" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tempo por Usuário */}
          <Card>
            <CardHeader>
              <CardTitle>Tempo Total por Usuário</CardTitle>
            </CardHeader>
            <CardContent>
              {userSessions.length > 0 && userSessions.some(u => u.totalTime > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={userSessions.filter(u => u.totalTime > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, totalTime }) => `${name}: ${formatDuration(totalTime)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalTime"
                    >
                      {userSessions.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatDuration(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Atividade por Período do Dia */}
          <Card>
            <CardHeader>
              <CardTitle>Duração Média por Período</CardTitle>
            </CardHeader>
            <CardContent>
              {timeRangeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timeRangeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value} min`} />
                    <Bar dataKey="avgDuration" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
