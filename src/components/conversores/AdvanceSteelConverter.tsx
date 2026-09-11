import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileSpreadsheet, Download, RefreshCw, Terminal, FileText, Code2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export interface ExtractedPiece {
  of: string;
  fase: string;
  marca: string;
  descricao: string;
  isComposed: 'SIM' | 'NÃO';
  quantidade: number;
  material: string;
  perfilPrincipal: string;
  comprimentoMax: number | string;
  pesoUnit: number | string;
  pesoTotal: number | string;
  tratamentoSuperficial: string;
}

interface ComponentItem {
  quantidade: number;
  perfil: string;
  material: string;
  comprimento: number;
  pesoUnitario?: number;
  pesoTotal: number;
}

interface AssemblyItem {
  rawMark: string;
  of: string;
  fase: string;
  marca: string;
  numeroPeca: string;
  descricao: string;
  quantidade: number;
  material: string;
  comprimento: number;
  pesoUnitario: number;
  pesoTotal: number;
  subtotalPeso: number;
  isComposed: 'SIM' | 'NÃO';
  components: ComponentItem[];
}

interface PdfItem {
  text: string;
  x: number;
  y: number;
  page: number;
}

interface AdvanceSteelConverterProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface PdfTextItem {
  str: string;
  transform: number[];
}

interface PdfPage {
  getTextContent: () => Promise<{ items: PdfTextItem[] }>;
}

interface PdfDocument {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
}

interface PdfJsLib {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (options: { data: ArrayBuffer }) => { promise: Promise<PdfDocument> };
}

// Carregador robusto do PDF.js
const ensurePdfJs = async (): Promise<PdfJsLib> => {
  const win = window as unknown as { pdfjsLib?: PdfJsLib };
  if (win.pdfjsLib) {
    win.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    return win.pdfjsLib;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'pdfjs-script-cdn';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjs = (window as unknown as { pdfjsLib?: PdfJsLib }).pdfjsLib;
      if (pdfjs) {
        pdfjs.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(pdfjs);
      } else {
        reject(new Error('pdfjsLib não foi encontrado após carregar a CDN.'));
      }
    };
    script.onerror = () => reject(new Error('Falha ao carregar script PDF.js via CDN.'));
    document.head.appendChild(script);
  });
};

