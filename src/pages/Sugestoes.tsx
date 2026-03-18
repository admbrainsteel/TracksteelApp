import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, Clock, CheckCircle, XCircle, User, Calendar, History } from 'lucide-react';
import { useSugestoes } from '@/hooks/useSugestoes';
import { useUserRole } from '@/hooks/useUserRole';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import HistoricoSugestoes from '@/components/sugestoes/HistoricoSugestoes';

const Sugestoes = () => {
  const { 
    sugestoes, 
    sugestoesArquivadas, 
    loading, 
    loadingArchived, 
    createSugestao, 
    updateSugestao, 
    isCreating 
  } = useSugestoes();
  const { isAdmin } = useUserRole();
  const [novaSugestao, setNovaSugestao] = useState('');
  const [editingNotes, setEditingNotes] = useState<{ [key: string]: string }>({});
  const [showHistorico, setShowHistorico] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSugestao.trim()) {
      createSugestao(novaSugestao.trim());
      setNovaSugestao('');
    }
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    const notes = editingNotes[id] || '';
    updateSugestao(id, newStatus, notes);
  };

  const handleNotesChange = (id: string, notes: string) => {
    setEditingNotes(prev => ({ ...prev, [id]: notes }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Implementada':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Rejeitada':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Implementada':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'Rejeitada':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 bg-background min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-foreground">Carregando sugestões...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 space-y-3 sm:space-y-4 bg-background min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-foreground mb-1">Sugestões de Melhoria</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Compartilhe suas ideias para melhorar o sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowHistorico(true)}
            className="border-border text-muted-foreground hover:bg-accent h-8 text-xs"
            size="sm"
          >
            <History className="h-3 w-3 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Histórico</span>
            <span className="sm:hidden">Hist.</span>
          </Button>
          <Badge variant="outline" className="text-xs">
            {sugestoes.length} {sugestoes.length === 1 ? 'sugestão' : 'sugestões'}
          </Badge>
        </div>
      </div>

      {/* Formulário para nova sugestão */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-card-foreground flex items-center gap-2 text-sm sm:text-lg">
            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
            Nova Sugestão
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="sugestao" className="text-muted-foreground text-xs sm:text-sm">
                Descreva sua sugestão
              </Label>
              <Textarea
                id="sugestao"
                value={novaSugestao}
                onChange={(e) => setNovaSugestao(e.target.value)}
                placeholder="Descreva sua ideia para melhorar o sistema..."
                className="mt-1 bg-background border-border text-foreground placeholder-muted-foreground text-xs sm:text-sm"
                rows={3}
                required
              />
            </div>
            <Button 
              type="submit" 
              disabled={isCreating || !novaSugestao.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs"
              size="sm"
            >
              <Send className="h-3 w-3 mr-1 sm:mr-2" />
              {isCreating ? 'Enviando...' : 'Enviar Sugestão'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de sugestões */}
      <div className="space-y-2 sm:space-y-3">
        {sugestoes.map((sugestao) => (
          <Card key={sugestao.id} className="bg-card border-border">
            <CardHeader className="pb-2 sm:pb-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <User className="h-3 w-3" />
                    {sugestao.user_name}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Calendar className="h-3 w-3" />
                    {format(parseISO(sugestao.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </div>
                </div>
                <Badge variant="outline" className={`${getStatusColor(sugestao.status)} text-xs`}>
                  {getStatusIcon(sugestao.status)}
                  <span className="ml-1">{sugestao.status}</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-card-foreground mb-3 text-xs sm:text-sm">{sugestao.sugestao}</p>
              
              {/* Painel administrativo */}
              {isAdmin && (
                <div className="border-t border-border pt-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-muted-foreground text-xs">Status</Label>
                      <Select
                        value={sugestao.status}
                        onValueChange={(value) => handleStatusChange(sugestao.id, value)}
                      >
                        <SelectTrigger className="bg-background border-border text-foreground h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                          <SelectItem value="Implementada">Implementada</SelectItem>
                          <SelectItem value="Rejeitada">Rejeitada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Observações do Desenvolvedor</Label>
                      <Input
                        value={editingNotes[sugestao.id] || sugestao.developer_notes || ''}
                        onChange={(e) => handleNotesChange(sugestao.id, e.target.value)}
                        placeholder="Adicionar observações..."
                        className="bg-background border-border text-foreground placeholder-muted-foreground h-8 text-xs"
                      />
                    </div>
                  </div>
                  
                  {sugestao.developer_notes && (
                    <div className="bg-muted/50 p-2 rounded-lg">
                      <Label className="text-muted-foreground text-xs font-medium">Observações:</Label>
                      <p className="text-muted-foreground mt-1 text-xs">{sugestao.developer_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {sugestoes.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhuma sugestão foi enviada ainda.{' '}
              <br />
              Seja o primeiro a compartilhar uma ideia!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal de Histórico */}
      <HistoricoSugestoes
        isOpen={showHistorico}
        onClose={() => setShowHistorico(false)}
        sugestoesArquivadas={sugestoesArquivadas}
        loading={loadingArchived}
      />
    </div>
  );
};

export default Sugestoes;
