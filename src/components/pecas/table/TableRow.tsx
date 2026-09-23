import React, { useState } from 'react';
import { TableCell, TableRow as UITableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Edit, 
  Trash2, 
  Package, 
  Check, 
  X, 
  ChevronRight, 
  ChevronDown, 
  Layers, 
  Loader2,
  ExternalLink,
  Minus
} from 'lucide-react';
import { Peca } from '@/hooks/usePecas';
import { useComponentesPeca } from '@/hooks/useComponentesPeca';
import { useAppLabels } from '@/hooks/useAppLabels';
import { PriorityBadge } from '../PriorityBadge';

interface TableRowProps {
  peca: Peca;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onOpenComponentPopup: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function TableRow({ 
  peca, 
  isSelected, 
  onSelect, 
  onOpenComponentPopup,
  onEdit, 
  onDelete 
}: TableRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { labels } = useAppLabels();
  const { componentes, loading } = useComponentesPeca(isExpanded ? peca.id : '');

  const hasSubComponents = peca.tem_componentes;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(prev => !prev);
  };

  return (
    <>
      <UITableRow 
        className={`hover:bg-muted/50 transition-colors ${
          isExpanded ? 'bg-blue-50/40 dark:bg-blue-950/20 border-b-0' : ''
        }`}
      >
        <TableCell className="w-8 px-2">
          <div className="flex items-center gap-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(checked as boolean)}
              aria-label={`Selecionar peça ${peca.id}`}
            />
            {hasSubComponents && (
              <button
                type="button"
                onClick={toggleExpand}
                className="p-0.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                title={isExpanded ? 'Recolher componentes' : 'Expandir componentes inline'}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 font-bold" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-500 hover:text-blue-600 font-bold" />
                )}
              </button>
            )}
          </div>
        </TableCell>
        
        <TableCell className="w-16 px-2 font-medium text-foreground text-xs font-mono">
          {peca.of_number}
        </TableCell>
        
        <TableCell className="w-12 px-2 text-muted-foreground text-xs font-mono">
          {peca.etapa_fase}
        </TableCell>
        
        <TableCell className="w-14 px-2 text-foreground text-xs font-bold font-mono">
          <div className="flex items-center gap-1.5">
            <span>{peca.marca}</span>
            {hasSubComponents && (
              <span 
                onClick={toggleExpand}
                className="cursor-pointer text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 px-1 py-0.2 rounded font-semibold"
                title="Possui subcomponentes"
              >
                Comp
              </span>
            )}
          </div>
        </TableCell>
        
        <TableCell className="w-32 px-2 text-foreground text-xs">
          {peca.descricao}
        </TableCell>
        
        <TableCell className="w-14 px-1 text-center">
          <PriorityBadge prioridade={peca.prioridade as any} size="sm" />
        </TableCell>
        
        <TableCell className="w-14 px-1 text-center">
          <div className="flex justify-center items-center">
            {!peca.tem_componentes ? (
              <div 
                className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800/90 border border-slate-700 text-slate-400 shadow-sm" 
                title="Peça única (sem componentes)"
              >
                <Minus className="h-3 w-3 text-slate-400 font-bold" />
              </div>
            ) : (
              <div 
                onClick={toggleExpand}
                className="cursor-pointer flex items-center justify-center w-5 h-5 bg-blue-500 hover:bg-blue-600 rounded-full shadow-sm transition-transform hover:scale-105" 
                title="Peça composta por componentes. Clique para abrir."
              >
                <Layers className="h-3 w-3 text-white font-bold" />
              </div>
            )}
          </div>
        </TableCell>
        
        <TableCell className="w-12 px-2 text-right font-medium text-foreground text-xs">
          {peca.quantidade}
        </TableCell>
        
        <TableCell className="w-16 px-2 text-right text-muted-foreground text-xs">
          {peca.peso_unitario} kg
        </TableCell>
        
        <TableCell className="w-16 px-2 text-right font-semibold text-foreground text-xs">
          {(peca.peso_total || (peca.quantidade * peca.peso_unitario)).toFixed(2)} kg
        </TableCell>
        
        <TableCell className="w-20 px-2 text-right font-mono font-medium text-foreground text-xs">
          {peca.comprimento != null && Number(peca.comprimento) > 0 ? `${Number(peca.comprimento).toLocaleString('pt-BR')} mm` : '-'}
        </TableCell>
        
        <TableCell className="w-16 px-2 text-muted-foreground text-xs">
          {peca.material || '-'}
        </TableCell>
        
        <TableCell className="w-16 px-2 text-muted-foreground text-xs">
          {peca.perfil_principal || '-'}
        </TableCell>
        
        <TableCell className="w-20 px-2">
          <div className="flex items-center gap-1 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenComponentPopup}
              title={`Gerenciar ${labels.componentePlural}`}
              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
            >
              <Package className="h-3.5 w-3.5" />
            </Button>
            
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                title="Editar peça"
                className="h-6 w-6 p-0"
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
            
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                title="Excluir peça"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </TableCell>
      </UITableRow>

      {/* Sub-linha Expansível de Componentes (Acordeão / Master-Detail Inline) */}
      {isExpanded && (
        <UITableRow className="bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
          <TableCell colSpan={13} className="p-0">
            <div className="p-3 pl-8 pr-4 border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/50 via-slate-50/30 to-transparent dark:from-blue-950/30 dark:via-slate-900/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {labels.componentePlural} da {labels.pecaLabel} {peca.marca}
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300">
                    {loading ? 'Carregando...' : `${componentes.length} subitens cadastrados`}
                  </Badge>
                  <span className="text-[11px] text-slate-500">
                    • Lote total da peça: {peca.quantidade} un
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={onOpenComponentPopup}
                  className="h-6 text-[11px] px-2 text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Abrir Gerenciador Completo
                </Button>
              </div>

              {loading ? (
                <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  Buscando {labels.componentePlural.toLowerCase()} no banco...
                </div>
              ) : componentes.length === 0 ? (
                <div className="py-3 px-4 rounded-lg bg-amber-50/60 border border-amber-200/70 dark:bg-amber-950/20 dark:border-amber-900/40 flex items-center justify-between">
                  <span className="text-xs text-amber-800 dark:text-amber-300">
                    Nenhum {labels.componenteLabel.toLowerCase()} individual foi vinculado a esta peça no banco ainda.
                  </span>
                  <Button
                    size="sm"
                    onClick={onOpenComponentPopup}
                    className="h-6 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium px-2.5"
                  >
                    + Cadastrar Componente
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2 pl-3">Marca {labels.componenteLabel}</th>
                        <th className="p-2">Descrição / Perfil</th>
                        <th className="p-2 text-right">Comp. (mm)</th>
                        <th className="p-2 text-center">Qtd / {labels.pecaLabel}</th>
                        <th className="p-2 text-center font-bold">Qtd Total no Lote</th>
                        <th className="p-2 text-right">Peso Unit. (kg)</th>
                        <th className="p-2 text-right">Peso Total (kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                      {componentes.map((comp) => {
                        const qtdPorPeca = comp.quantidade_por_peca || 1;
                        const qtdTotalLote = qtdPorPeca * (peca.quantidade || 1);
                        const pesoUnit = comp.peso_unitario || 0;
                        const pesoTotalLote = qtdTotalLote * pesoUnit;

                        return (
                          <tr key={comp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-2 pl-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 font-mono text-[11px]">
                                {comp.marca_componente}
                              </Badge>
                            </td>
                            <td className="p-2 text-slate-700 dark:text-slate-300 font-medium">
                              {comp.perfil || comp.descricao || '-'}
                            </td>
                            <td className="p-2 text-right font-mono text-slate-700 dark:text-slate-300">
                              {comp.comprimento != null && Number(comp.comprimento) > 0 ? `${Number(comp.comprimento).toLocaleString('pt-BR')} mm` : '-'}
                            </td>
                            <td className="p-2 text-center font-mono text-slate-600 dark:text-slate-400">
                              {qtdPorPeca} un
                            </td>
                            <td className="p-2 text-center font-mono font-bold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/30">
                              {qtdTotalLote} un
                            </td>
                            <td className="p-2 text-right font-mono text-slate-600 dark:text-slate-400">
                              {pesoUnit > 0 ? `${pesoUnit.toFixed(2)} kg` : '-'}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {pesoTotalLote > 0 ? `${pesoTotalLote.toFixed(2)} kg` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TableCell>
        </UITableRow>
      )}
    </>
  );
}
