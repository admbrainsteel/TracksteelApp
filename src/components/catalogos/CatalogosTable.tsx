
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Eye, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
import { Catalogo } from '@/hooks/useCatalogos';

interface CatalogosTableProps {
  catalogos: Catalogo[];
  onEdit: (catalogo: Catalogo) => void;
  onDelete: (id: string) => void;
  onView: (catalogo: Catalogo) => void;
  canModify: boolean;
}

export function CatalogosTable({ catalogos, onEdit, onDelete, onView, canModify }: CatalogosTableProps) {
  if (catalogos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Eye className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>Nenhum documento encontrado</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table disableOverflow>
        <TableHeader>
          <TableRow className="bg-slate-50 dark:bg-transparent">
            <TableHead className="text-slate-700 dark:text-white">Título</TableHead>
            <TableHead className="text-slate-700 dark:text-white">Categoria</TableHead>
            <TableHead className="text-slate-700 dark:text-white">Disciplina</TableHead>
            <TableHead className="text-slate-700 dark:text-white">Páginas</TableHead>
            <TableHead className="text-slate-700 dark:text-white">Data de Inclusão</TableHead>
            <TableHead className="text-slate-700 dark:text-white">Palavras-chave</TableHead>
            <TableHead className="text-slate-700 dark:text-white">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {catalogos.map((catalogo) => (
            <TableRow key={catalogo.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
              <TableCell className="text-slate-900 dark:text-white font-medium max-w-[200px]">
                <div 
                  className="truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors" 
                  title={catalogo.titulo}
                  onClick={() => onView(catalogo)}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    {catalogo.titulo}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:border-transparent">
                  {catalogo.categoria}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300">
                  {catalogo.disciplina}
                </Badge>
              </TableCell>
              <TableCell className="text-slate-700 dark:text-slate-300">
                {catalogo.numero_paginas || 'N/A'}
              </TableCell>
              <TableCell className="text-slate-700 dark:text-slate-300">
                {format(new Date(catalogo.created_at), 'dd/MM/yyyy', { locale: ptBR })}
              </TableCell>
              <TableCell className="max-w-[200px]">
                <div className="flex flex-wrap gap-1">
                  {catalogo.palavras_chave?.slice(0, 3).map((palavra, index) => (
                    <Badge key={index} variant="outline" className="text-xs border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400">
                      {palavra}
                    </Badge>
                  ))}
                  {catalogo.palavras_chave && catalogo.palavras_chave.length > 3 && (
                    <Badge variant="outline" className="text-xs border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400">
                      +{catalogo.palavras_chave.length - 3}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(catalogo)}
                    className="h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-green-600/20"
                    title="Visualizar documento"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {canModify && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(catalogo)}
                        className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-600/20"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-600/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o documento "{catalogo.titulo}"? 
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete(catalogo.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
