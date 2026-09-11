import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileSpreadsheet, Download, RefreshCw, Terminal, FileText, AlertTriangle } from 'lucide-react';
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
  pos: string;
  descricao: string;
  quantidade: number;
  comprimento: number;
  material: string;
  pesoUnitario: number;
  pesoTotal: number;
}

interface AssemblyItem {
  rawMark: string;
  of: string;
  fase: string;
  marca: string;
  descricao: string;
  quantidade: number;
  material: string;
  perfilPrincipal: string;
  comprimento: number;
  pesoUnitario: number;
  pesoTotal: number;
  isComposed: 'SIM' | 'NÃO';
  components: ComponentItem[];
}

interface PdfItem {
  text: string;
  x: number;
  y: number;
  page: number;
}

interface TecnometalConverterProps {
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

const normalizeMaterial = (rawMat: string): string => {
  if (!rawMat) return 'A36';
  const clean = rawMat.trim().toUpperCase();
  if (clean.includes('A572') || clean.includes('A-572') || clean.includes('A572GR5') || clean.includes('GR5')) {
    return 'A572-GR 50';
  }
  if (clean.includes('A36') || clean.includes('A-36')) {
    return 'A36';
  }
  if (clean.includes('1020') || clean.includes('SAE1020') || clean.includes('SAE 1020')) {
    return 'SAE 1020';
  }
  return clean;
};

const TecnometalConverterContent: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedPiece[]>([]);
  const [logs, setLogs] = useState<string[]>(['> Aguardando seleção da lista PDF do Tecnometal...']);
  const [statusText, setStatusText] = useState<string>('Aguardando arquivo PDF...');
  const [currentFileName, setCurrentFileName] = useState<string>('Lista_Tecnometal');

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
    if (!valStr && valStr !== 0) return 0;
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
    // 1. Agrupar em linhas ordenadas por página, Y descendente e X ascendente
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
      if (lastPage === null || item.page !== lastPage || Math.abs(item.y - (lastY ?? item.y)) > 3.5) {
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

    // 2. Extrair OF e Fase do título/cabeçalho (Ex: "B121-FASE4-LISTA DE CONJUNTOS-R00")
    let defaultOf = '';
    let defaultFase = '1';

    for (const line of lines) {
      const lineText = line.map((i) => i.text).join(' ');
      const matchTitulo =
        lineText.match(/^([A-Za-z0-9]+)-FASE\s*(\d+)/i) ||
        lineText.match(/([A-Za-z0-9]+)-FASE\s*(\d+)/i) ||
        lineText.match(/([A-Za-z0-9]+)-F(\d+)/i);
      if (matchTitulo) {
        defaultOf = matchTitulo[1];
        defaultFase = matchTitulo[2];
        addLog(`OF detectada no cabeçalho: ${defaultOf} | Fase: ${defaultFase}`);
        break;
      }
    }

    // 3. Calibração das colunas X padrão do Tecnometal
    const colX = {
      marca: 35,
      pos: 95,
      descricao: 175,
      qtde: 255,
      largura: 300,
      espessura: 340,
      comprimento: 395,
      material: 450,
      pesoUnit: 510,
      pesoTotal: 570,
      superficieTotal: 640
    };

    // Recalibração dinâmica baseada no cabeçalho da tabela
    for (const line of lines) {
      const lineText = line.map((i) => i.text).join(' ').toLowerCase();
      if (lineText.includes('marca') && lineText.includes('pos')) {
        for (const item of line) {
          const t = item.text.toLowerCase().trim();
          if (t === 'marca') colX.marca = item.x;
          else if (t.startsWith('pos')) colX.pos = item.x;
          else if (t.startsWith('descr')) colX.descricao = item.x;
          else if (t.startsWith('qtd')) colX.qtde = item.x;
          else if (t.startsWith('lar')) colX.largura = item.x;
          else if (t.startsWith('esp')) colX.espessura = item.x;
          else if (t.startsWith('comp')) colX.comprimento = item.x;
          else if (t.startsWith('mat')) colX.material = item.x;
          else if (t.startsWith('p.un') || t === 'p.un.') colX.pesoUnit = item.x;
          else if (t.startsWith('p.tot') || t === 'p.tot.') colX.pesoTotal = item.x;
          else if (t.startsWith('s.tot')) colX.superficieTotal = item.x;
        }
      }
    }

    const getNearestCol = (x: number): string => {
      let bestCol = '';
      let minDiff = Infinity;
      for (const [colName, targetX] of Object.entries(colX)) {
        const diff = Math.abs(x - targetX);
        if (diff < minDiff) {
          minDiff = diff;
          bestCol = colName;
        }
      }
      return bestCol;
    };

    const KNOWN_MATERIALS = [
      'A572GR50', 'A572-GR 50', 'A572-GR50', 'A572GR5', 'A572',
      'A36', 'ASTM A36', '10.9', '8.8', 'SAE 1020'
    ];

    const assemblies: AssemblyItem[] = [];
    let currentAssembly: AssemblyItem | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let rawLineText = line.map((it) => it.text).join(' ').trim();
      if (!rawLineText) continue;

      // Normalizar hífens e materiais
      let text = rawLineText.replace(/([A-Za-z0-9]+)\s*-\s*(\d+)\s*-\s*(\d+)/g, '$1-$2-$3');
      text = text.replace(/([A-Za-z0-9]+)\s*-\s*(\d+)/g, '$1-$2');

      // Descartar cabeçalhos conhecidos
      if (
        text.includes('LISTA DE CONJUNTOS') ||
        text.includes('Marca Pos. Descrição') ||
        text.includes('P.Un. P.Tot.') ||
        text.includes('FASE4-LISTA') ||
        text === '21806'
      ) {
        continue;
      }

      // 1. Monopeça: Marca repete na coluna Pos (ex: "B121-4-1 B121-4-1 Lam. 9.5 22 160 10 270 A36 3,2 71")
      const monoMatch = text.match(/^([A-Za-z0-9]+-\d+-(\d+))\s+\1\s+(.+)$/);
      if (monoMatch) {
        const fullMark = monoMatch[1];
        const pieceNum = monoMatch[2];
        const rest = monoMatch[3].trim();
        const parts = fullMark.split('-');

        let mat = '';
        let matIdx = -1;
        let matLen = 0;
        for (const m of KNOWN_MATERIALS) {
          const idx = rest.indexOf(m);
          if (idx !== -1 && idx > matIdx) {
            mat = m;
            matIdx = idx;
            matLen = m.length;
          }
        }

        if (matIdx !== -1) {
          const beforeMat = rest.substring(0, matIdx).trim();
          const afterMat = rest.substring(matIdx + matLen).trim();

          const mDescQtd = beforeMat.match(/^(Lam\.\s*[0-9.]+|W[0-9]+X[0-9.]+|L[0-9./X]+|TB[0-9.X]+|[A-Za-z0-9./-]+)\s+(\d+)\s*(.*)$/i);
          let desc = 'ESTRUTURA';
          let quant = 1;
          let comp = 0;

          if (mDescQtd) {
            desc = mDescQtd[1];
            quant = parseInt(mDescQtd[2], 10) || 1;
            const dimTokens = mDescQtd[3].trim().split(/\s+/).filter((t) => /^[0-9.,]+$/.test(t));
            if (dimTokens.length > 0) {
              comp = parseNumeric(dimTokens[dimTokens.length - 1]);
            }
          }

          const postNums = afterMat.split(/\s+/).map(parseNumeric);
          const pUn = postNums[0] || 0;
          const pTot = postNums[1] || 0;

          assemblies.push({
            rawMark: fullMark,
            of: parts[0] || defaultOf,
            fase: parts[1] || defaultFase,
            marca: pieceNum,
            descricao: desc,
            isComposed: 'NÃO',
            quantidade: quant,
            material: normalizeMaterial(mat),
            perfilPrincipal: desc,
            comprimento: comp,
            pesoUnitario: pUn,
            pesoTotal: pTot,
            components: []
          });
          currentAssembly = null;
          continue;
        }
      }

      // 2. Linha Mestre de Conjunto (Peça Composta)
      // Ex: "B121-4-11 W410X46.1 2 60,8 122" ou "B121-4-18 W410X38.8 2 393,7 787"
      const masterMatch = text.match(/^([A-Za-z0-9]+-\d+-(\d+))\s+([A-Za-z0-9./-]+)\s+(\d+)\s+([0-9.,]+)\s+([0-9.,]+)$/);
      if (masterMatch) {
        const fullMark = masterMatch[1];
        const pieceNum = masterMatch[2];
        const pieceNumInt = parseInt(pieceNum, 10);

        if (pieceNumInt < 1000) {
          const desc = masterMatch[3].trim();
          const quant = parseInt(masterMatch[4], 10) || 1;
          const pUn = parseNumeric(masterMatch[5]);
          const pTot = parseNumeric(masterMatch[6]);
          const parts = fullMark.split('-');

          currentAssembly = {
            rawMark: fullMark,
            of: parts[0] || defaultOf,
            fase: parts[1] || defaultFase,
            marca: pieceNum,
            descricao: desc,
            isComposed: 'SIM',
            quantidade: quant,
            material: '',
            perfilPrincipal: desc,
            comprimento: 0,
            pesoUnitario: pUn,
            pesoTotal: pTot,
            components: []
          };
          assemblies.push(currentAssembly);
          continue;
        }
      }

      // 3. Componente Subordinado
      // Ex: "B121-4-1047 W410X46.1 1 1101 A572GR5 51,2 51"
      // Ex: "B121-4-1038 Lam. 8 4 66 8 120 A36 0,5 2"
      const compMatch = text.match(/^([A-Za-z0-9]+-\d+-(\d+))\s+(.+)$/);
      if (compMatch) {
        const pos = compMatch[1];
        const pieceNumInt = parseInt(compMatch[2], 10);
        const rest = compMatch[3].trim();

        if (pieceNumInt >= 1000 && currentAssembly) {
          let mat = '';
          let matIdx = -1;
          let matLen = 0;
          for (const m of KNOWN_MATERIALS) {
            const idx = rest.indexOf(m);
            if (idx !== -1 && idx > matIdx) {
              mat = m;
              matIdx = idx;
              matLen = m.length;
            }
          }

          if (matIdx !== -1) {
            const beforeMat = rest.substring(0, matIdx).trim();
            const afterMat = rest.substring(matIdx + matLen).trim();

            const mDescQtd = beforeMat.match(/^(Lam\.\s*[0-9.]+|W[0-9]+X[0-9.]+|L[0-9./X]+|TB[0-9.X]+|[A-Za-z0-9./-]+)\s+(\d+)\s*(.*)$/i);
            let desc = 'COMPONENTE';
            let quant = 1;
            let comp = 0;

            if (mDescQtd) {
              desc = mDescQtd[1];
              quant = parseInt(mDescQtd[2], 10) || 1;
              const dimTokens = mDescQtd[3].trim().split(/\s+/).filter((t) => /^[0-9.,]+$/.test(t));
              if (dimTokens.length > 0) {
                comp = parseNumeric(dimTokens[dimTokens.length - 1]);
              }
            }

            const postNums = afterMat.split(/\s+/).map(parseNumeric);
            const pUn = postNums[0] || 0;
            const pTot = postNums[1] || 0;

            currentAssembly.components.push({
              pos: pos,
              descricao: desc,
              quantidade: quant,
              comprimento: comp,
              material: normalizeMaterial(mat),
              pesoUnitario: pUn,
              pesoTotal: pTot
            });
          }
        }
      }
    }

