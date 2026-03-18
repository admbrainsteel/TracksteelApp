
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Calendar, Hash, TrendingUp, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface InconsistenciaDetalhesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inconsistencia: any;
}

export const InconsistenciaDetalhesModal: React.FC<InconsistenciaDetalhesModalProps> = ({
  open,
  onOpenChange,
  inconsistencia
}) => {
  const navigate = useNavigate();

  if (!inconsistencia) return null;

  const handleNavegar = (rota: string) => {
    navigate(rota);
    onOpenChange(false);
  };

  const renderDetalhes = () => {
    switch (inconsistencia.tipo) {
      case 'Processo Pulado':
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Processos Pulados:</h4>
              <div className="space-y-1">
                {inconsistencia.detalhes.processosPulados.map((processo: string, index: number) => (
                  <Badge key={index} variant="destructive">{processo}</Badge>
                ))}
              </div>
            </div>
            
            {inconsistencia.detalhes.apontamentos.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Apontamentos Existentes:</h4>
                <div className="space-y-2">
                  {inconsistencia.detalhes.apontamentos.map((apt: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span>{apt.processo}</span>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(apt.data).toLocaleDateString()}
                        <Hash className="h-3 w-3" />
                        {apt.quantidade}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'Quantidade Excedente':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Quantidade Cadastrada</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {inconsistencia.detalhes.quantidadeCadastrada}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Quantidade Apontada</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {inconsistencia.detalhes.quantidadeApontada}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="p-3 bg-amber-50 border border-amber-200 rounded">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-amber-800">
                  Diferença: +{inconsistencia.detalhes.diferenca} peças
                </span>
              </div>
              <p className="text-sm text-amber-700 mt-1">
                Processo: {inconsistencia.detalhes.processo}
              </p>
            </div>
          </div>
        );

      case 'Expedição sem Processos':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="font-medium text-red-800">
                  Peça expedida sem processos de produção
                </span>
              </div>
            </div>
            
            {inconsistencia.detalhes.romaneios.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Romaneios de Expedição:</h4>
                <div className="space-y-2">
                  {inconsistencia.detalhes.romaneios.map((romaneio: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span>Quantidade: {romaneio.quantidade_expedida}</span>
                      <span className="text-sm text-muted-foreground">
                        Peso: {romaneio.peso_total}kg
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'Múltiplas Prioridades':
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Prioridades Encontradas:</h4>
              <div className="space-y-1">
                {inconsistencia.detalhes.prioridades.map((prioridade: string, index: number) => (
                  <Badge key={index} variant="outline">{prioridade}</Badge>
                ))}
              </div>
            </div>
            
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                Recomenda-se manter a peça em apenas uma prioridade para evitar conflitos de programação.
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-4 text-muted-foreground">
            Detalhes não disponíveis para este tipo de inconsistência.
          </div>
        );
    }
  };

  const getAcoesSugeridas = () => {
    const acoes: Array<{ label: string; rota: string; descricao: string }> = [];

    switch (inconsistencia.tipo) {
      case 'Processo Pulado':
        acoes.push({
          label: 'Ir para Apontamento de Produção',
          rota: '/apontamento-producao',
          descricao: 'Adicionar apontamentos dos processos faltantes'
        });
        break;
      
      case 'Quantidade Excedente':
        acoes.push({
          label: 'Ir para Cadastro de Peças',
          rota: '/seletor-of',
          descricao: 'Corrigir quantidade no cadastro da peça'
        });
        acoes.push({
          label: 'Ver Histórico de Apontamentos',
          rota: '/apontamento-producao',
          descricao: 'Verificar apontamentos duplicados'
        });
        break;
      
      case 'Expedição sem Processos':
        acoes.push({
          label: 'Ir para Apontamento de Produção',
          rota: '/apontamento-producao',
          descricao: 'Adicionar apontamentos de produção'
        });
        break;
      
      case 'Múltiplas Prioridades':
        acoes.push({
          label: 'Ir para Prioridades de Fabricação',
          rota: '/prioridades-fabricacao',
          descricao: 'Remover peça das prioridades desnecessárias'
        });
        break;
    }

    return acoes;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Detalhes da Inconsistência
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações da Peça</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium">Marca:</span>
                  <p className="font-mono">{inconsistencia.marca}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Tipo:</span>
                  <Badge variant="secondary">{inconsistencia.tipo}</Badge>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium">Descrição:</span>
                <p className="text-sm text-muted-foreground">{inconsistencia.descricao}</p>
              </div>
            </CardContent>
          </Card>

          {/* Detalhes Específicos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhes</CardTitle>
            </CardHeader>
            <CardContent>
              {renderDetalhes()}
            </CardContent>
          </Card>

          {/* Ações Sugeridas */}
          {inconsistencia.acaoSugerida && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ação Sugerida</CardTitle>
                <CardDescription>{inconsistencia.acaoSugerida}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getAcoesSugeridas().map((acao, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleNavegar(acao.rota)}
                      className="w-full justify-start"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {acao.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
