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
  Code2,
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
  const [headerOf, setHeaderOf] = useState<string>('');
  const [headerFase, setHeaderFase] = useState<string>('1');
  const [tratamentoGlobal, setTratamentoGlobal] = useState<'pintura' | 'galvanizacao'>('pintura');
  const [showLogs, setShowLogs] = useState(false);
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
    const outFileName = `${headerOf || currentFileName}_Fase_${headerFase || '1'}_Lista_Pecas_AdvanceSteel.xlsx`;
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
                  Conversor de Listas Advance Steel
                </CardTitle>
              </div>
              <CardDescription className="text-slate-300 text-sm">
                Converte a Lista Estruturada de Peças do Advance Steel para o padrão oficial de importação do TrackSteel.
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
                  <RadioGroupItem value="pintura" id="adv-trat-pintura" className="border-indigo-400 text-indigo-500" />
                  <Label htmlFor="adv-trat-pintura" className="text-xs font-medium text-slate-200 cursor-pointer">
                    Pintura
                  </Label>
                </div>

                <div className="flex items-center space-x-2 bg-slate-900/90 hover:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700/70 cursor-pointer transition-colors">
                  <RadioGroupItem value="galvanizacao" id="adv-trat-galvanizacao" className="border-indigo-400 text-indigo-500" />
                  <Label htmlFor="adv-trat-galvanizacao" className="text-xs font-medium text-slate-200 cursor-pointer">
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
                    <span className="text-indigo-400 font-bold hover:underline">Clique para selecionar</span> ou arraste a lista Advance Steel (.pdf)
                  </>
                )}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Lê automaticamente cabeçalho (Trabalho/OF, Fase), marcas principais, subcomponentes e subtotais.
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

export const AdvanceSteelConverterModal: React.FC<AdvanceSteelConverterProps> = ({ open, onOpenChange }) => {
  if (open === undefined || onOpenChange === undefined) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-5xl max-h-[92vh] overflow-y-auto">
        <AdvanceSteelConverterContent />
      </DialogContent>
    </Dialog>
  );
};

export const AdvanceSteelConverter: React.FC<AdvanceSteelConverterProps> = ({ open, onOpenChange }) => {
  if (open !== undefined && onOpenChange !== undefined) {
    return <AdvanceSteelConverterModal open={open} onOpenChange={onOpenChange} />;
  }

  return <AdvanceSteelConverterContent />;
};

export default AdvanceSteelConverter;

