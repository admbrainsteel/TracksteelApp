
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, FileText, Calendar, Hash, Eye } from 'lucide-react';
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

interface CatalogoPreviewsProps {
  catalogos: Catalogo[];
  onEdit: (catalogo: Catalogo) => void;
  onDelete: (id: string) => void;
  onView: (catalogo: Catalogo) => void;
  canModify: boolean;
}

export function CatalogoPreviews({ catalogos, onEdit, onDelete, onView, canModify }: CatalogoPreviewsProps) {
  if (catalogos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>Nenhum documento encontrado</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {catalogos.map((catalogo) => (
        <Card 
          key={catalogo.id} 
          className="bg-white border-slate-300 shadow-sm hover:shadow-md transition-colors cursor-pointer
                     dark:bg-slate-800/30 dark:border-slate-700 dark:hover:bg-slate-800/50"
          onClick={() => onView(catalogo)}
        >
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start gap-2">
              <CardTitle className="text-slate-900 dark:text-white text-lg line-clamp-2" title={catalogo.titulo}>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 flex-shrink-0" />
                  {catalogo.titulo}
                </div>
              </CardTitle>
              {canModify && (
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(catalogo);
                    }}
                    className="h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-green-600/20"
                    title="Visualizar documento"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(catalogo);
                    }}
                    className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-600/20"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
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
                </div>
              )}
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:border-transparent">
                {catalogo.categoria}
              </Badge>
              <Badge variant="outline" className="border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300">
                {catalogo.disciplina}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3">
              {catalogo.conteudo.substring(0, 150)}...
            </p>
            
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <Hash className="h-4 w-4" />
                <span>{catalogo.numero_paginas || 'N/A'} pág.</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(catalogo.created_at), 'dd/MM/yy', { locale: ptBR })}</span>
              </div>
            </div>
            
            {catalogo.palavras_chave && catalogo.palavras_chave.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {catalogo.palavras_chave.slice(0, 4).map((palavra, index) => (
                  <Badge key={index} variant="outline" className="text-xs border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400">
                    {palavra}
                  </Badge>
                ))}
                {catalogo.palavras_chave.length > 4 && (
                  <Badge variant="outline" className="text-xs border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400">
                    +{catalogo.palavras_chave.length - 4}
                  </Badge>
                )}
              </div>
            )}

            {catalogo.arquivo_urls && catalogo.arquivo_urls.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                <Eye className="h-3 w-3" />
                <span>{catalogo.arquivo_urls.length} documento(s) disponível(eis)</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
