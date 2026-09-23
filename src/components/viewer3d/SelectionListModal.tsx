import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Copy,
  Check,
  Trash2,
  Layers,
  Box,
  CheckCircle2,
  Clock,
  Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export interface SelectedPieceItem {
  id: string; // mesh.uuid
  pieceMark: string;
  phase?: string;
  section?: string;
  name?: string;
  pointedQty?: number;
  totalQty?: number;
  currentStage?: string;
  stageColor?: string;
}

interface SelectionListModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPieces: SelectedPieceItem[];
  selectedOF?: string;
  onClearSelection: () => void;
}

export const SelectionListModal: React.FC<SelectionListModalProps> = ({
  isOpen,
  onClose,
  selectedPieces,
  selectedOF,
  onClearSelection,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Agrupamento por Marca + Fase para consolidar quantidades
  const groupedMap = new Map<
    string,
    {
      pieceMark: string;
      phase: string;
      section: string;
      selectedCount: number;
      totalQty: number;
      pointedQty: number;
      currentStage: string;
      stageColor: string;
    }
  >();

  selectedPieces.forEach((p) => {
    const key = `${p.phase || '1'}_${p.pieceMark || 'Sem Marca'}`;
    const existing = groupedMap.get(key);
    if (existing) {
      existing.selectedCount += 1;
    } else {
      groupedMap.set(key, {
        pieceMark: p.pieceMark || 'Sem Marca',
        phase: p.phase || '-',
        section: p.section || '-',
        selectedCount: 1,
        totalQty: p.totalQty || 1,
        pointedQty: p.pointedQty || 0,
        currentStage: p.currentStage || 'Pendente',
        stageColor: p.stageColor || '#64748b',
      });
    }
  });

  const consolidatedList = Array.from(groupedMap.values());
  const totalPhysicalPieces = selectedPieces.length;
  const totalDistinctMarks = consolidatedList.length;

  // Exportação para Excel
  const handleExportExcel = () => {
    if (consolidatedList.length === 0) {
      toast.warning('Nenhuma peça selecionada para exportar.');
      return;
    }

    try {
      const dataRows = consolidatedList.map((item, idx) => ({
        'Item': idx + 1,
        'Ordem de Fabricação (OF)': selectedOF || '-',
        'Fase': item.phase,
        'Marca Principal': item.pieceMark,
        'Perfil / Bitola': item.section,
        'Qtd. Selecionada no 3D': item.selectedCount,
        'Qtd. Total Cadastrada': item.totalQty,
        'Qtd. Apontada na Fábrica': item.pointedQty,
        'Etapa / Status Atual': item.currentStage,
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Peças Selecionadas');

      // Ajuste de largura das colunas
      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 24 },
        { wch: 10 },
        { wch: 18 },
        { wch: 22 },
        { wch: 22 },
        { wch: 20 },
        { wch: 22 },
        { wch: 20 },
      ];

      const fileName = `Selecao_3D_${selectedOF || 'OF'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success('Planilha Excel gerada com sucesso!', {
        description: fileName,
      });
    } catch (err) {
      console.error('Erro ao gerar Excel:', err);
      toast.error('Falha ao exportar para Excel.');
    }
  };

  // Copiar para Área de Transferência
  const handleCopy = () => {
    if (consolidatedList.length === 0) return;

    const headers = ['OF', 'Fase', 'Marca', 'Perfil', 'Qtd Selecionada', 'Qtd Total', 'Status'];
    const lines = consolidatedList.map((item) =>
      [
        selectedOF || '-',
        item.phase,
        item.pieceMark,
        item.section,
        item.selectedCount,
        item.totalQty,
        item.currentStage,
      ].join('\t')
    );

    const textToCopy = [headers.join('\t'), ...lines].join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Lista copiada para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header do Modal com Destaque Magenta */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-fuchsia-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/40 shadow-lg shadow-fuchsia-950/50">
              <FileSpreadsheet className="w-5 h-5 text-fuchsia-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Lista de Peças Selecionadas no 3D
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40">
                  {totalPhysicalPieces} {totalPhysicalPieces === 1 ? 'peça' : 'peças'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Relação consolidada das peças marcadas em magenta permanente no modelo 3D
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* KPIs Resumo no Topo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 pb-4 bg-slate-950/40 border-b border-slate-800/60">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                Total de Peças
              </span>
              <span className="text-lg font-extrabold text-fuchsia-300 font-mono">
                {totalPhysicalPieces}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                Marcas Distintas
              </span>
              <span className="text-lg font-extrabold text-cyan-300 font-mono">
                {totalDistinctMarks}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                Ordem de Fabricação
              </span>
              <span className="text-sm font-bold text-emerald-300 truncate max-w-[120px] block">
                {selectedOF || 'N/A'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                Status
              </span>
              <span className="text-sm font-bold text-amber-300 block">
                {totalPhysicalPieces > 0 ? 'Filtro Ativo' : 'Vazio'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabela de Itens Selecionados com Rolagem Suave */}
        <div className="flex-1 overflow-y-auto p-6">
          {consolidatedList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
              <Box className="w-12 h-12 stroke-[1.5] mb-3 text-slate-600" />
              <p className="text-sm font-semibold text-slate-400">Nenhuma peça selecionada</p>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Clique nas peças na cena 3D (ou clique duplo para pegar todas da mesma marca) para incluí-las nesta lista.
              </p>
            </div>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden shadow-inner bg-slate-950/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-300 uppercase font-mono text-[10px] tracking-wider border-b border-slate-700/80">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Marca Principal</th>
                    <th className="py-3 px-3 font-semibold text-center">Fase</th>
                    <th className="py-3 px-4 font-semibold">Perfil / Bitola</th>
                    <th className="py-3 px-3 font-semibold text-center text-fuchsia-400">
                      Qtd. 3D
                    </th>
                    <th className="py-3 px-3 font-semibold text-center">Qtd. OF</th>
                    <th className="py-3 px-4 font-semibold text-center">Etapa / Apontamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {consolidatedList.map((item, idx) => (
                    <tr
                      key={`${item.phase}_${item.pieceMark}_${idx}`}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-fuchsia-500 inline-block shadow-sm shadow-fuchsia-500" />
                        {item.pieceMark}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {item.phase}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {item.section}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-extrabold text-sm text-fuchsia-300">
                        {item.selectedCount}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-400">
                        {item.pointedQty} / {item.totalQty}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5"
                          style={{
                            backgroundColor: `${item.stageColor}20`,
                            color: item.stageColor,
                            border: `1px solid ${item.stageColor}40`,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: item.stageColor }}
                          />
                          {item.currentStage}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rodapé com Botões de Ação */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <button
            onClick={() => {
              onClearSelection();
              toast.info('Seleção 3D limpa com sucesso.');
            }}
            disabled={totalPhysicalPieces === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpar Seleção</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={totalPhysicalPieces === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-300" />
                  <span>Copiar Lista</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportExcel}
              disabled={totalPhysicalPieces === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white shadow-lg shadow-fuchsia-950/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