const AdvanceSteelConverterContent: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedPiece[]>([]);
  const [logs, setLogs] = useState<string[]>(['> Aguardando seleção do PDF...']);
  const [statusText, setStatusText] = useState<string>('Aguardando arquivo PDF...');
  const [currentFileName, setCurrentFileName] = useState<string>('Lista_Pecas');
  const [useIframeMode, setUseIframeMode] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensurePdfJs().catch((err) => console.warn('Preload PDF.js notice:', err));
  }, []);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `> ${msg}`]);
    setTimeout(() => {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const parseNumeric = (valStr: string | number): number => {
    if (!valStr) return 0;
    let clean = valStr.toString().trim();
    if (clean.includes(',') && clean.includes('.')) {
      if (clean.indexOf('.') < clean.indexOf(',')) {
        clean = clean.replace(/\./g, '').replace(',', '.');
      } else {
        clean = clean.replace(/,/g, '');
      }
    } else if (clean.includes(',')) {
      clean = clean.replace(',', '.');
    } else if (clean.includes('.')) {
      const parts = clean.split('.');
      if (parts.length === 2 && parts[1].length === 3) {
        clean = parts[0] + parts[1];
      }
    }
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const processPdfLines = (items: PdfItem[]) => {
    items.sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page;
      if (Math.abs(b.y - a.y) > 3) return b.y - a.y;
      return a.x - b.x;
    });

    const lines: PdfItem[][] = [];
    let currentLine: PdfItem[] = [];
    let lastY: number | null = null;
    let lastPage: number | null = null;

    items.forEach((item) => {
      if (lastPage === null || item.page !== lastPage || Math.abs(item.y - (lastY ?? item.y)) > 4.5) {
        if (currentLine.length > 0) {
          lines.push(currentLine);
        }
        currentLine = [item];
        lastY = item.y;
        lastPage = item.page;
      } else {
        currentLine.push(item);
      }
    });
    if (currentLine.length > 0) lines.push(currentLine);

    addLog(`Total de linhas identificadas no PDF: ${lines.length}`);

    let defaultOf = '';
    for (const line of lines) {
      const lineText = line.map((i) => i.text).join(' ');
      const matchTrabalho = lineText.match(/Trabalho:\s*([A-Za-z0-9-]+)/i) || lineText.match(/Projeto:\s*([A-Za-z0-9-]+)/i);
      if (matchTrabalho) {
        defaultOf = matchTrabalho[1].replace(/-/g, '');
        addLog(`OF / Trabalho identificado no cabeçalho: ${defaultOf}`);
        break;
      }
    }

    const KNOWN_MATERIALS = [
      'A572-GR 50', 'A572-GR50', 'A572-GR.50', 'A572 GR50', 'A572GR50', 'A572GR5', 'A572',
      'A36', 'ASTM A36', 'ASTM A572', '10.9', '8.8', 'SAE 1020', 'SAE 1045', 'INOX', '304', '316'
    ];

    const normalizeLineText = (lineStr: string): string => {
      let s = lineStr.trim();
      s = s.replace(/([A-Za-z0-9]+)\s*-\s*(\d+)\s*-\s*(\d+)/g, '$1-$2-$3');
      s = s.replace(/([A-Za-z0-9]+)\s*-\s*(\d+)/g, '$1-$2');
      s = s.replace(/A572\s*-\s*GR\s*50/gi, 'A572-GR 50');
      s = s.replace(/A572\s*-\s*GR/gi, 'A572-GR');
      return s;
    };

    const assemblies: AssemblyItem[] = [];
    let currentAssembly: AssemblyItem | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let rawLineText = line.map((it) => it.text).join(' ').trim();
      const lineText = normalizeLineText(rawLineText);

      // Ignorar cabeçalhos e metadados conhecidos
      if (
        lineText.includes('LISTA DE PEÇAS') ||
        lineText.includes('LISTA ESTRUTURADA') ||
        lineText.includes('DetailDwgExtract') ||
        lineText.includes('Cliente:') ||
        lineText.includes('Desenhado') ||
        lineText.includes('Superfície') ||
        lineText.includes('Trabalho:') ||
        lineText.includes('Kg/piece') ||
        lineText.includes('( mm)') ||
        (lineText.toLowerCase().includes('marca') && lineText.toLowerCase().includes('nome'))
      ) {
        continue;
      }

      // 1. Linha Mestre de Peça Principal (ex: "B133-1-20 Pl 6x160x154" ou "B133-1-20 2 Pl 6x160x154")
      const masterMatch = lineText.match(/^([A-Za-z0-9]+(?:-\d+)+)(?:\s+(\d+))?\s+([A-Za-z].*)$/);

      if (masterMatch) {
        const fullMark = masterMatch[1];
        const quant = masterMatch[2] ? parseInt(masterMatch[2], 10) : 1;
        const descCandidate = masterMatch[3].trim();
        const parts = fullMark.split('-');
        const pieceNumber = parts[parts.length - 1];
        const pieceNumInt = parseInt(pieceNumber, 10);

        // Se o número da peça for menor que 1000, é uma peça principal mestre
        if (pieceNumInt < 1000) {
          const hasMaterial = KNOWN_MATERIALS.some((m) => descCandidate.includes(m));

          if (!hasMaterial) {
            const ofCode = parts.length >= 2 ? parts[0] : defaultOf;
            const phaseCode = parts.length >= 3 ? parts[1] : '0';

            currentAssembly = {
              rawMark: fullMark,
              of: ofCode || defaultOf,
              fase: phaseCode,
              marca: pieceNumber,
              numeroPeca: pieceNumber,
              descricao: descCandidate || 'ESTRUTURA',
              quantidade: quant > 0 ? quant : 1,
              material: '',
              comprimento: 0,
              pesoUnitario: 0,
              pesoTotal: 0,
              subtotalPeso: 0,
              isComposed: 'NÃO',
              components: []
            };
            assemblies.push(currentAssembly);
            continue;
          }
        }
      }

      // 2. Linha com Subtotal da Marca (ex: "81 3,07" ou "3,5 0,155" ou "2,6 0,25")
      const tokens = lineText.split(/\s+/);
      const allTokensNumeric = tokens.length > 0 && tokens.every((tok) => /^[0-9.,]+$/.test(tok));
      if (allTokensNumeric && tokens.length <= 3) {
        if (currentAssembly && (!currentAssembly.subtotalPeso || currentAssembly.subtotalPeso === 0)) {
          const subP = parseNumeric(tokens[0]);
          if (subP > 0) {
            currentAssembly.subtotalPeso = subP;
          }
        }
        continue;
      }

      // 3. Linha de Detalhe de Monopeça ou Componente Subordinado
      let itemMark = '';
      let itemQuant = 1;
      let remaining = lineText;

      const mMark = remaining.match(/^([A-Za-z0-9]+(?:-\d+)+|-)\s+(\d+)\s+/);
      if (mMark) {
        itemMark = mMark[1];
        itemQuant = parseInt(mMark[2], 10);
        remaining = remaining.substring(mMark[0].length).trim();
      } else if (remaining.startsWith('-')) {
        itemMark = '-';
        remaining = remaining.substring(1).trim();
        const mQ = remaining.match(/^(\d+)\s+/);
        if (mQ) {
          itemQuant = parseInt(mQ[1], 10);
          remaining = remaining.substring(mQ[0].length).trim();
        }
      }

      // Localizar Material dentro de remaining
      let detectedMaterial = '';
      let matIdx = -1;
      let matLen = 0;

      for (const mat of KNOWN_MATERIALS) {
        const idx = remaining.indexOf(mat);
        if (idx !== -1 && idx > matIdx) {
          detectedMaterial = mat;
          matIdx = idx;
          matLen = mat.length;
        }
      }

      let itemDesc = '';
      let afterMat = '';

      if (matIdx !== -1) {
        itemDesc = remaining.substring(0, matIdx).trim();
        afterMat = remaining.substring(matIdx + matLen).trim();
      } else {
        const parts = remaining.split(/\s+/);
        const firstNumIdx = parts.findIndex((p) => /^[0-9.,]+$/.test(p));
        if (firstNumIdx > 0) {
          itemDesc = parts.slice(0, firstNumIdx).join(' ');
          afterMat = parts.slice(firstNumIdx).join(' ');
        } else {
          itemDesc = remaining;
        }
      }

      const numTokens = afterMat.split(/\s+/).filter((tok) => /^[0-9.,]+$/.test(tok));
      const nums = numTokens.map(parseNumeric);

      let itemComp = 0;
      let itemPUn = 0;
      let itemPesoTot = 0;

      if (nums.length >= 1) {
        itemComp = nums[0]; // O comprimento é sempre o primeiro valor numérico após o material
      }

      if (nums.length === 3) {
        itemPUn = nums[1];
        itemPesoTot = nums[2];
      } else if (nums.length === 4) {
        itemPUn = nums[1];
        itemPesoTot = nums[2];
      } else if (nums.length === 5) {
        itemPUn = nums[1];
        itemPesoTot = nums[2];
      } else if (nums.length >= 6) {
        itemPUn = nums[2];
        itemPesoTot = nums[3];
      }

      if (currentAssembly) {
        const isSubComp =
          itemMark === '-' ||
          itemMark.includes('-100') ||
          itemMark.includes('-10') ||
          (itemMark.match(/-\d+$/) && parseInt(itemMark.match(/-(\d+)$/)![1], 10) >= 1000);

        if (isSubComp) {
          currentAssembly.isComposed = 'SIM';
          currentAssembly.components.push({
            quantidade: itemQuant,
            perfil: itemDesc || currentAssembly.descricao,
            material: detectedMaterial || 'A36',
            comprimento: itemComp,
            pesoUnitario: itemPUn,
            pesoTotal: itemPesoTot
          });
        } else {
          // Monopeça (peça simples sem componentes subordinados)
          if (!currentAssembly.material && detectedMaterial) {
            currentAssembly.material = detectedMaterial;
          }
          if (itemComp > 0 && (!currentAssembly.comprimento || currentAssembly.comprimento === 0)) {
            currentAssembly.comprimento = itemComp;
          }
          if (itemPUn > 0 && (!currentAssembly.pesoUnitario || currentAssembly.pesoUnitario === 0)) {
            currentAssembly.pesoUnitario = itemPUn;
          }
          if (itemPesoTot > 0 && (!currentAssembly.pesoTotal || currentAssembly.pesoTotal === 0)) {
            currentAssembly.pesoTotal = itemPesoTot;
          }
        }
      }
    }

    addLog(`Total de Peças Principais extraídas: ${assemblies.length}`);

    const finalPieces: ExtractedPiece[] = assemblies.map((asm) => {
      const isComposed = asm.isComposed === 'SIM' && asm.components.length > 0;
      let perfilPrincipal = asm.descricao;
      let materialPrincipal = asm.material || 'A36';
      let maxComp = asm.comprimento || 0;
      let totalPeso = asm.subtotalPeso > 0 ? asm.subtotalPeso : asm.pesoTotal;

      if (isComposed) {
        let sumComponentsWeight = 0;
        let sumUnitComponentsWeight = 0;
        let bestComp = asm.components[0];
        maxComp = 0;

        asm.components.forEach((c) => {
          if (c.comprimento > maxComp) {
            maxComp = c.comprimento;
            bestComp = c;
          }
          sumComponentsWeight += c.pesoTotal;
          if (c.pesoUnitario > 0) {
            sumUnitComponentsWeight += c.pesoUnitario * c.quantidade;
          }
        });

        if (bestComp) {
          perfilPrincipal = bestComp.perfil || asm.descricao;
          materialPrincipal = bestComp.material || 'A36';
          maxComp = bestComp.comprimento;
        }

        // Se não obteve subtotal na linha isolada, usar a somatória dos componentes
        if (!totalPeso || totalPeso === 0) {
          totalPeso = sumComponentsWeight;
        }

        // Detecção de quantidade de conjunto caso tenha vindo 1:
        if (asm.quantidade === 1 && sumUnitComponentsWeight > 0 && totalPeso > 0) {
          const ratio = Math.round(totalPeso / sumUnitComponentsWeight);
          if (ratio > 1) {
            asm.quantidade = ratio;
          }
        }
      }

      // Regra de Ouro: Peso Unitário = Peso Total dividido pela Quantidade da peça principal
      const pesoUnit = asm.quantidade > 0 ? totalPeso / asm.quantidade : totalPeso;

      return {
        of: asm.of,
        fase: asm.fase,
        marca: asm.marca,
        descricao: asm.descricao,
        isComposed: isComposed ? 'SIM' : 'NÃO',
        quantidade: asm.quantidade,
        material: materialPrincipal,
        perfilPrincipal: perfilPrincipal,
        comprimentoMax: maxComp > 0 ? maxComp : '-',
        pesoUnit: pesoUnit > 0 ? pesoUnit.toFixed(2) : '-',
        pesoTotal: totalPeso > 0 ? totalPeso.toFixed(2) : '-',
        tratamentoSuperficial: 'pintura'
      };
    });

    setExtractedData(finalPieces);

    if (finalPieces.length === 0) {
      setStatusText('Nenhuma peça principal identificada.');
      addLog('AVISO: Nenhuma peça bateu com a máscara (ex: B132-1 ou B132-4-1).');
      toast.warning('PDF lido, mas nenhuma marca de peça foi reconhecida.');
    } else {
      setStatusText(`${finalPieces.length} peças principais extraídas com sucesso!`);
      addLog(`Tabela renderizada com ${finalPieces.length} registros.`);
      toast.success(`${finalPieces.length} peças extraídas do PDF!`);
    }
  };

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      toast.error('Por favor, selecione um arquivo no formato PDF válido.');
      return;
    }

    setSelectedFile(file);
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    setCurrentFileName(baseName);
    setStatusText(`Processando: ${file.name}...`);
    setLogs([`> Carregando arquivo: ${file.name}`]);
    setIsProcessing(true);

    try {
      const pdfjs = await ensurePdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      addLog(`PDF aberto! Total de páginas: ${pdf.numPages}`);

      const allItems: PdfItem[] = [];
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const textContent = await page.getTextContent();
        textContent.items.forEach((item) => {
          if (item.str && item.str.trim() !== '') {
            allItems.push({
              text: item.str.trim(),
              x: item.transform[4],
              y: item.transform[5],
              page: p
            });
          }
        });
      }

      addLog(`Total de elementos de texto extraídos: ${allItems.length}`);
      processPdfLines(allItems);
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao processar PDF: ${errMsg}`);
      addLog(`ERRO CRÍTICO: ${errMsg}`);
      setStatusText('Falha no processamento.');
    } finally {
      setIsProcessing(false);
    }
  };

  const exportToExcel = () => {
    if (extractedData.length === 0) return;

    const excelRows = extractedData.map((item) => ({
      OF: item.of,
      Fase: isNaN(Number(item.fase)) ? item.fase : Number(item.fase),
      Marca: item.marca,
      Descrição: item.descricao,
      'Composto por Componentes?': item.isComposed,
      Quantidade: Number(item.quantidade),
      'Peso Unitário (kg)': item.pesoUnit === '-' ? '' : Number(item.pesoUnit),
      'Peso Total (kg)': item.pesoTotal === '-' ? '' : Number(item.pesoTotal),
      'Tratamento Superficial': item.tratamentoSuperficial,
      Material: item.material,
      'Perfil Principal': item.perfilPrincipal,
      'Comprimento Ref. (mm)': item.comprimentoMax === '-' ? '' : Number(item.comprimentoMax)
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelRows);

    ws['!cols'] = [
      { wch: 12 },
      { wch: 8 },
      { wch: 12 },
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
      { wch: 18 },
      { wch: 16 },
      { wch: 22 },
      { wch: 16 },
      { wch: 22 },
      { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Lista_Pecas');
    const outFileName = `${currentFileName}_Corrigido.xlsx`;
    XLSX.writeFile(wb, outFileName);
    addLog(`Planilha Excel baixada: ${outFileName}`);
    toast.success(`Planilha Excel "${outFileName}" gerada com sucesso!`);
  };

  if (useIframeMode) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-slate-800 p-3 rounded-lg border border-slate-700">
          <span className="text-xs text-slate-300 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-amber-400" />
            Modo 100% HTML Original Ativo
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setUseIframeMode(false)}
            className="text-xs bg-slate-700 border-slate-600 text-white"
          >
            Voltar ao Modo React
          </Button>
        </div>
        <iframe
          src="/conversor_relatorio_estruturas.html"
          className="w-full h-[650px] border-0 rounded-xl bg-white shadow-2xl"
          title="Conversor HTML Original"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modos e Alternador */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setUseIframeMode(true)}
          className="text-xs text-slate-400 hover:text-sky-400 hover:bg-slate-800"
        >
          <Code2 className="w-3.5 h-3.5 mr-1" />
          Usar Leitor HTML Puro (Modo Direct)
        </Button>
      </div>

      {/* Upload Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-sky-500 bg-sky-500/10 scale-[1.01]'
            : 'border-slate-700 bg-slate-800/40 hover:border-sky-500/50 hover:bg-slate-800/80'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileInput}
          className="hidden"
        />
        <Upload className="mx-auto h-12 w-12 text-slate-400 mb-3" />
        {selectedFile ? (
          <div>
            <p className="text-sm font-semibold text-sky-400 mb-1">Arquivo selecionado:</p>
            <p className="text-base text-white font-mono">{selectedFile.name}</p>
            <p className="text-xs text-slate-400 mt-1">
              ({(selectedFile.size / 1024).toFixed(1)} KB) — Clique para trocar
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-300 font-medium mb-1">
              Arraste e solte o arquivo <strong className="text-sky-400 font-semibold">PDF da Lista de Peças Estruturada</strong> aqui
            </p>
            <p className="text-xs text-slate-400 mb-4">Suporta relatórios originais do Advance Steel em PDF</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="bg-sky-600 hover:bg-sky-500 text-white font-medium shadow-md pointer-events-none"
            >
              Selecionar PDF do Computador
            </Button>
          </div>
        )}
      </div>

      {/* Actions & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-800/60 p-4 rounded-lg border border-slate-700">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-slate-900/80 text-sky-400 border-sky-500/30 px-3 py-1 text-xs font-mono">
            {statusText}
          </Badge>
          {isProcessing && (
            <div className="flex items-center text-xs text-amber-400 gap-1.5 animate-pulse">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Processando PDF...</span>
            </div>
          )}
        </div>

        <Button
          onClick={exportToExcel}
          disabled={extractedData.length === 0 || isProcessing}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg transition-all"
        >
          <Download className="w-4 h-4 mr-2" />
          Baixar Planilha Excel (.xlsx)
        </Button>
      </div>

      {/* Table Preview */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-xl overflow-hidden">
        <CardHeader className="py-3.5 px-4 bg-slate-800/50 border-b border-slate-800 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            Peças Extraídas ({extractedData.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] w-full">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-950 text-slate-300 font-mono sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-2.5 border-b border-slate-800">OF</th>
                  <th className="p-2.5 border-b border-slate-800">Fase</th>
                  <th className="p-2.5 border-b border-slate-800">Marca</th>
                  <th className="p-2.5 border-b border-slate-800">Descrição</th>
                  <th className="p-2.5 border-b border-slate-800">Composto?</th>
                  <th className="p-2.5 border-b border-slate-800 text-center">Qtd</th>
                  <th className="p-2.5 border-b border-slate-800">Material</th>
                  <th className="p-2.5 border-b border-slate-800">Perfil Principal</th>
                  <th className="p-2.5 border-b border-slate-800 text-right">Comp. Max (mm)</th>
                  <th className="p-2.5 border-b border-slate-800 text-right">Peso Unit. (kg)</th>
                  <th className="p-2.5 border-b border-slate-800 text-right">Peso Total (kg)</th>
                  <th className="p-2.5 border-b border-slate-800">Tratamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {extractedData.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-500 font-medium">
                      {selectedFile ? (
                        <div className="space-y-2">
                          <AlertTriangle className="mx-auto h-8 w-8 text-amber-400/80" />
                          <p className="text-slate-300">Nenhuma peça foi identificada no PDF.</p>
                          <p className="text-xs text-slate-400">
                            Verifique os logs abaixo ou clique em "Usar Leitor HTML Puro" no topo.
                          </p>
                        </div>
                      ) : (
                        'Nenhum dado extraído ainda. Carregue um PDF de Lista de Peças acima.'
                      )}
                    </td>
                  </tr>
                ) : (
                  extractedData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-2.5 font-mono font-bold text-sky-400">{row.of}</td>
                      <td className="p-2.5 text-slate-300">{row.fase}</td>
                      <td className="p-2.5 font-mono font-semibold text-white">{row.marca}</td>
                      <td className="p-2.5 text-slate-200">{row.descricao}</td>
                      <td className="p-2.5">
                        <Badge
                          variant="outline"
                          className={
                            row.isComposed === 'SIM'
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60 text-[10px]'
                              : 'bg-amber-950/60 text-amber-400 border-amber-800/60 text-[10px]'
                          }
                        >
                          {row.isComposed}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-center font-bold text-white">{row.quantidade}</td>
                      <td className="p-2.5 text-slate-300">{row.material}</td>
                      <td className="p-2.5 font-medium text-slate-200">{row.perfilPrincipal}</td>
                      <td className="p-2.5 text-right font-mono text-slate-300">{row.comprimentoMax}</td>
                      <td className="p-2.5 text-right font-mono text-slate-300">{row.pesoUnit}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-400">{row.pesoTotal}</td>
                      <td className="p-2.5 text-slate-400 capitalize">{row.tratamentoSuperficial}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Terminal Log Panel - SE MANTÉM VISÍVEL PARA DIAGNÓSTICO */}
      <Card className="bg-slate-950 border-slate-800 font-mono text-xs overflow-hidden">
        <CardHeader className="py-2 px-3 bg-slate-900/90 border-b border-slate-800 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5 text-sky-400" />
            Log de Processamento e Diagnóstico
          </CardTitle>
          <span className="text-[10px] text-slate-500 font-normal">{logs.length} eventos</span>
        </CardHeader>
        <CardContent className="p-3">
          <ScrollArea className="h-32 w-full">
            <div className="space-y-1 text-sky-400/90 leading-relaxed">
              {logs.map((logLine, idx) => (
                <div key={idx}>{logLine}</div>
              ))}
              <div ref={logEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export const AdvanceSteelConverterModal: React.FC<AdvanceSteelConverterProps> = ({ open, onOpenChange }) => {
  if (open === undefined || onOpenChange === undefined) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <div className="flex items-center justify-between pr-4">
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-sky-400" />
                Conversor Advance Steel (PDF para Excel)
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs mt-1">
                Conversão 100% no navegador (Client-Side) de relatórios estruturados do Advance Steel em PDF para Excel (.xlsx)
              </DialogDescription>
            </div>
            <Badge className="bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs">
              Autônomo / Sem Servidor
            </Badge>
          </div>
        </DialogHeader>

        <div className="mt-4">
          <AdvanceSteelConverterContent />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AdvanceSteelConverter: React.FC<AdvanceSteelConverterProps> = ({ open, onOpenChange }) => {
  if (open !== undefined && onOpenChange !== undefined) {
    return <AdvanceSteelConverterModal open={open} onOpenChange={onOpenChange} />;
  }

  return (
    <Card className="bg-slate-900 border-slate-800 text-white max-w-5xl mx-auto shadow-2xl">
      <CardHeader className="border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-sky-400" />
              Conversor Advance Steel (PDF para Excel)
            </CardTitle>
            <p className="text-xs text-slate-400 mt-1">
              Conversão 100% no navegador (Client-Side) de relatórios estruturados em PDF para Excel (.xlsx)
            </p>
          </div>
          <Badge className="bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs">
            Autônomo / Sem Servidor
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <AdvanceSteelConverterContent />
      </CardContent>
    </Card>
  );
};

export default AdvanceSteelConverter;
