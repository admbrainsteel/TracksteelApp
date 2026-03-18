
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Edit, Package } from 'lucide-react';
import { EstoqueMaterial, useExcluirMateriais } from '@/hooks/useEstoque';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface EstoqueBatchActionsProps {
  selectedMaterials: EstoqueMaterial[];
  onClearSelection: () => void;
  onShowMovimentacao: () => void;
  onShowBatchEdit: () => void;
}

export function EstoqueBatchActions({ 
  selectedMaterials, 
  onClearSelection,
  onShowMovimentacao,
  onShowBatchEdit
}: EstoqueBatchActionsProps) {
  const excluirMateriais = useExcluirMateriais();

  const handleBatchDelete = async () => {
    if (selectedMaterials.length === 0) {
      console.log('Nenhum material selecionado para exclusão');
      return;
    }

    try {
      const materialIds = selectedMaterials.map(m => m.id);
      console.log('Iniciando exclusão de materiais:', {
        count: selectedMaterials.length,
        ids: materialIds,
        materials: selectedMaterials.map(m => ({ id: m.id, codigo: m.codigo, descricao: m.descricao }))
      });
      
      await excluirMateriais.mutateAsync(materialIds);
      console.log('Exclusão concluída com sucesso');
      onClearSelection();
    } catch (error) {
      console.error('Erro na exclusão de materiais:', error);
      // Error is handled by the mutation hook via toast
    }
  };

  if (selectedMaterials.length === 0) return null;

  const confirmMessage = selectedMaterials.length === 1 
    ? `Tem certeza que deseja excluir o material "${selectedMaterials[0].descricao}"?`
    : `Tem certeza que deseja excluir ${selectedMaterials.length} materiais selecionados?`;

  return (
    <Card className="mb-4 bg-blue-50 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-blue-700">
              {selectedMaterials.length} material(is) selecionado(s)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onShowBatchEdit}
                className="text-blue-600 hover:text-blue-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onShowMovimentacao}
                className="text-green-600 hover:text-green-700"
              >
                <Package className="w-4 h-4 mr-2" />
                Movimentar
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={excluirMateriais.isPending}
                    className="text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {excluirMateriais.isPending ? 'Excluindo...' : 'Excluir'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-slate-800 border-slate-700">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400">
                      {confirmMessage}
                      <br /><br />
                      <strong>Esta ação não pode ser desfeita.</strong>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel 
                      className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                      disabled={excluirMateriais.isPending}
                    >
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleBatchDelete}
                      disabled={excluirMateriais.isPending}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {excluirMateriais.isPending ? 'Excluindo...' : 'Excluir'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-gray-500"
          >
            Limpar Seleção
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
