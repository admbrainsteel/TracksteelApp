
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { useRastreabilidadeMateriais, useExcluirRastreabilidade } from '@/hooks/useRastreabilidadeMateriais';
import { RastreabilidadeLoteModal } from './RastreabilidadeLoteModal';

export const RastreabilidadeMP: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLote, setSelectedLote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: lotes, isLoading } = useRastreabilidadeMateriais();
  const excluirRastreabilidade = useExcluirRastreabilidade();

  const filteredLotes = lotes?.filter(lote => 
    lote.lote.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lote.fornecedor && lote.fornecedor.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (lote.certificado && lote.certificado.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const handleOpenModal = () => {
    setSelectedLote(null);
    setIsModalOpen(true);
  };

  const handleEditLote = (lote: any) => {
    setSelectedLote(lote);
    setIsModalOpen(true);
  };

  const handleDeleteLote = async (lote: any) => {
    if (window.confirm(`Tem certeza que deseja excluir o lote ${lote.lote}?`)) {
      try {
        await excluirRastreabilidade.mutateAsync(lote.id);
      } catch (error) {
        console.error('Erro ao excluir lote:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground text-sm">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <CardTitle className="text-card-foreground text-sm sm:text-lg lg:text-xl">
              Rastreabilidade do MP
            </CardTitle>
            <Button onClick={handleOpenModal} className="bg-primary hover:bg-primary/90 text-xs sm:text-sm px-3 py-2" size="sm">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Novo Lote
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="px-2 sm:px-6">
          <div className="space-y-3 mb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3 sm:w-4 sm:h-4" />
              <Input
                placeholder="Buscar por lote, fornecedor ou certificado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 sm:pl-10 text-xs sm:text-sm h-8 sm:h-10"
              />
            </div>
          </div>

          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="text-xs py-1 px-2">Lote</TableHead>
                  <TableHead className="text-xs py-1 px-2">Material</TableHead>
                  <TableHead className="text-xs py-1 px-2">Quantidade</TableHead>
                  <TableHead className="text-xs py-1 px-2">Fornecedor</TableHead>
                  <TableHead className="text-xs py-1 px-2">Nota Fiscal</TableHead>
                  <TableHead className="text-xs py-1 px-2">Certificado</TableHead>
                  <TableHead className="text-xs py-1 px-2">Corrida</TableHead>
                  <TableHead className="text-xs py-1 px-2">Data Entrada</TableHead>
                  <TableHead className="text-xs py-1 px-2">Data Validade</TableHead>
                  <TableHead className="text-xs py-1 px-2">Status</TableHead>
                  <TableHead className="text-xs py-1 px-2 w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLotes.map((lote) => (
                  <TableRow key={lote.id} className="h-6">
                    <TableCell className="text-xs py-1 px-2 font-medium">{lote.lote}</TableCell>
                    <TableCell className="text-xs py-1 px-2">
                      {lote.estoque_materiais?.descricao || '-'}
                    </TableCell>
                    <TableCell className="text-xs py-1 px-2">{lote.quantidade}</TableCell>
                    <TableCell className="text-xs py-1 px-2">{lote.fornecedor || '-'}</TableCell>
                    <TableCell className="text-xs py-1 px-2">{lote.nota_fiscal || '-'}</TableCell>
                    <TableCell className="text-xs py-1 px-2">{lote.certificado || '-'}</TableCell>
                    <TableCell className="text-xs py-1 px-2">{lote.corrida || '-'}</TableCell>
                    <TableCell className="text-xs py-1 px-2">
                      {lote.data_entrada ? formatDate(lote.data_entrada) : '-'}
                    </TableCell>
                    <TableCell className="text-xs py-1 px-2">
                      {lote.data_validade ? formatDate(lote.data_validade) : '-'}
                    </TableCell>
                    <TableCell className="text-xs py-1 px-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        lote.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {lote.status}
                      </span>
                    </TableCell>
                    <TableCell className="py-1 px-2">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditLote(lote)}
                          className="h-6 w-6 p-1"
                          title="Editar lote"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLote(lote)}
                          className="h-6 w-6 p-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Excluir lote"
                          disabled={excluirRastreabilidade.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredLotes.length === 0 && (
            <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm">
              Nenhum lote encontrado
            </div>
          )}
        </CardContent>
      </Card>

      <RastreabilidadeLoteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        lote={selectedLote}
      />
    </>
  );
};
