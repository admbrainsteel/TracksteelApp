
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserAvatar } from '@/components/ui/user-avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SolicitacaoComprasPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: any;
}

const statusColors = {
  'Em planejamento': 'bg-yellow-500',
  'Revisado': 'bg-orange-500',
  'Solicitado': 'bg-blue-500',
  'Comprado': 'bg-green-500',
  'Recebido': 'bg-lime-500',
  'Arquivado': 'bg-red-500',
};

export function SolicitacaoComprasPreviewModal({ isOpen, onClose, solicitacao }: SolicitacaoComprasPreviewModalProps) {
  if (!solicitacao) return null;

  const downloadAnexo = async (url: string) => {
    try {
      // Extrair o caminho do arquivo da URL
      const filePath = url.split('/').slice(-2).join('/'); // pega bucket/path
      
      const { data, error } = await supabase.storage
        .from('solicitacao-compras-anexos')
        .download(filePath);
      
      if (error) {
        console.error('Erro ao baixar arquivo:', error);
        toast.error('Erro ao baixar arquivo');
        return;
      }
      
      const fileName = url.split('/').pop() || 'anexo';
      const link = document.createElement('a');
      link.href = URL.createObjectURL(data);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      toast.success('Arquivo baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao baixar anexo:', error);
      toast.error('Erro ao baixar arquivo');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Preview - Solicitação de Compra {solicitacao.numero_sc}</DialogTitle>
          <Button onClick={onClose} variant="ghost" size="sm">
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <h3 className="font-semibold mb-2">Informações Gerais</h3>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Número SC: </span>
                  {solicitacao.numero_sc}
                </div>
                <div>
                  <span className="font-medium">Data: </span>
                  {format(new Date(solicitacao.data_solicitacao), 'dd/MM/yyyy', { locale: ptBR })}
                </div>
                <div>
                  <span className="font-medium">Status: </span>
                  <Badge 
                    variant="secondary"
                    className={`${statusColors[solicitacao.status as keyof typeof statusColors]} text-white ml-2`}
                  >
                    {solicitacao.status}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Revisão: </span>
                  {solicitacao.revisao}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Solicitante</h3>
              <div className="flex items-center gap-2">
                <UserAvatar
                  imageUrl={solicitacao.creator?.profile_image_url}
                  name={solicitacao.creator?.full_name}
                  email={solicitacao.creator?.email}
                  size="sm"
                />
                <div>
                  <div className="font-medium">{solicitacao.creator?.full_name}</div>
                  <div className="text-sm text-muted-foreground">{solicitacao.creator?.email}</div>
                </div>
              </div>
            </div>
          </div>

          {/* OF/Objetivo */}
          {(solicitacao.of_number || solicitacao.objetivo) && (
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">
                {solicitacao.of_number ? 'Ordem de Fabricação' : 'Objetivo'}
              </h3>
              <p>{solicitacao.of_number || solicitacao.objetivo}</p>
            </div>
          )}

          {/* Justificativa */}
          {solicitacao.justificativa && (
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Justificativa</h3>
              <p>{solicitacao.justificativa}</p>
            </div>
          )}

          {/* Itens */}
          {solicitacao.itens && solicitacao.itens.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Itens Solicitados</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Descrição
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Unidade
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Quantidade
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Prazo Recebimento
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-background divide-y divide-border">
                    {solicitacao.itens.map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm">
                          {item.material?.descricao || 'Material não encontrado'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {item.material?.unidade || 'UN'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {item.quantidade}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {format(new Date(item.prazo_recebimento), 'dd/MM/yyyy', { locale: ptBR })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Anexos */}
          {solicitacao.anexos_urls && solicitacao.anexos_urls.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Anexos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {solicitacao.anexos_urls.map((url: string, index: number) => {
                  const fileName = url.split('/').pop();
                  return (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm truncate">{fileName}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadAnexo(url)}
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Baixar
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
