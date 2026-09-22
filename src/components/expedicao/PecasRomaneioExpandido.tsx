import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Edit2, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RomaneioExpedicao } from '@/hooks/useRomaneios';
import { useMobileResponsive } from '@/hooks/useMobileResponsive';

interface PecasRomaneioExpandidoProps {
  isOpen: boolean;
  onClose: () => void;
  romaneio: RomaneioExpedicao;
  onRefresh: () => void;
}

interface ItemRomaneioPeca {
  id: string;
  peca_id: string;
  quantidade_expedida: number;
  peso_unitario: number;
  peso_total: number;
  comprimento?: number | null;
  marca: string;
  descricao: string;
  fase: string;
  prioridade: string;
}

export const PecasRomaneioExpandido: React.FC<PecasRomaneioExpandidoProps> = ({
  isOpen,
  onClose,
  romaneio,
  onRefresh
}) => {
  const { isMobile, isTablet } = useMobileResponsive();
  
  const [itensPeca, setItensPeca] = useState<ItemRomaneioPeca[]>([]);
  const [loading, setLoading] = useState(false);

  const carregarItensPecas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('itens_romaneio_pecas')
        .select('*, pecas(comprimento)')
        .eq('romaneio_id', romaneio.id)
        .order('marca');

      if (error) throw error;

      if (data) {
        const itensFormatados = data.map((item: any) => ({
          id: item.id,
          peca_id: item.peca_id,
          quantidade_expedida: item.quantidade_expedida,
          peso_unitario: item.peso_unitario,
          peso_total: item.peso_total,
          comprimento: item.pecas?.comprimento || item.comprimento || null,
          marca: item.marca,
          descricao: item.descricao || '',
          fase: item.fase || '',
          prioridade: 'P4'
        }));
        setItensPeca(itensFormatados);
      }
    } catch (error) {
      console.error('Erro ao carregar peças:', error);
      toast.error('Erro ao carregar peças do romaneio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      carregarItensPecas();
    }
  }, [isOpen, romaneio.id]);

  const handleRemoverItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('itens_romaneio_pecas')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      
      toast.success('Item removido do romaneio');
      carregarItensPecas();
      onRefresh();
    } catch (error) {
      console.error('Erro ao remover item:', error);
      toast.error('Erro ao remover item do romaneio');
    }
  };

  const handleEditarItem = (item: ItemRomaneioPeca) => {
    // Funcionalidade de edição pode ser implementada aqui
    toast.info('Funcionalidade de edição em desenvolvimento');
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'P1': return 'bg-red-100 text-red-800';
      case 'P2': return 'bg-orange-100 text-orange-800';
      case 'P3': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const qtdTotal = itensPeca.reduce((total, item) => total + item.quantidade_expedida, 0);
  const pesoTotal = itensPeca.reduce((total, item) => total + item.peso_total, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`
        ${isMobile 
          ? 'w-[95vw] max-w-none h-[95vh] m-2' 
          : isTablet 
            ? 'w-[90vw] max-w-5xl h-[90vh]' 
            : 'max-w-6xl h-[95vh]'
        } 
        bg-slate-900 text-white border-slate-700 overflow-hidden flex flex-col
      `}>
        <DialogHeader className="border-b border-slate-700 pb-3 shrink-0">
          <div className="flex justify-between items-center">
            <DialogTitle className={`font-bold text-white ${isMobile ? 'text-lg' : 'text-xl'}`}>
              <span className="truncate">
                Peças do Romaneio {romaneio.numero_romaneio} - OF: {romaneio.of_number}
              </span>
            </DialogTitle>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className={`text-gray-400 hover:text-white p-0 ${isMobile ? 'h-6 w-6' : 'h-8 w-8'}`}
            >
              <X className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
            </Button>
          </div>
          
          <div className={`flex gap-2 mt-3 ${isMobile ? 'flex-wrap' : ''}`}>
            <Badge variant="outline" className={`border-blue-500 text-blue-400 ${isMobile ? 'text-xs px-2 py-1' : ''}`}>
              Qtd Total: {qtdTotal}
            </Badge>
            <Badge variant="outline" className={`border-green-500 text-green-400 ${isMobile ? 'text-xs px-2 py-1' : ''}`}>
              Peso Total: {pesoTotal.toFixed(2)} kg
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className={`text-gray-400 ${isMobile ? 'text-sm' : 'text-base'}`}>
                Carregando...
              </div>
            </div>
          ) : itensPeca.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <div className={`text-gray-400 ${isMobile ? 'text-sm' : 'text-base'}`}>
                Nenhuma peça encontrada no romaneio
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full w-full">
              <div className="space-y-1 p-1 pb-4">
                {/* Cabeçalho da tabela - Desktop/Tablet */}
                {!isMobile && (
                  <div className={`grid gap-3 font-medium text-gray-400 bg-slate-800 p-3 rounded-t-md sticky top-0 z-10 ${
                    isTablet ? 'grid-cols-9 text-xs' : 'grid-cols-11 text-xs'
                  }`}>
                    <div>Marca</div>
                    <div>Fase</div>
                    <div className={isTablet ? 'col-span-1' : 'col-span-2'}>Descrição</div>
                    <div className="text-right">Comp. (mm)</div>
                    <div className="text-center">Qtd</div>
                    <div className="text-right">Peso Unit.</div>
                    <div className="text-right">Peso Total</div>
                    {!isTablet && <div className="text-center">Prioridade</div>}
                    <div className={`text-center ${isTablet ? 'col-span-2' : 'col-span-2'}`}>Ações</div>
                  </div>
                )}

                {/* Linhas de dados */}
                {itensPeca.map((item, index) => {
                  const limite = romaneio.comprimento_maximo_veiculo || 12000;
                  const naoCabe = Boolean(item.comprimento && item.comprimento > limite);

                  return (
                  <div key={item.id}>
                    {isMobile ? (
                      // Layout mobile - card style
                      <div className={`p-3 border rounded-md mb-2 ${
                        naoCabe ? 'border-red-500/50 bg-red-950/20' : 'border-slate-700'
                      } ${
                        index % 2 === 0 ? 'bg-slate-800/20' : 'bg-slate-800/40'
                      }`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="font-medium text-white text-sm flex items-center gap-1.5">
                              {item.marca}
                              {naoCabe && (
                                <span className="text-[10px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded">
                                  Excede Veículo
                                </span>
                              )}
                            </div>
                            <div className="text-gray-300 text-xs">{item.fase}</div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditarItem(item)}
                              className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoverItem(item.id)}
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-gray-300 text-xs mb-2 line-clamp-2">
                          {item.descricao}
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div>
                            <div className="text-gray-400">Comp:</div>
                            <div className={`font-mono font-medium ${naoCabe ? 'text-red-400 font-bold' : 'text-gray-300'}`}>
                              {item.comprimento ? `${item.comprimento}mm` : '-'}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400">Qtd:</div>
                            <div className="font-bold text-blue-400">{item.quantidade_expedida}</div>
                          </div>
                          <div>
                            <div className="text-gray-400">Peso Unit:</div>
                            <div className="text-gray-300">{item.peso_unitario.toFixed(2)} kg</div>
                          </div>
                          <div>
                            <div className="text-gray-400">Peso Total:</div>
                            <div className="font-medium text-white">{item.peso_total.toFixed(2)} kg</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Layout desktop/tablet - table style
                      <div className={`grid gap-3 text-sm p-3 border-b border-slate-700 hover:bg-slate-800/50 transition-colors ${
                        index % 2 === 0 ? 'bg-slate-800/20' : ''
                      } ${isTablet ? 'grid-cols-9' : 'grid-cols-11'} ${naoCabe ? 'bg-red-950/20' : ''}`}>
                        <div className="font-medium text-white truncate flex items-center gap-1">
                          {item.marca}
                          {naoCabe && <span title="Não cabe no veículo" className="text-red-400 text-xs">⚠️</span>}
                        </div>
                        <div className="text-gray-300 truncate">{item.fase}</div>
                        <div className={`text-gray-300 truncate ${isTablet ? 'col-span-1' : 'col-span-2'}`}>
                          {item.descricao}
                        </div>
                        <div className={`text-right font-mono text-xs ${naoCabe ? 'text-red-400 font-bold' : 'text-gray-300'}`}>
                          {item.comprimento ? `${item.comprimento}` : '-'}
                        </div>
                        <div className="text-center font-bold text-blue-400">
                          {item.quantidade_expedida}
                        </div>
                        <div className="text-right text-gray-300">
                          {item.peso_unitario.toFixed(2)} kg
                        </div>
                        <div className="text-right font-medium text-white">
                          {item.peso_total.toFixed(2)} kg
                        </div>
                        {!isTablet && (
                          <div className="flex justify-center">
                            <Badge className={`text-xs ${getPrioridadeColor(item.prioridade)}`}>
                              {item.prioridade}
                            </Badge>
                          </div>
                        )}
                        <div className={`flex items-center justify-center gap-2 ${isTablet ? 'col-span-2' : 'col-span-2'}`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditarItem(item)}
                            className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoverItem(item.id)}
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className={`flex justify-end pt-3 border-t border-slate-700 shrink-0 ${isMobile ? 'px-1' : ''}`}>
          <Button 
            variant="outline" 
            onClick={onClose} 
            className={`border-slate-600 text-gray-300 hover:bg-slate-800 ${isMobile ? 'h-10 px-4 text-sm' : ''}`}
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
