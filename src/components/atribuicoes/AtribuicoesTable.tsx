import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ResponsiveTable } from '@/components/responsive/ResponsiveTable';
import { TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAtribuicoes } from '@/hooks/useAtribuicoes';
import { useMobileResponsive } from '@/hooks/useMobileResponsive';
import { Edit, Trash2, Search, AlertCircle, Printer } from 'lucide-react';
import { AtribuicaoEditModal } from './AtribuicaoEditModal';
import { AtribuicoesPrintModal } from './AtribuicoesPrintModal';

export function AtribuicoesTable() {
  const { atribuicoes, canManage, deleteAtribuicao, loading } = useAtribuicoes();
  const { isMobile } = useMobileResponsive();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAtribuicao, setEditingAtribuicao] = useState<any>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const filteredAtribuicoes = atribuicoes.filter(attr => 
    attr.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attr.attribution.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attr.user_abbrev.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('📊 AtribuicoesTable render:', { 
    atribuicoesTotal: atribuicoes.length,
    filteredCount: filteredAtribuicoes.length,
    loading,
    searchTerm 
  });

  const getImportanceBadgeColor = (importancia: string) => {
    switch (importancia) {
      case 'essencial': return 'destructive';
      case 'estrategico': return 'default';
      case 'suporte': return 'secondary';
      case 'informativo': return 'outline';
      default: return 'outline';
    }
  };

  const headers = [
    'Usuário',
    'ID',
    'Atribuição',
    'Frequência',
    'Método',
    'Cliente',
    'Importância',
    'Duração',
    ...(canManage ? ['Ações'] : [])
  ];

  const renderRow = (attr: any, index: number) => (
    <>
      {/* Coluna Usuário - 18% da largura */}
      <TableCell className="w-[18%] min-w-[180px] p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={attr.user_photo} />
            <AvatarFallback className="text-sm font-medium">
              {attr.user_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{attr.user_name}</p>
            <p className="text-xs text-muted-foreground truncate">{attr.user_email}</p>
          </div>
        </div>
      </TableCell>
      
      {/* Coluna ID - 4% da largura */}
      <TableCell className="w-[4%] min-w-[50px] p-3">
        <Badge variant="outline" className="text-xs font-medium">{attr.user_abbrev}</Badge>
      </TableCell>
      
      {/* Coluna Atribuição - 35% da largura com fonte menor */}
      <TableCell className="w-[35%] min-w-[350px] p-3">
        <div className="assignment-cell text-xs leading-relaxed max-h-[4.5rem] overflow-hidden">
          <p className="break-words whitespace-normal line-clamp-4" title={attr.attribution}>
            {attr.attribution}
          </p>
        </div>
      </TableCell>
      
      {/* Coluna Frequência - 7% da largura, centralizada */}
      <TableCell className="w-[7%] min-w-[70px] p-3 text-center">
        <span className="text-sm text-muted-foreground">{attr.frequency}</span>
      </TableCell>
      
      {/* Coluna Método - 7% da largura */}
      <TableCell className="w-[7%] min-w-[70px] p-3">
        <span className="text-sm text-muted-foreground">{attr.method}</span>
      </TableCell>
      
      {/* Coluna Cliente - 7% da largura */}
      <TableCell className="w-[7%] min-w-[70px] p-3">
        <span className="text-sm text-muted-foreground">{attr.client}</span>
      </TableCell>
      
      {/* Coluna Importância - 9% da largura, centralizada */}
      <TableCell className="w-[9%] min-w-[90px] p-3 text-center">
        <Badge 
          variant={getImportanceBadgeColor(attr.importance)} 
          className="importance-tag text-xs px-2 py-1 rounded-full whitespace-nowrap"
        >
          {attr.importance}
        </Badge>
      </TableCell>
      
      {/* Coluna Duração - 7% da largura, centralizada */}
      <TableCell className="w-[7%] min-w-[70px] p-3 text-center">
        <span className="text-sm text-muted-foreground">{attr.duration}</span>
      </TableCell>
      
      {/* Coluna Ações - 6% da largura, centralizada */}
      {canManage && (
        <TableCell className="w-[6%] min-w-[80px] p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingAtribuicao(attr)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm('Tem certeza que deseja excluir esta atribuição?')) {
                  deleteAtribuicao(attr.id);
                }
              }}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      )}
    </>
  );

  const renderMobileCard = (attr: any) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={attr.user_photo} />
            <AvatarFallback className="text-xs">
              {attr.user_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{attr.user_name}</p>
            <Badge variant="outline" className="text-xs">{attr.user_abbrev}</Badge>
          </div>
        </div>
        <Badge variant={getImportanceBadgeColor(attr.importance)}>
          {attr.importance}
        </Badge>
      </div>
      
      <div>
        <p className="text-sm font-medium">Atribuição:</p>
        <p className="text-sm text-muted-foreground">{attr.attribution}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="font-medium">Frequência:</span> {attr.frequency}
        </div>
        <div>
          <span className="font-medium">Método:</span> {attr.method}
        </div>
        <div>
          <span className="font-medium">Cliente:</span> {attr.client}
        </div>
        <div>
          <span className="font-medium">Duração:</span> {attr.duration}
        </div>
      </div>
      
      {canManage && (
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingAtribuicao(attr)}
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm('Tem certeza que deseja excluir esta atribuição?')) {
                deleteAtribuicao(attr.id);
              }
            }}
            className="flex-1 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Excluir
          </Button>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {canManage ? 'Todas as Atribuições' : 'Minhas Atribuições'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Carregando atribuições...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>
              {canManage ? 'Todas as Atribuições' : 'Minhas Atribuições'}
              {atribuicoes.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({atribuicoes.length} {atribuicoes.length === 1 ? 'atribuição' : 'atribuições'})
                </span>
              )}
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {atribuicoes.length > 0 && (
                <>
                  <Button
                    onClick={() => setShowPrintModal(true)}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </Button>
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por usuário, atribuição ou ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-full sm:w-80"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {atribuicoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma atribuição encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Ainda não há atribuições cadastradas no sistema.
              </p>
              {canManage && (
                <p className="text-sm text-muted-foreground">
                  Use a aba "Cadastro" para criar a primeira atribuição.
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <ResponsiveTable
                headers={headers}
                data={filteredAtribuicoes}
                renderRow={renderRow}
                renderMobileCard={renderMobileCard}
                emptyMessage={
                  filteredAtribuicoes.length === 0 && searchTerm 
                    ? `Nenhuma atribuição encontrada para "${searchTerm}"`
                    : "Nenhuma atribuição encontrada"
                }
                loading={false}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {editingAtribuicao && (
        <AtribuicaoEditModal
          atribuicao={editingAtribuicao}
          isOpen={!!editingAtribuicao}
          onClose={() => setEditingAtribuicao(null)}
        />
      )}

      <AtribuicoesPrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        atribuicoes={filteredAtribuicoes}
      />
    </>
  );
}