    addLog(`Total de Peças Principais Tecnometal extraídas: ${assemblies.length}`);

    // 4. Formatação Final das Peças
    const finalPieces: ExtractedPiece[] = assemblies.map((asm) => {
      const isComposed = asm.isComposed === 'SIM' && asm.components.length > 0;
      let perfilPrincipal = asm.descricao;
      let materialPrincipal = asm.material || 'A36';
      let maxComp = asm.comprimento || 0;
      let pesoUnit = asm.pesoUnitario;
      let pesoTot = asm.pesoTotal;

      if (isComposed) {
        // REGRA DE OURO TECNOMETAL:
        // Selecionar o componente subordinado com maior comprimento e extrair comprimento e material correspondente
        let bestComp = asm.components[0];
        maxComp = 0;

        for (const comp of asm.components) {
          if (comp.comprimento > maxComp) {
            maxComp = comp.comprimento;
            bestComp = comp;
          }
        }

        if (bestComp) {
          materialPrincipal = bestComp.material || 'A36';
          maxComp = bestComp.comprimento;
          perfilPrincipal = asm.descricao; // perfil principal da linha mestre do conjunto
        }

        if (pesoTot === 0 && asm.components.length > 0) {
          pesoTot = asm.components.reduce((acc, c) => acc + c.pesoTotal, 0);
        }
        if (pesoUnit === 0 && asm.quantidade > 0) {
          pesoUnit = pesoTot / asm.quantidade;
        }
      } else {
        // Peça simples monopeça
        if (pesoTot === 0 && pesoUnit > 0) {
          pesoTot = pesoUnit * asm.quantidade;
        }
        if (pesoUnit === 0 && pesoTot > 0 && asm.quantidade > 0) {
          pesoUnit = pesoTot / asm.quantidade;
        }
      }

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
        pesoUnit: pesoUnit > 0 ? pesoUnit.toFixed(1) : '-',
        pesoTotal: pesoTot > 0 ? pesoTot.toFixed(0) : '-',
        tratamentoSuperficial: 'pintura'
      };
    });

    setExtractedData(finalPieces);

    if (finalPieces.length === 0) {
      setStatusText('Nenhuma peça principal identificada.');
      addLog('AVISO: Nenhuma marca bateu com a máscara (ex: B121-4-1).');
      toast.warning('PDF lido, mas nenhuma marca de peça foi reconhecida.');
    } else {
      setStatusText(`${finalPieces.length} peças principais extraídas com sucesso!`);
      addLog(`Tabela renderizada com ${finalPieces.length} registros Tecnometal.`);
      toast.success(`${finalPieces.length} peças Tecnometal extraídas do PDF!`);
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
    setLogs([`> Carregando arquivo Tecnometal: ${file.name}`]);
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

      addLog(`Total de fragmentos de texto extraídos: ${allItems.length}`);
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

  return (
    <div className="space-y-6">
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
              Arraste e solte o arquivo <strong className="text-sky-400 font-semibold">PDF da Lista de Conjuntos Tecnometal</strong> aqui
            </p>
            <p className="text-xs text-slate-400 mb-4">Suporta relatórios originais do Tecnometal em PDF</p>
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
              <span>Processando PDF Tecnometal...</span>
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
            Peças Extraídas Tecnometal ({extractedData.length})
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
                          <p className="text-slate-300">Nenhuma peça foi identificada no PDF Tecnometal.</p>
                          <p className="text-xs text-slate-400">
                            Verifique os logs abaixo ou se o arquivo é uma Lista de Conjuntos válida.
                          </p>
                        </div>
                      ) : (
                        'Nenhum dado extraído ainda. Carregue um PDF de Lista de Conjuntos Tecnometal acima.'
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

      {/* Terminal Log Panel */}
      <Card className="bg-slate-950 border-slate-800 font-mono text-xs overflow-hidden">
        <CardHeader className="py-2 px-3 bg-slate-900/90 border-b border-slate-800 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5 text-sky-400" />
            Log de Processamento e Diagnóstico Tecnometal
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

export const TecnometalConverterModal: React.FC<TecnometalConverterProps> = ({ open, onOpenChange }) => {
  if (open === undefined || onOpenChange === undefined) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <div className="flex items-center justify-between pr-4">
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-sky-400" />
                Conversor Tecnometal (PDF para Excel)
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs mt-1">
                Conversão 100% no navegador (Client-Side) de relatórios do Tecnometal em PDF para Excel (.xlsx)
              </DialogDescription>
            </div>
            <Badge className="bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs">
              Autônomo / Sem Servidor
            </Badge>
          </div>
        </DialogHeader>

        <div className="mt-4">
          <TecnometalConverterContent />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TecnometalConverter: React.FC<TecnometalConverterProps> = ({ open, onOpenChange }) => {
  if (open !== undefined && onOpenChange !== undefined) {
    return <TecnometalConverterModal open={open} onOpenChange={onOpenChange} />;
  }

  return (
    <Card className="bg-slate-900 border-slate-800 text-white max-w-5xl mx-auto shadow-2xl">
      <CardHeader className="border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-sky-400" />
              Conversor Tecnometal (PDF para Excel)
            </CardTitle>
            <p className="text-xs text-slate-400 mt-1">
              Conversão 100% no navegador (Client-Side) de Listas de Conjuntos do Tecnometal em PDF para Excel (.xlsx)
            </p>
          </div>
          <Badge className="bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs">
            Autônomo / Sem Servidor
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <TecnometalConverterContent />
      </CardContent>
    </Card>
  );
};

export default TecnometalConverter;
