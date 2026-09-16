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
import { useAppLabels } from '@/hooks/useAppLabels';
import { usePecas } from '@/hooks/usePecas';
import { supabase } from '@/integrations/supabase/client';

export interface ComponentItem {
  marca: string;
  quantidade: number;
  perfil: string;
  material: string;
  comprimento: number;
  pesoUnitario?: number;
  pesoTotal: number;
}

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
  components?: ComponentItem[];
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
  const { labels, isComponente } = useAppLabels();
  const { importPecas } = usePecas();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDirectImporting, setIsDirectImporting] = useState(false);
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

  const buscarTratamentoOF = async (ofCode: string): Promise<'pintura' | 'galvanizacao'> => {
    if (!ofCode) return 'pintura';
    try {
      const cleanOf = ofCode.trim();
      const { data } = await supabase
        .from('ordens_fabricacao')
        .select('num_of, tratamento_final')
        .or(`num_of.eq.${cleanOf},num_of.ilike.%${cleanOf}%`)
        .limit(1);

      if (data && data.length > 0 && data[0].tratamento_final) {
        const trat = data[0].tratamento_final.toLowerCase();
        if (trat.includes('galv')) {
          return 'galvanizacao';
        }
        return 'pintura';
      }
    } catch (err) {
      console.warn('Aviso ao buscar tratamento da OF:', err);
    }
    return 'pintura';
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

  const handleOfChange = async (newOf: string) => {
    setHeaderOf(newOf);
    const trat = await buscarTratamentoOF(newOf);
    setTratamentoGlobal(trat);
    setExtractedData((prev) =>
      prev.map((item) => ({
        ...item,
        of: newOf,
        tratamentoSuperficial: trat
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

  const processPdfLines = async (items: PdfItem[]) => {
    // 1. Agrupamento robusto de linhas por Clustering de Coordenada Y em cada página
    const pagesMap = new Map<number, PdfItem[]>();
    items.forEach((it) => {
      if (!pagesMap.has(it.page)) pagesMap.set(it.page, []);
      pagesMap.get(it.page)!.push(it);
    });

    const lines: PdfItem[][] = [];
    const Y_TOLERANCE = 6.0; // Tolerância vertical em pixels para agrupar na mesma linha visual

    const pageNumbers = Array.from(pagesMap.keys()).sort((a, b) => a - b);
    for (const pNum of pageNumbers) {
      const pageItems = pagesMap.get(pNum)!;

      interface LineCluster {
        ySum: number;
        count: number;
        avgY: number;
        items: PdfItem[];
      }

      const clusters: LineCluster[] = [];

      // Ordena por Y decrescente (do topo da página para o rodapé)
      pageItems.sort((a, b) => b.y - a.y);

      for (const item of pageItems) {
        let bestCluster: LineCluster | null = null;
        let minDiff = Infinity;

        for (const cluster of clusters) {
          const diff = Math.abs(item.y - cluster.avgY);
          if (diff <= Y_TOLERANCE && diff < minDiff) {
            minDiff = diff;
            bestCluster = cluster;
          }
        }

        if (bestCluster) {
          bestCluster.items.push(item);
          bestCluster.ySum += item.y;
          bestCluster.count += 1;
          bestCluster.avgY = bestCluster.ySum / bestCluster.count;
        } else {
          clusters.push({
            ySum: item.y,
            count: 1,
            avgY: item.y,
            items: [item]
          });
        }
      }

      // Ordena as linhas do topo para o rodapé da página
      clusters.sort((a, b) => b.avgY - a.avgY);

      // Dentro de cada linha, ordena da esquerda para a direita (X crescente)
      for (const cluster of clusters) {
        cluster.items.sort((a, b) => a.x - b.x);
        lines.push(cluster.items);
      }
    }

    addLog(`Total de linhas identificadas no PDF: ${lines.length}`);

    let defaultOf = '';
    for (const line of lines) {
      const lineText = line.map((i) => i.text).join(' ');
      const matchTrabalho =
        lineText.match(/Trabalho:\s*([A-Za-z0-9-]+)/i) ||
        lineText.match(/Projeto:\s*([A-Za-z0-9-]+)/i);
      if (matchTrabalho) {
        defaultOf = matchTrabalho[1].replace(/-/g, '');
        addLog(`OF / Trabalho identificado no cabeçalho: ${defaultOf}`);
        setHeaderOf(defaultOf);
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
        lineText.includes('Lista de Peças') ||
        lineText.includes('DetailDwgExtract') ||
        lineText.includes('Cliente:') ||
        lineText.includes('Desenhado') ||
        lineText.includes('Superfície') ||
        lineText.includes('Trabalho:') ||
        lineText.includes('Kg/piece') ||
        lineText.includes('( mm)') ||
        lineText.toLowerCase().includes('peso total:') ||
        (lineText.toLowerCase().includes('marca') && lineText.toLowerCase().includes('nome'))
      ) {
        continue;
      }

      // 1. Linha Mestre de Peça Principal (ex: "B134-13-1 90 W 150x13.0" ou "B134-13-2 72 W 150x13.0")
      // A primeira linha de cada registro contém a Marca, a Quantidade Total da Peça e o Nome/Perfil
      const masterMatch = lineText.match(/^([A-Za-z0-9]+(?:-\d+)+)(?:\s+(\d+))?\s+([A-Za-z].*)$/);

      if (masterMatch) {
        const fullMark = masterMatch[1];
        const quantFromLine = masterMatch[2] ? parseInt(masterMatch[2], 10) : 1;
        const descCandidate = masterMatch[3].trim();
        const parts = fullMark.split('-');
        const pieceNumber = parts[parts.length - 1];
        const pieceNumInt = parseInt(pieceNumber, 10);

        // Se o número da peça for menor que 1000, é uma peça principal mestre
        if (pieceNumInt < 1000) {
          const hasMaterial = KNOWN_MATERIALS.some((m) => descCandidate.includes(m));

          // A linha mestre não possui indicação de material na descrição nem pesos
          if (!hasMaterial) {
            const ofCode = parts.length >= 2 ? parts[0] : defaultOf;
            const phaseCode = parts.length >= 3 ? parts[1] : (parts.length === 2 ? parts[0] : '1');

            if (phaseCode && phaseCode !== '0' && isNaN(Number(phaseCode)) === false) {
              setHeaderFase(phaseCode);
            }

            currentAssembly = {
              rawMark: fullMark,
              of: ofCode || defaultOf,
              fase: phaseCode || '1',
              marca: pieceNumber,
              numeroPeca: pieceNumber,
              descricao: descCandidate || 'ESTRUTURA',
              quantidade: quantFromLine > 0 ? quantFromLine : 1,
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

      // 2. Linha com Subtotal da Marca (ex: "1.973,10 101,691" ou "408,70 20,434" ou "81 3,07")
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
          isComponente(itemMark) ||
          itemMark.includes('-100') ||
          itemMark.includes('-10') ||
          (itemMark.match(/-\d+$/) && parseInt(itemMark.match(/-(\d+)$/)![1], 10) >= (labels.faixaComponenteMin || 1000));

        if (isSubComp) {
          currentAssembly.isComposed = 'SIM';
          
          let cleanCompMark = itemMark;
          const subMatch = itemMark.match(/-?(\d{4,})$/) || itemMark.match(/(\d{4,})/);
          if (subMatch) {
            cleanCompMark = subMatch[1];
          } else if (itemMark === '-' || !/^\d{4}$/.test(itemMark)) {
            cleanCompMark = String((labels.faixaComponenteMin || 1000) + currentAssembly.components.length);
          }

          currentAssembly.components.push({
            marca: cleanCompMark,
            quantidade: itemQuant,
            perfil: itemDesc || currentAssembly.descricao,
            material: detectedMaterial || 'A36',
            comprimento: itemComp,
            pesoUnitario: itemPUn,
            pesoTotal: itemPesoTot
          });
        } else {
          // Monopeça (peça simples sem componentes subordinados)
          // Preenche os dados técnicos da peça SEM sobrescrever a quantidade mestre
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

    const targetOf = defaultOf || headerOf || (assemblies[0] ? assemblies[0].of : '');
    const detectedTratamento = await buscarTratamentoOF(targetOf);
    setTratamentoGlobal(detectedTratamento);
    addLog(`Tratamento superficial obtido automaticamente da OF ${targetOf}: ${detectedTratamento === 'galvanizacao' ? 'Galvanizado' : 'Pintura'}`);

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
          if (c.pesoUnitario && c.pesoUnitario > 0) {
            sumUnitComponentsWeight += c.pesoUnitario * c.quantidade;
          }
        });

        if (bestComp) {
          perfilPrincipal = bestComp.perfil;
          materialPrincipal = bestComp.material;
        }

        if (sumComponentsWeight > 0) {
          totalPeso = sumComponentsWeight;
        }

        // Se a quantidade do assembly principal veio 1 mas a soma unitária x total dá a razão
        if (asm.quantidade === 1 && sumUnitComponentsWeight > 0 && totalPeso > 0) {
          const ratio = Math.round(totalPeso / sumUnitComponentsWeight);
          if (ratio > 1) {
            asm.quantidade = ratio;
          }
        }
      } else {
        // Monopeça: se totalPeso não veio, calcula
        if (!totalPeso || totalPeso === 0) {
          totalPeso = (asm.pesoUnitario || 0) * asm.quantidade;
        }

        // Fallback de segurança para monopeça caso a quantidade mestre não tenha sido lida e veio 1
        if (asm.quantidade === 1 && asm.pesoUnitario > 0 && totalPeso > asm.pesoUnitario) {
          const ratio = Math.round(totalPeso / asm.pesoUnitario);
          if (ratio > 1) {
            asm.quantidade = ratio;
          }
        }
      }

      // Regra de Ouro: Peso Unitário = Peso Total dividido pela Quantidade da peça principal
      const pesoUnit = asm.quantidade > 0 ? totalPeso / asm.quantidade : (asm.pesoUnitario || totalPeso);

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
        tratamentoSuperficial: detectedTratamento,
        components: isComposed ? asm.components : []
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
      await processPdfLines(allItems);
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

    // Aba 1: Lista consolidada de Peças
    const excelRowsPecas = extractedData.map((item) => ({
      OF: item.of,
      Fase: isNaN(Number(item.fase)) ? item.fase : Number(item.fase),
      Marca: item.marca,
      Descrição: item.descricao,
      'Composto por Componentes?': item.isComposed,
      Quantidade: Number(item.quantidade),
      'Peso Unitário (kg)': item.pesoUnit === '-' ? '' : Number(item.pesoUnit),
      'Peso Total (kg)': item.pesoTotal === '-' ? '' : Number(item.pesoTotal),
      'Tratamento Superficial': item.tratamentoSuperficial || tratamentoGlobal,
      Material: item.material,
      'Perfil Principal': item.perfilPrincipal,
      'Comprimento Ref. (mm)': item.comprimentoMax === '-' ? '' : Number(item.comprimentoMax)
    }));

    // Aba 2: Lista detalhada de Componentes
    const excelRowsComponentes: any[] = [];
    extractedData.forEach((item) => {
      if (item.components && item.components.length > 0) {
        item.components.forEach((comp) => {
          const qtdPorPeca = Number(comp.quantidade) || 1;
          const qtdTotal = qtdPorPeca * Number(item.quantidade);
          excelRowsComponentes.push({
            OF: item.of,
            Fase: isNaN(Number(item.fase)) ? item.fase : Number(item.fase),
            'Peça Principal': item.marca,
            'Marca Componente': comp.marca || '-',
            'Descrição Componente': comp.perfil || item.descricao,
            Material: comp.material || item.material,
            'Comprimento (mm)': comp.comprimento || '',
            'Qtd / Peça': qtdPorPeca,
            'Qtd Total no Lote': qtdTotal,
            'Peso Unitário (kg)': comp.pesoUnitario || '',
            'Peso Total (kg)': comp.pesoTotal || ''
          });
        });
      }
    });

    // Aba 3: Formato Plano Oficial para Importação TrackSteel
    const excelRowsImportacao: any[] = [];
    extractedData.forEach((item) => {
      if (item.components && item.components.length > 0) {
        item.components.forEach((comp) => {
          excelRowsImportacao.push({
            of_number: item.of,
            etapa_fase: item.fase,
            marca: item.marca,
            descricao: item.descricao,
            quantidade: Number(item.quantidade),
            peso_unitario: item.pesoUnit === '-' ? 0 : Number(item.pesoUnit),
            peso_total: item.pesoTotal === '-' ? 0 : Number(item.pesoTotal),
            tratamento_superficial: item.tratamentoSuperficial || tratamentoGlobal,
            material: item.material,
            perfil_principal: item.perfilPrincipal,
            tem_componentes: true,
            marca_componente: comp.marca || '',
            descricao_componente: comp.perfil || item.descricao,
            perfil_componente: comp.perfil || item.descricao,
            peso_unitario_componente: comp.pesoUnitario || 0,
            quantidade_por_peca: Number(comp.quantidade) || 1
          });
        });
      } else {
        excelRowsImportacao.push({
          of_number: item.of,
          etapa_fase: item.fase,
          marca: item.marca,
          descricao: item.descricao,
          quantidade: Number(item.quantidade),
          peso_unitario: item.pesoUnit === '-' ? 0 : Number(item.pesoUnit),
          peso_total: item.pesoTotal === '-' ? 0 : Number(item.pesoTotal),
          tratamento_superficial: item.tratamentoSuperficial || tratamentoGlobal,
          material: item.material,
          perfil_principal: item.perfilPrincipal,
          tem_componentes: false,
          marca_componente: '',
          descricao_componente: '',
          perfil_componente: '',
          peso_unitario_componente: 0,
          quantidade_por_peca: 0
        });
      }
    });

    const wb = XLSX.utils.book_new();
    const wsPecas = XLSX.utils.json_to_sheet(excelRowsPecas);
    wsPecas['!cols'] = [
      { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 20 }, { wch: 15 },
      { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 16 },
      { wch: 22 }, { wch: 20 }
    ];
    XLSX.utils.book_append_sheet(wb, wsPecas, 'Lista_Pecas');

    if (excelRowsComponentes.length > 0) {
      const wsComp = XLSX.utils.json_to_sheet(excelRowsComponentes);
      wsComp['!cols'] = [
        { wch: 12 }, { wch: 8 }, { wch: 16 }, { wch: 18 }, { wch: 22 },
        { wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 16 }
      ];
      XLSX.utils.book_append_sheet(wb, wsComp, 'Lista_Componentes');
    }

    const wsImport = XLSX.utils.json_to_sheet(excelRowsImportacao);
    XLSX.utils.book_append_sheet(wb, wsImport, 'Importacao_TrackSteel');

    const outFileName = `${headerOf || currentFileName}_Fase_${headerFase || '1'}_Lista_Pecas_AdvanceSteel.xlsx`;
    XLSX.writeFile(wb, outFileName);
    addLog(`Planilha Excel baixada com ${excelRowsPecas.length} peças e ${excelRowsComponentes.length} componentes: ${outFileName}`);
    toast.success(`Planilha gerada com sucesso: ${outFileName}`);
  };

  const handleDirectImport = async () => {
    if (extractedData.length === 0) return;
    setIsDirectImporting(true);
    try {
      const importacaoRows: any[] = [];
      extractedData.forEach((item) => {
        if (item.components && item.components.length > 0) {
          item.components.forEach((comp) => {
            importacaoRows.push({
              of_number: item.of,
              etapa_fase: item.fase,
              marca: item.marca,
              descricao: item.descricao,
              quantidade: Number(item.quantidade),
              peso_unitario: item.pesoUnit === '-' ? 0 : Number(item.pesoUnit),
              peso_total: item.pesoTotal === '-' ? 0 : Number(item.pesoTotal),
              tratamento_superficial: item.tratamentoSuperficial || tratamentoGlobal,
              material: item.material,
              perfil_principal: item.perfilPrincipal,
              tem_componentes: true,
              marca_componente: comp.marca || '',
              descricao_componente: comp.perfil || item.descricao,
              perfil_componente: comp.perfil || item.descricao,
              peso_unitario_componente: comp.pesoUnitario || 0,
              quantidade_por_peca: Number(comp.quantidade) || 1
            });
          });
        } else {
          importacaoRows.push({
            of_number: item.of,
            etapa_fase: item.fase,
            marca: item.marca,
            descricao: item.descricao,
            quantidade: Number(item.quantidade),
            peso_unitario: item.pesoUnit === '-' ? 0 : Number(item.pesoUnit),
            peso_total: item.pesoTotal === '-' ? 0 : Number(item.pesoTotal),
            tratamento_superficial: item.tratamentoSuperficial || tratamentoGlobal,
            material: item.material,
            perfil_principal: item.perfilPrincipal,
            tem_componentes: false,
            marca_componente: '',
            descricao_componente: '',
            perfil_componente: '',
            peso_unitario_componente: 0,
            quantidade_por_peca: 0
          });
        }
      });

      await importPecas(importacaoRows);
      toast.success(`${extractedData.length} peças e seus componentes foram importados com sucesso!`);
      addLog(`✅ Importação concluída: ${extractedData.length} peças gravadas no banco.`);
    } catch (err: any) {
      console.error('Erro na importação direta:', err);
      toast.error(`Falha ao importar: ${err?.message || 'Erro no banco'}`);
    } finally {
      setIsDirectImporting(false);
    }
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

            {/* Indicador Automático de Tratamento Superficial da OF */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 shadow-inner flex flex-col gap-1 min-w-[240px]">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5 text-indigo-300">
                  <Paintbrush className="w-3.5 h-3.5 text-indigo-400" />
                  Tratamento Superficial:
                </span>
                <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-300 border-indigo-500/30">
                  Automático da OF
                </Badge>
              </div>
              <div className="flex items-center gap-2 pt-1 text-sm font-semibold text-white">
                <span className={`w-2.5 h-2.5 rounded-full ${tratamentoGlobal === 'galvanizacao' ? 'bg-amber-400' : 'bg-blue-400'}`}></span>
                {tratamentoGlobal === 'galvanizacao' ? 'Galvanizado (OF)' : 'Pintura (OF)'}
              </div>
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
                <span className="text-[11px] font-medium text-slate-400">{labels.ofLabel} (Obra)</span>
                <Input
                  value={headerOf}
                  onChange={(e) => handleOfChange(e.target.value)}
                  className="h-7 text-xs font-bold font-mono bg-slate-900 border-slate-700 text-indigo-300 mt-1"
                />
              </div>

              <div className="bg-slate-800/60 border border-slate-700/70 p-3 rounded-lg flex flex-col justify-between">
                <span className="text-[11px] font-medium text-slate-400">{labels.faseLabel}</span>
                <Input
                  value={headerFase}
                  onChange={(e) => handleFaseChange(e.target.value)}
                  className="h-7 text-xs font-bold font-mono bg-slate-900 border-slate-700 text-indigo-300 mt-1"
                />
              </div>

              <div className="bg-slate-800/60 border border-slate-700/70 p-3 rounded-lg">
                <span className="text-[11px] font-medium text-slate-400">Total de {labels.pecaPlural}</span>
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
                  variant="outline"
                  className="border-emerald-600/60 text-emerald-400 hover:bg-emerald-600/10 font-semibold text-xs px-3.5 h-9"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Baixar Planilha Excel
                </Button>

                <Button
                  onClick={handleDirectImport}
                  disabled={isDirectImporting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 h-9 shadow-lg shadow-indigo-950/40"
                >
                  {isDirectImporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                      Gravando no Banco...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-1.5" />
                      Importar no Sistema (Peças + Componentes)
                    </>
                  )}
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
                      <th className="p-2.5 border-b border-slate-800">{labels.ofLabel}</th>
                      <th className="p-2.5 border-b border-slate-800">{labels.faseLabel}</th>
                      <th className="p-2.5 border-b border-slate-800">{labels.pecaLabel}</th>
                      <th className="p-2.5 border-b border-slate-800">Descrição</th>
                      <th className="p-2.5 border-b border-slate-800 text-center">Com {labels.componentePlural}</th>
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

