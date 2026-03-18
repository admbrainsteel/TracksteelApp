
// Top-level imports
import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileText, Image, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Catalogo } from '@/hooks/useCatalogos';

interface DocumentViewerProps {
  catalogo: Catalogo | null;
  isOpen: boolean;
  onClose: () => void;
}

// DocumentViewer component
export function DocumentViewer({ catalogo, isOpen, onClose }: DocumentViewerProps) {
  // TODOS OS HOOKS DEVEM ESTAR NO TOPO - ANTES DE QUALQUER RETURN CONDICIONAL
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // useEffect também deve estar no topo
  useEffect(() => {
    const onFullScreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullScreenChange);
  }, []);

  // Funções de handler
  const handlePrevious = () => {
    if (currentDocIndex > 0) {
      setCurrentDocIndex(currentDocIndex - 1);
      setZoomLevel(1);
    }
  };

  const handleNext = () => {
    if (catalogo?.arquivo_urls && currentDocIndex < catalogo.arquivo_urls.length - 1) {
      setCurrentDocIndex(currentDocIndex + 1);
      setZoomLevel(1);
    }
  };

  const handleZoomIn = () => {
    if (zoomLevel < 3) {
      setZoomLevel(zoomLevel + 0.25);
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel > 0.5) {
      setZoomLevel(zoomLevel - 0.25);
    }
  };

  const handleDownload = () => {
    const currentDoc = catalogo?.arquivo_urls?.[currentDocIndex];
    if (currentDoc) {
      const link = document.createElement('a');
      link.href = currentDoc;
      link.download = '';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleOpenInNewTab = () => {
    const currentDoc = catalogo?.arquivo_urls?.[currentDocIndex];
    if (currentDoc) {
      window.open(currentDoc, '_blank', 'noopener,noreferrer');
    }
  };

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await viewerRef.current?.requestFullscreen?.();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen?.();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.error('Erro ao alternar tela cheia:', e);
    }
  };

  const resetAndClose = () => {
    setCurrentDocIndex(0);
    setZoomLevel(1);
    onClose();
  };

  // AGORA SIM podemos fazer o return condicional - APÓS todos os hooks
  if (!catalogo || !catalogo.arquivo_urls || catalogo.arquivo_urls.length === 0) {
    return null;
  }

  const currentDoc = catalogo.arquivo_urls[currentDocIndex];
  const isImage = currentDoc?.includes('image') || /\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(currentDoc || '');
  const isPdf = currentDoc?.includes('pdf') || /\.pdf$/i.test(currentDoc || '');

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) resetAndClose();
      }}
    >
      <DialogContent
        className="
          w-[95vw] max-w-[95vw] h-[90vh]
          bg-white text-slate-900 border-slate-300
          dark:bg-slate-900 dark:text-white dark:border-slate-700
        "
      >
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex-1">
            <DialogTitle className="text-xl mb-2">{catalogo.titulo}</DialogTitle>
            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Badge className="bg-slate-100 text-slate-700 border border-slate-300 dark:bg-blue-900 dark:text-blue-100 dark:border-slate-700">
                  {catalogo.categoria}
                </Badge>
                <Badge variant="outline" className="border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300">
                  {catalogo.disciplina}
                </Badge>
              </div>
              <span>{format(new Date(catalogo.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
              {catalogo.numero_paginas && <span>{catalogo.numero_paginas} páginas</span>}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {catalogo.arquivo_urls.length > 1 && (
              <div className="mr-2 text-sm text-slate-600 dark:text-slate-400">
                {currentDocIndex + 1} de {catalogo.arquivo_urls.length}
              </div>
            )}
            
            {isImage && (
              <>
                <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={zoomLevel <= 0.5} className="h-8 w-8 p-0">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-slate-600 dark:text-slate-400 px-2">{Math.round(zoomLevel * 100)}%</span>
                <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={zoomLevel >= 3} className="h-8 w-8 p-0">
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </>
            )}
            
            <Button variant="ghost" size="sm" onClick={handleOpenInNewTab} className="h-8 w-8 p-0" title="Abrir em nova aba">
              <ExternalLink className="h-4 w-4" />
            </Button>
            
            <Button variant="ghost" size="sm" onClick={handleToggleFullscreen} className="h-8 w-8 p-0" title="Tela cheia">
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            
            <Button variant="ghost" size="sm" onClick={handleDownload} className="h-8 w-8 p-0" title="Baixar">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={resetAndClose} className="h-8 w-8 p-0" title="Fechar">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden pt-3">
          {catalogo.arquivo_urls.length > 1 && (
            <div className="flex items-center">
              <Button variant="ghost" size="sm" onClick={handlePrevious} disabled={currentDocIndex === 0} className="h-10 w-10 p-0">
                <ChevronLeft className="h-6 w-6" />
              </Button>
            </div>
          )}

          <div
            ref={viewerRef}
            className="
              flex-1 flex items-center justify-center overflow-auto
              bg-slate-50 border border-slate-200/80 rounded-lg mx-2
              dark:bg-slate-800/30 dark:border-slate-700
            "
          >
            {isPdf ? (
              <iframe
                src={currentDoc}
                className="w-full h-full min-h-[65vh] rounded-lg"
                title={`Documento ${currentDocIndex + 1}`}
              />
            ) : isImage ? (
              <img
                src={currentDoc}
                alt={`Documento ${currentDocIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg transition-transform duration-200"
                style={{ transform: `scale(${zoomLevel})` }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-4">
                <FileText className="h-12 w-12" />
                <p>Tipo de documento não suportado para visualização</p>
                <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Documento
                </Button>
              </div>
            )}
          </div>

          {catalogo.arquivo_urls.length > 1 && (
            <div className="flex items-center">
              <Button variant="ghost" size="sm" onClick={handleNext} disabled={currentDocIndex === catalogo.arquivo_urls.length - 1} className="h-10 w-10 p-0">
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>
          )}
        </div>

        {catalogo.arquivo_urls.length > 1 && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {catalogo.arquivo_urls.map((url, index) => {
                const isCurrentImage = url?.includes('image') || /\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(url || '');
                const isCurrentPdf = url?.includes('pdf') || /\.pdf$/i.test(url || '');
                return (
                  <button
                    key={index}
                    onClick={() => { setCurrentDocIndex(index); setZoomLevel(1); }}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-colors ${
                      index === currentDocIndex ? 'border-blue-500' : 'border-slate-300 hover:border-slate-400 dark:border-slate-600 dark:hover:border-slate-500'
                    }`}
                  >
                    {isCurrentImage ? (
                      <img src={url} alt={`Miniatura ${index + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        {isCurrentPdf ? (
                          <FileText className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                        ) : (
                          <Image className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <div className="space-y-2">
            <p className="text-slate-700 dark:text-slate-300 text-sm line-clamp-3">{catalogo.conteudo}</p>
            {catalogo.palavras_chave && catalogo.palavras_chave.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {catalogo.palavras_chave.map((palavra, index) => (
                  <Badge key={index} variant="outline" className="text-xs border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300">
                    {palavra}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
