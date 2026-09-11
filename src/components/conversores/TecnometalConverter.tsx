import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Upload,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Terminal,
  FileText,
  AlertTriangle,
  Boxes,
  Paintbrush,
  CheckCircle2,
  Info
} from 'lucide-react';
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
  const [headerOf, setHeaderOf] = useState<string>('');
  const [headerFase, setHeaderFase] = useState<string>('1');
  const [tratamentoGlobal, setTratamentoGlobal] = useState<'pintura' | 'galvanizacao'>('pintura');
  const [showLogs, setShowLogs] = useState(false);
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

  const handleTratamentoChange = (novoTratamento: 'pintura' | 'galvanizacao') => {
    setTratamentoGlobal(novoTratamento);
    setExtractedData((prev) =>
      prev.map((item) => ({
        ...item,
        tratamentoSuperficial: novoTratamento
      }))
    );
  };

  const handleOfChange = (newOf: string) => {
    setHeaderOf(newOf);
    setExtractedData((prev) =>
      prev.map((item) => ({
        ...item,
        of: newOf
      }))
    );
  };

  const handleFaseChange = (newFase: string) => {
    setHeaderFase(newFase);
    setExtractedData((prev) =>
      prev.map((item) => ({
        ...item,
        fase: newFase
      }))
    );
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
        setHeaderOf(defaultOf);
        setHeaderFase(defaultFase);
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
        tratamentoSuperficial: tratamentoGlobal
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
    setCurrentFileName(file.name.replace(/\.[^/.]+$/, ''));
    setLogs([`> Carregando lista PDF Tecnometal: ${file.name}`]);
    setIsProcessing(true);

    try {
      const pdfjs = await ensurePdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      addLog(`PDF Tecnometal aberto! Total de páginas: ${pdf.numPages}`);

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
      { wch: 10 },
      { wch: 8 },
      { wch: 10 },
      { wch: 16 },
      { wch: 26 },
      { wch: 12 },
      { wch: 18 },
      { wch: 16 },
      { wch: 22 },
      { wch: 16 },
      { wch: 22 },
      { wch: 22 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Lista_Pecas');
    const outFileName = `${headerOf || currentFileName}_Fase_${headerFase || '1'}_Lista_Pecas_Tecnometal.xlsx`;
    XLSX.writeFile(wb, outFileName);
    addLog(`Planilha Excel baixada: ${outFileName}`);
    toast.success(`Planilha padrão baixada com sucesso: ${outFileName}`);
  };

  const totalPesoGeral = extractedData.reduce((acc, curr) => {
    const val = typeof curr.pesoTotal === 'number' ? curr.pesoTotal : parseFloat(String(curr.pesoTotal)) || 0;
    return acc + val;
  }, 0);
  const totalPecasCompostas = extractedData.filter((p) => p.isComposed === 'SIM').length;
  const totalPecasSimples = extractedData.filter((p) => p.isComposed === 'NÃO').length;

  return (
    <div className="space-y-6">
      {/* Banner Principal de Conversão */}
      <Card className="bg-slate-900/90 border-slate-800 shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950/40 border-b border-slate-800 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
                  <Boxes className="w-5 h-5" />
                </div>
                <CardTitle className="text-xl font-bold text-white tracking-tight">
                  Conversor de Listas Tecnometal
                </CardTitle>
              </div>
              <CardDescription className="text-slate-300 text-sm">
                Converte o Relatório de Lista de Conjuntos do Tecnometal para o padrão oficial de importação do TrackSteel.
              </CardDescription>
            </div>

            {/* Configuração de Tratamento Superficial */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 shadow-inner flex flex-col gap-2 min-w-[280px]">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5 text-indigo-300">
                  <Paintbrush className="w-3.5 h-3.5 text-indigo-400" />
                  Tratamento Superficial:
                </span>
                <Badge variant="outline" className="text-[10px] bg-slate-900 text-slate-400 border-slate-700">
                  Configuração Global
                </Badge>
              </div>

              <RadioGroup
                value={tratamentoGlobal}
                onValueChange={(val) => handleTratamentoChange(val as 'pintura' | 'galvanizacao')}
                className="grid grid-cols-2 gap-2"
              >
                <div className="flex items-center space-x-2 bg-slate-900/90 hover:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700/70 cursor-pointer transition-colors">
                  <RadioGroupItem value="pintura" id="tecno-trat-pintura" className="border-indigo-400 text-indigo-500" />
                  <Label htmlFor="tecno-trat-pintura" className="text-xs font-medium text-slate-200 cursor-pointer">
                    Pintura
                  </Label>
                </div>

                <div className="flex items-center space-x-2 bg-slate-900/90 hover:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700/70 cursor-pointer transition-colors">
                  <RadioGroupItem value="galvanizacao" id="tecno-trat-galvanizacao" className="border-indigo-400 text-indigo-500" />
                  <Label htmlFor="tecno-trat-galvanizacao" className="text-xs font-medium text-slate-200 cursor-pointer">
                    Galvanização
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Área de Upload / Arrastar Arquivo */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="group border-2 border-dashed border-slate-700 hover:border-indigo-500/80 bg-slate-950/40 hover:bg-slate-900/50 rounded-xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center space-y-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileInput}
              className="hidden"
            />

            <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 group-hover:border-indigo-500/40 rounded-full text-indigo-400 group-hover:scale-105 transition-transform duration-200">
              <Upload className="h-7 w-7" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-200">
                {selectedFile ? (
                  <span className="text-indigo-400">{selectedFile.name}</span>
                ) : (
                  <>
                    <span className="text-indigo-400 font-bold hover:underline">Clique para selecionar</span> ou arraste a lista Tecnometal (.pdf)
                  </>
                )}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Lê automaticamente cabeçalho (Obra, Fase), marcas simples e conjuntos com subcomponentes.
              </p>
            </div>

            {selectedFile && (
              <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700 mt-2 font-mono text-[11px]">
                {(selectedFile.size / 1024).toFixed(1)} KB carregado
              </Badge>
            )}
          </div>

          {/* Cards de Métricas e Identificação da OF */}
          {extractedData.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-800/60 border border-slate-700/70 p-3 rounded-lg flex flex-col justify-between">
                <span className="text-[11px] font-medium text-slate-400">OF (Obra)</span>
                <Input
                  value={headerOf}
                  onChange={(e) => handleOfChange(e.target.value)}
                  className="h-7 text-xs font-bold font-mono bg-slate-900 border-slate-700 text-indigo-300 mt-1"
                />
              </div>

              <div className="bg-slate-800/60 border border-slate-700/70 p-3 rounded-lg flex flex-col justify-between">
                <span className="text-[11px] font-medium text-slate-400">Fase</span>
                <Input
                  value={headerFase}
                  onChange={(e) => handleFaseChange(e.target.value)}
                  className="h-7 text-xs font-bold font-mono bg-slate-900 border-slate-700 text-indigo-300 mt-1"
                />
              </div>

              <div className="bg-slate-800/60 border border-slate-700/70 p-3 rounded-lg">
                <span className="text-[11px] font-medium text-slate-400">Total de Peças</span>
                <div className="text-lg font-bold text-white mt-1 flex items-baseline gap-1">
                  {extractedData.length} <span className="text-xs font-normal text-slate-400">itens</span>
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/70 p-3 rounded-lg">
                <span className="text-[11px] font-medium text-slate-400">Compostas / Simples</span>
                <div className="text-xs font-bold mt-1.5 flex items-center gap-1.5">
                  <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px] px-1.5 py-0">
                    SIM: {totalPecasCompostas}
                  </Badge>
                  <Badge className="bg-sky-500/15 text-sky-300 border-sky-500/30 text-[10px] px-1.5 py-0">
                    NÃO: {totalPecasSimples}
                  </Badge>
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-slate-800/60 border border-slate-700/70 p-3 rounded-lg">
                <span className="text-[11px] font-medium text-slate-400">Peso Total</span>
                <div className="text-lg font-bold text-amber-400 mt-1">
                  {totalPesoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
                  <span className="text-xs font-normal text-slate-400">kg</span>
                </div>
              </div>
            </div>
          )}

          {/* Barra de Ações */}
          {extractedData.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/40 p-3 rounded-lg border border-slate-700/60">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs px-2.5 py-1">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" />
                  {extractedData.length} Peças Prontas para Importação
                </Badge>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLogs(!showLogs)}
                  className="text-xs text-slate-400 hover:text-slate-200 h-7"
                >
                  <Info className="w-3.5 h-3.5 mr-1" />
                  {showLogs ? 'Ocultar Logs' : 'Ver Logs'}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={exportToExcel}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 h-9 shadow-lg shadow-emerald-950/40"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Baixar Planilha Padrão (.xlsx)
                </Button>
              </div>
            </div>
          )}

          {/* Logs Expansíveis */}
          {showLogs && logs.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-slate-400 space-y-1 max-h-40 overflow-y-auto">
              {logs.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          )}

          {/* Tabela de Pré-visualização com Visual Moderno (Igual ao Bocad) */}
          {extractedData.length > 0 && (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
              <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Prévia da Planilha de Destino (12 Colunas Oficiais)
                </span>
                <span className="text-[11px] text-slate-400">
                  Pronto para uso direto no botão "Importar Peças"
                </span>
              </div>

              <ScrollArea className="h-[420px] w-full">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-900 text-slate-300 font-mono text-[11px] sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="p-2.5 border-b border-slate-800">OF</th>
                      <th className="p-2.5 border-b border-slate-800">Fase</th>
                      <th className="p-2.5 border-b border-slate-800">Marca</th>
                      <th className="p-2.5 border-b border-slate-800">Descrição</th>
                      <th className="p-2.5 border-b border-slate-800 text-center">Composto por Componentes</th>
                      <th className="p-2.5 border-b border-slate-800 text-center">Quantidade</th>
                      <th className="p-2.5 border-b border-slate-800 text-right">Peso Unitário (kg)</th>
                      <th className="p-2.5 border-b border-slate-800 text-right">Peso Total (kg)</th>
                      <th className="p-2.5 border-b border-slate-800">Tratamento Superficial</th>
                      <th className="p-2.5 border-b border-slate-800">Material</th>
                      <th className="p-2.5 border-b border-slate-800">Perfil Principal</th>
                      <th className="p-2.5 border-b border-slate-800 text-right">Comprimento Ref. (mm)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {extractedData.map((p, idx) => {
                      const pUnit = typeof p.pesoUnit === 'number' ? p.pesoUnit : parseFloat(String(p.pesoUnit)) || 0;
                      const pTot = typeof p.pesoTotal === 'number' ? p.pesoTotal : parseFloat(String(p.pesoTotal)) || 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-2.5 font-mono text-indigo-300 font-medium">{p.of}</td>
                          <td className="p-2.5 font-mono text-slate-300">{p.fase}</td>
                          <td className="p-2.5 font-mono font-bold text-white">{p.marca}</td>
                          <td className="p-2.5 text-slate-200 font-medium">{p.descricao}</td>
                          <td className="p-2.5 text-center">
                            {p.isComposed === 'SIM' ? (
                              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] px-2 py-0">
                                SIM
                              </Badge>
                            ) : (
                              <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-[10px] px-2 py-0">
                                NÃO
                              </Badge>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-bold text-slate-200">{p.quantidade}</td>
                          <td className="p-2.5 text-right font-mono text-slate-300">
                            {pUnit > 0 ? pUnit.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : '-'}
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold text-amber-300">
                            {pTot > 0 ? pTot.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : '-'}
                          </td>
                          <td className="p-2.5 text-slate-300">
                            <Badge variant="outline" className="text-[10px] bg-slate-900 border-slate-700 text-slate-300">
                              {p.tratamentoSuperficial}
                            </Badge>
                          </td>
                          <td className="p-2.5 font-medium text-emerald-400">{p.material}</td>
                          <td className="p-2.5 font-mono text-slate-200">{p.perfilPrincipal}</td>
                          <td className="p-2.5 text-right font-mono text-slate-400">
                            {p.comprimentoMax || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          )}
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
        <TecnometalConverterContent />
      </DialogContent>
    </Dialog>
  );
};

export const TecnometalConverter: React.FC<TecnometalConverterProps> = ({ open, onOpenChange }) => {
  if (open !== undefined && onOpenChange !== undefined) {
    return <TecnometalConverterModal open={open} onOpenChange={onOpenChange} />;
  }

  return <TecnometalConverterContent />;
};

export default TecnometalConverter;
