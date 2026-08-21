import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSpreadsheet, Upload, Download, CheckCircle2, AlertCircle, Trash2, ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export interface PecaXLSData {
  of_number: string;
  etapa_fase: string;
  marca: string;
  descricao: string;
  quantidade: number;
  peso_unitario: number;
  peso_total: number;
  tratamento_superficial: string;
  material: string;
  perfil_principal: string;
  tem_componentes: boolean;
  comprimento_ref?: number | string;
}

interface ImportarXLSModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (pecas: any[]) => Promise<void>;
  ofDefault?: string;
}

export function ImportarXLSModal({
  open,
  onOpenChange,
  onImport,
  ofDefault = '',
}: ImportarXLSModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [pecasProcessadas, setPecasProcessadas] = useState<PecaXLSData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setPecasProcessadas([]);
    setIsProcessing(false);
    setIsImporting(false);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleModalOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  // Função auxiliar para converter valores para número seguro
  const parseNumber = (val: any): number => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    
    // String: trata "1.413,00" ou "1,413.00" ou "1413"
    let str = String(val).trim();
    // Se tiver vírgula e ponto, identifica separador decimal
    if (str.includes('.') && str.includes(',')) {
      if (str.indexOf('.') < str.indexOf(',')) {
        // Ex: 1.413,00 (padrão BR)
        str = str.replace(/\./g, '').replace(',', '.');
      } else {
        // Ex: 1,413.00 (padrão US)
        str = str.replace(/,/g, '');
      }
    } else if (str.includes(',')) {
      // Ex: 1413,50
      str = str.replace(',', '.');
    }
    
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  // Parser robusto do arquivo Excel/XLSX/XLS/CSV
  const processExcelFile = async (selectedFile: File) => {
    setIsProcessing(true);
    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        toast.error('O arquivo Excel não contém nenhuma planilha.');
        setIsProcessing(false);
        return;
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Converte para matriz de linhas (array de arrays) para busca flexível do cabeçalho
      const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (!rawRows || rawRows.length === 0) {
        toast.error('A planilha selecionada está vazia.');
        setIsProcessing(false);
        return;
      }

      // 1. Procurar a linha de cabeçalho
      let headerRowIndex = -1;
      let colMap: { [key: string]: number } = {};

      const normalizeStr = (s: any) =>
        String(s || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '');

      for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
        const row = rawRows[r];
        if (!Array.isArray(row)) continue;

        const rowStr = row.map(normalizeStr).join(' ');
        if (
          rowStr.includes('marca') ||
          rowStr.includes('descricao') ||
          rowStr.includes('perfil') ||
          rowStr.includes('peso') ||
          rowStr.includes('quant')
        ) {
          headerRowIndex = r;
          break;
        }
      }

      const pecasLidas: PecaXLSData[] = [];

      if (headerRowIndex !== -1) {
        // Mapeia colunas por nome
        const headers = rawRows[headerRowIndex].map((h: any) => normalizeStr(h));
        headers.forEach((h: string, colIdx: number) => {
          if ((h === 'of' || h.includes('trabalho') || h.includes('numof') || h.includes('numeroof')) && colMap['of'] === undefined) colMap['of'] = colIdx;
          else if ((h.includes('fase') || h.includes('etapa')) && colMap['fase'] === undefined) colMap['fase'] = colIdx;
          else if ((h.includes('marca') || h.includes('posicao') || h.includes('item') || h === 'pos') && colMap['marca'] === undefined) colMap['marca'] = colIdx;
          else if ((h.includes('desc') || h.includes('nome')) && colMap['descricao'] === undefined) colMap['descricao'] = colIdx;
          else if ((h.includes('comp') && (h.includes('componente') || h.includes('composto') || h.includes('con'))) && colMap['componentes'] === undefined) colMap['componentes'] = colIdx;
          else if ((h.includes('quant') || h.includes('qtd')) && colMap['quantidade'] === undefined) colMap['quantidade'] = colIdx;
          else if ((h.includes('pesounit') || h.includes('pesodapeca') || (h.includes('unit') && h.includes('peso'))) && colMap['peso_unitario'] === undefined) colMap['peso_unitario'] = colIdx;
          else if ((h.includes('pesototal') || h.includes('totalpeso') || (h.includes('total') && h.includes('peso'))) && colMap['peso_total'] === undefined) colMap['peso_total'] = colIdx;
          else if ((h.includes('tratam') || h.includes('superf') || h.includes('pintura') || h.includes('acab')) && colMap['tratamento'] === undefined) colMap['tratamento'] = colIdx;
          else if ((h.includes('mat') || h.includes('qualidade') || h.includes('aco')) && colMap['material'] === undefined) colMap['material'] = colIdx;
          else if ((h.includes('perfil') || h.includes('perfilprinc')) && colMap['perfil_principal'] === undefined) colMap['perfil_principal'] = colIdx;
          else if ((h.includes('compriment') || h.includes('comprmm') || h.includes('length')) && colMap['comprimento'] === undefined) colMap['comprimento'] = colIdx;
        });

        // Itera sobre as linhas de dados após o cabeçalho
        for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || row.length === 0) continue;

          // Se a linha estiver totalmente vazia
          if (row.every((cell: any) => cell === '' || cell === null || cell === undefined)) continue;

          const getColVal = (key: string, fallbackIdx?: number) => {
            if (colMap[key] !== undefined && row[colMap[key]] !== undefined) {
              return row[colMap[key]];
            }
            if (fallbackIdx !== undefined && row[fallbackIdx] !== undefined) {
              return row[fallbackIdx];
            }
            return '';
          };

          const rawMarca = String(getColVal('marca', 2)).trim();
          const rawDesc = String(getColVal('descricao', 3)).trim();
          const rawPerfil = String(getColVal('perfil_principal', 9) || rawDesc).trim();

          // Ignora linhas de totalizadores ou sem marca
          if (!rawMarca || rawMarca.toLowerCase().includes('total')) continue;

          let ofNumber = String(getColVal('of', 0)).trim();
          if (!ofNumber) {
            ofNumber = ofDefault || 'B132';
          }
          // Normaliza formato da OF se necessário (ex: "B-129" -> "B129")
          ofNumber = ofNumber.replace(/^B-(\d+)/i, 'B$1');

          let etapaFase = String(getColVal('fase', 1)).trim();
          if (!etapaFase) etapaFase = 'Fabricação';

          const quantidade = Math.max(1, Math.round(parseNumber(getColVal('quantidade', 4)) || 1));
          let pesoUnit = parseNumber(getColVal('peso_unitario', 5));
          let pesoTot = parseNumber(getColVal('peso_total', 6));

          if (pesoTot > 0 && pesoUnit === 0) {
            pesoUnit = Math.round(pesoTot / quantidade);
          } else if (pesoUnit > 0 && pesoTot === 0) {
            pesoTot = Math.round(pesoUnit * quantidade);
          }

          // Tratamento superficial: regra do usuário -> sempre preencher "pintura" por padrão
          let tratSuperficial = String(getColVal('tratamento', 7)).trim();
          if (!tratSuperficial) {
            tratSuperficial = 'pintura';
          }

          let material = String(getColVal('material', 8)).trim();
          if (!material) {
            material = 'Aço A36';
          }

          const rawComp = String(getColVal('componentes', 4)).toLowerCase();
          const temComponentes = rawComp === 'sim' || rawComp === 'true' || rawComp === '1';
          const comprimentoRef = getColVal('comprimento', 10);

          pecasLidas.push({
            of_number: ofNumber,
            etapa_fase: etapaFase,
            marca: rawMarca,
            descricao: rawDesc || rawPerfil,
            quantidade,
            peso_unitario: pesoUnit,
            peso_total: pesoTot,
            tratamento_superficial: tratSuperficial,
            material,
            perfil_principal: rawPerfil || rawDesc,
            tem_componentes: temComponentes,
            comprimento_ref: comprimentoRef || undefined,
          });
        }
      } else {
        // Fallback por ordem posicional estrita:
        // Coluna 0: OF, 1: Fase, 2: Marca, 3: Descrição, 4: Quantidade, 5: Peso Unit, 6: Peso Total, 7: Tratamento, 8: Material, 9: Perfil Principal
        for (let r = 0; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || row.length < 3) continue;

          const rawMarca = String(row[2] || row[0]).trim();
          if (!rawMarca || rawMarca.toLowerCase().includes('marca') || rawMarca.toLowerCase().includes('total')) continue;

          let ofNumber = String(row[0] || ofDefault || 'B132').trim().replace(/^B-(\d+)/i, 'B$1');
          let etapaFase = String(row[1] || 'Fabricação').trim();
          let rawDesc = String(row[3] || '').trim();
          let quantidade = Math.max(1, Math.round(parseNumber(row[4]) || 1));
          let pesoUnit = parseNumber(row[5]);
          let pesoTot = parseNumber(row[6]) || (pesoUnit * quantidade);
          let tratSuperficial = String(row[7] || 'pintura').trim() || 'pintura';
          let material = String(row[8] || 'Aço A36').trim();
          let perfilPrincipal = String(row[9] || rawDesc).trim();

          pecasLidas.push({
            of_number: ofNumber,
            etapa_fase: etapaFase,
            marca: rawMarca,
            descricao: rawDesc || perfilPrincipal,
            quantidade,
            peso_unitario: pesoUnit,
            peso_total: pesoTot,
            tratamento_superficial: tratSuperficial,
            material,
            perfil_principal: perfilPrincipal,
            tem_componentes: false,
          });
        }
      }

      if (pecasLidas.length === 0) {
        toast.error('Nenhuma linha de peça válida foi identificada no arquivo.');
        setIsProcessing(false);
        return;
      }

      setPecasProcessadas(pecasLidas);
      setStep('preview');
      toast.success(`${pecasLidas.length} peça(s) identificada(s) com sucesso no arquivo!`);
    } catch (err: any) {
      console.error('Erro ao processar planilha:', err);
      toast.error(`Falha ao ler o arquivo Excel: ${err.message || 'Formato não suportado'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      processExcelFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      processExcelFile(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleRemovePeca = (index: number) => {
    setPecasProcessadas(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleImportSubmit = async () => {
    if (pecasProcessadas.length === 0) {
      toast.error('Nenhuma peça para importar.');
      return;
    }

    setIsImporting(true);
    try {
      const pecasPayload = pecasProcessadas.map(p => ({
        of_number: p.of_number,
        etapa_fase: p.etapa_fase,
        marca: p.marca,
        descricao: p.descricao,
        quantidade: p.quantidade,
        peso_unitario: p.peso_unitario,
        peso_total: p.peso_total,
        tratamento_superficial: p.tratamento_superficial || 'pintura',
        material: p.material,
        perfil_principal: p.perfil_principal,
        tem_componentes: p.tem_componentes,
      }));

      await onImport(pecasPayload);
      toast.success(`${pecasProcessadas.length} peças importadas com sucesso para a OF!`);
      handleModalOpenChange(false);
    } catch (err: any) {
      console.error('Erro ao importar peças do Excel:', err);
      toast.error(`Erro ao salvar peças: ${err.message || 'Falha de comunicação'}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Gerar e baixar modelo Excel (.xlsx) oficial
  const handleDownloadModeloXLS = () => {
    const headers = [
      'OF',
      'Fase',
      'Marca',
      'Descrição',
      'Composto por Componentes',
      'Quantidade',
      'Peso Unitário (kg)',
      'Peso Total (kg)',
      'Tratamento Superficial',
      'Material',
      'Perfil Principal',
      'Comprimento Ref. (mm)'
    ];

    const exampleRows = [
      [ofDefault || 'B129', '2', '1', 'W 310x38.7', 'SIM', 1, 1413, 1413, 'pintura', 'A572-GR 50', 'W 310x38.7', 3241],
      [ofDefault || 'B129', '2', '2', 'W 310x38.7', 'SIM', 1, 2549, 2549, 'pintura', 'A572-GR 50', 'W 310x38.7', 6000],
      [ofDefault || 'B129', '2', '3', 'W 310x38.7', 'SIM', 1, 2379, 2379, 'pintura', 'A572-GR 50', 'W 310x38.7', 5780],
      [ofDefault || 'B129', '2', '4', 'W 310x38.7', 'SIM', 1, 2287, 2287, 'pintura', 'A572-GR 50', 'W 310x38.7', 5762],
      [ofDefault || 'B129', '2', '13', 'W 150x13.0', 'NÃO', 1, 2886, 2886, 'pintura', 'A36', 'W 150x13.0', ''],
      [ofDefault || 'B129', '2', '15', 'L3X3X1/4', 'NÃO', 1, 545, 545, 'pintura', 'A36', 'L3X3X1/4', ''],
      [ofDefault || 'B129', '2', '20', 'W 150x13.0', 'SIM', 1, 1249, 1249, 'pintura', 'A572-GR 50', 'W 150x13.0', 2841]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);

    // Ajusta largura das colunas
    ws['!cols'] = [
      { wch: 10 }, // OF
      { wch: 8 },  // Fase
      { wch: 10 }, // Marca
      { wch: 18 }, // Descrição
      { wch: 25 }, // Composto por
      { wch: 12 }, // Qtd
      { wch: 18 }, // Peso Unit
      { wch: 16 }, // Peso Total
      { wch: 22 }, // Tratamento
      { wch: 16 }, // Material
      { wch: 18 }, // Perfil Principal
      { wch: 22 }  // Comprimento
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lista de Peças');
    XLSX.writeFile(wb, 'modelo_importacao_pecas.xlsx');
    toast.success('Modelo Excel (.xlsx) baixado com sucesso!');
  };

  const totalPesoCalculado = pecasProcessadas.reduce((acc, p) => acc + (p.peso_total || 0), 0);
  const totalQuantidade = pecasProcessadas.reduce((acc, p) => acc + (p.quantidade || 0), 0);

  return (
    <Dialog open={open} onOpenChange={handleModalOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 bg-card text-card-foreground border-border">
        <DialogHeader className="pb-3 border-b border-border">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-emerald-500" />
              <span className="text-xl font-bold">Importar Peças via Planilha Excel (XLS / XLSX)</span>
            </div>
            {ofDefault && (
              <Badge variant="outline" className="text-sm font-semibold border-primary text-primary">
                OF Alvo: {ofDefault}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' ? (
          <div className="space-y-6 py-4">
            {/* Zona de Drop / Upload */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer transition-colors bg-muted/30 hover:bg-muted/60"
            >
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-full">
                  <Upload className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">
                    Clique para selecionar ou arraste sua planilha Excel aqui
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Suporta arquivos <b>.xlsx</b>, <b>.xls</b> e <b>.csv</b>
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-2 pointer-events-none">
                  Selecionar Arquivo
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {isProcessing && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground p-4 bg-muted/20 rounded-lg">
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-500" />
                <span>Processando e validando linhas da planilha...</span>
              </div>
            )}

            {/* Informações sobre a estrutura */}
            <div className="bg-muted/40 rounded-lg p-4 border border-border space-y-2 text-xs text-muted-foreground">
              <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Ordem e Colunas Suportadas:
              </div>
              <p>
                A planilha pode conter as seguintes colunas (na ordem ou por cabeçalho):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px] pt-1">
                <span className="p-1.5 bg-background rounded border border-border">1. OF</span>
                <span className="p-1.5 bg-background rounded border border-border">2. Fase</span>
                <span className="p-1.5 bg-background rounded border border-border">3. Marca</span>
                <span className="p-1.5 bg-background rounded border border-border">4. Descrição</span>
                <span className="p-1.5 bg-background rounded border border-border">5. Quantidade</span>
                <span className="p-1.5 bg-background rounded border border-border">6. Peso Unitário (kg)</span>
                <span className="p-1.5 bg-background rounded border border-border">7. Peso Total (kg)</span>
                <span className="p-1.5 bg-background rounded border border-border">8. Tratamento (pintura)</span>
                <span className="p-1.5 bg-background rounded border border-border">9. Material (Aço)</span>
                <span className="p-1.5 bg-background rounded border border-border">10. Perfil Principal</span>
              </div>
              <p className="pt-2 text-[11px]">
                💡 <i>Dica: O campo de Tratamento Superficial será preenchido automaticamente como <b>"pintura"</b> caso venha em branco.</i>
              </p>
            </div>

            {/* Ações inferiores */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadModeloXLS}
                className="flex items-center gap-2 text-xs"
              >
                <Download className="h-4 w-4 text-emerald-600" />
                Baixar Modelo Excel (.xlsx)
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleModalOpenChange(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          /* Step Preview */
          <div className="flex-1 flex flex-col space-y-4 py-2 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border border-border text-sm">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-muted-foreground">Total de Peças:</span>{' '}
                  <b className="text-foreground text-base">{pecasProcessadas.length}</b> ({totalQuantidade} un.)
                </div>
                <div>
                  <span className="text-muted-foreground">Peso Total:</span>{' '}
                  <b className="text-emerald-500 text-base">
                    {totalPesoCalculado.toLocaleString('pt-BR')} kg
                  </b>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({(totalPesoCalculado / 1000).toFixed(3)} t)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep('upload')}
                  className="flex items-center gap-1 text-xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Trocar Arquivo
                </Button>
              </div>
            </div>

            {/* Tabela de Preview */}
            <ScrollArea className="flex-1 max-h-[380px] border border-border rounded-md">
              <Table>
                <TableHeader className="bg-muted/60 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-16">OF</TableHead>
                    <TableHead className="w-16">Fase</TableHead>
                    <TableHead className="w-20">Marca</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-16 text-center">Qtd</TableHead>
                    <TableHead className="w-24 text-right">Peso Un. (kg)</TableHead>
                    <TableHead className="w-24 text-right">Peso Total (kg)</TableHead>
                    <TableHead className="w-24">Tratamento</TableHead>
                    <TableHead className="w-24">Material</TableHead>
                    <TableHead className="w-28">Perfil Princ.</TableHead>
                    <TableHead className="w-12 text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pecasProcessadas.map((peca, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/30">
                      <TableCell className="font-semibold text-primary text-xs">{peca.of_number}</TableCell>
                      <TableCell className="text-xs">{peca.etapa_fase}</TableCell>
                      <TableCell className="font-bold text-xs">{peca.marca}</TableCell>
                      <TableCell className="text-xs font-mono">{peca.descricao}</TableCell>
                      <TableCell className="text-center text-xs font-semibold">{peca.quantidade}</TableCell>
                      <TableCell className="text-right text-xs">{peca.peso_unitario.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right text-xs font-semibold text-emerald-500">
                        {peca.peso_total.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-xs">{peca.tratamento_superficial}</TableCell>
                      <TableCell className="text-xs">{peca.material}</TableCell>
                      <TableCell className="text-xs font-mono">{peca.perfil_principal}</TableCell>
                      <TableCell className="text-center p-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemovePeca(idx)}
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <DialogFooter className="pt-3 border-t border-border flex items-center justify-between sm:justify-between w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleModalOpenChange(false)}
                disabled={isImporting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleImportSubmit}
                disabled={isImporting || pecasProcessadas.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Importando {pecasProcessadas.length} Peças...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmar e Importar {pecasProcessadas.length} Peças
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
