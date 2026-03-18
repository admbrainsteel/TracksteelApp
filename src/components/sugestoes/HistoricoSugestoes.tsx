
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CheckCircle, XCircle, User, Calendar, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Sugestao } from '@/hooks/useSugestoes';

interface HistoricoSugestoesProps {
  isOpen: boolean;
  onClose: () => void;
  sugestoesArquivadas: Sugestao[];
  loading: boolean;
}

const HistoricoSugestoes: React.FC<HistoricoSugestoesProps> = ({
  isOpen,
  onClose,
  sugestoesArquivadas,
  loading
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Implementada':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'Rejeitada':
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Implementada':
        return 'bg-green-900/20 text-green-400 border-green-400';
      case 'Rejeitada':
        return 'bg-red-900/20 text-red-400 border-red-400';
      default:
        return 'bg-gray-900/20 text-gray-400 border-gray-400';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Sugestões Arquivadas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-slate-400">Carregando histórico...</div>
            </div>
          ) : sugestoesArquivadas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-slate-400 mb-4" />
              <p className="text-slate-400 text-center">
                Nenhuma sugestão arquivada encontrada.
              </p>
            </div>
          ) : (
            sugestoesArquivadas.map((sugestao) => (
              <Card key={sugestao.id} className="bg-slate-800/50 border-slate-600">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {sugestao.user_name}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(parseISO(sugestao.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </div>
                    <Badge variant="outline" className={getStatusColor(sugestao.status)}>
                      {getStatusIcon(sugestao.status)}
                      <span className="ml-1">{sugestao.status}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-white text-sm mb-3">{sugestao.sugestao}</p>
                  
                  {sugestao.developer_notes && (
                    <div className="bg-slate-700/50 p-3 rounded-lg">
                      <p className="text-slate-300 text-sm font-medium mb-1">Observações:</p>
                      <p className="text-slate-300 text-sm">{sugestao.developer_notes}</p>
                    </div>
                  )}
                  
                  {sugestao.archived_at && (
                    <div className="mt-3 pt-2 border-t border-slate-600">
                      <p className="text-slate-400 text-xs">
                        Arquivada em {format(parseISO(sugestao.archived_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HistoricoSugestoes;
