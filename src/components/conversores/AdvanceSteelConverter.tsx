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

    // Calibração inicial das colunas X para o layout padrão do Advance Steel
    const colX = {
      marca: 30,
      qtde: 100,
      nome: 180,
      qualidade: 290,
      comprimento: 370,
      largura: 430,
      pesoPeca: 490,
      totalPeso: 550,
      superficie: 610,
      totalSuperficie: 670
    };

    // Tentar recalibrar X dinamicamente a partir dos títulos das colunas
    for (const line of lines) {
      const lineText = line.map((i) => i.text).join(' ').toLowerCase();
      if (lineText.includes('marca') && (lineText.includes('qtde') || lineText.includes('quant'))) {
        for (const item of line) {
          const t = item.text.toLowerCase().trim();
          if (t === 'marca') colX.marca = item.x;
          else if (t.startsWith('qtd') || t.startsWith('quant')) colX.qtde = item.x;
          else if (t === 'nome') colX.nome = item.x;
          else if (t.startsWith('qualid')) colX.qualidade = item.x;
          else if (t.startsWith('comprim')) colX.comprimento = item.x;
          else if (t.startsWith('largura')) colX.largura = item.x;
          else if (t.includes('peso da') || t.includes('da peça') || t.includes('piece')) colX.pesoPeca = item.x;
          else if (t.includes('total peso') || (t === 'total' && item.x < 600)) colX.totalPeso = item.x;
          else if (t.includes('total superf') || (t === 'total' && item.x >= 600)) colX.totalSuperficie = item.x;
          else if (t.startsWith('superf')) colX.superficie = item.x;
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

    const assemblies: AssemblyItem[] = [];
    let currentAssembly: AssemblyItem | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineText = line.map((it) => it.text).join(' ');

      if (
        lineText.includes('Lista de Peças') ||
        lineText.includes('Cliente:') ||
        lineText.includes('Marca Quant Nome') ||
        lineText.includes('Superfície') ||
        lineText.includes('Trabalho:')
      ) {
        continue;
      }

      // 1. Identificar se a linha inicia com marca ou aglutinação de tokens (ex: B133-1-20)
      let markStr = '';
      let markTokensConsumed = 0;

      const firstTok = line[0].text.trim();
      if (firstTok.match(/^([A-Za-z0-9]+)-(\d+)-(\d+)$/) || firstTok.match(/^([A-Za-z0-9]+)-(\d+)$/)) {
        markStr = firstTok;
        markTokensConsumed = 1;
      } else {
        let candidate = '';
        let found3: { mark: string; count: number } | null = null;
        let found2: { mark: string; count: number } | null = null;

        for (let k = 0; k < Math.min(line.length, 6); k++) {
          candidate += line[k].text.trim();
          if (candidate.match(/^([A-Za-z0-9]+)-(\d+)-(\d+)$/)) {
            found3 = { mark: candidate, count: k + 1 };
            break;
          }
          if (candidate.match(/^([A-Za-z0-9]+)-(\d+)$/) && !found2) {
            found2 = { mark: candidate, count: k + 1 };
          }
        }

        if (found3) {
          markStr = found3.mark;
          markTokensConsumed = found3.count;
        } else if (found2) {
          markStr = found2.mark;
          markTokensConsumed = found2.count;
        }
      }

      if (markStr) {
        const parts = markStr.split('-');
        const ofCode = parts.length === 3 ? parts[0] : (parts.length === 2 ? parts[0] : defaultOf);
        const phaseCode = parts.length === 3 ? parts[1] : '0';
        const pieceNumber = parts.length === 3 ? parts[2] : parts[1];

        const pieceNumInt = parseInt(pieceNumber, 10);
        const isComponent = !isNaN(pieceNumInt) && pieceNumInt >= 1000;
        const remainingItems = line.slice(markTokensConsumed);

        if (!isComponent) {
          // Se a marca for idêntica à da peça principal atual, é a linha de detalhe da peça simples!
          if (currentAssembly && currentAssembly.rawMark === markStr) {
            for (const it of remainingItems) {
              const col = getNearestCol(it.x);
              const valNum = parseNumeric(it.text);
              if (col === 'qualidade' && !currentAssembly.material) {
                currentAssembly.material = it.text;
              } else if (col === 'comprimento' && valNum > 0) {
                currentAssembly.comprimento = valNum;
              } else if (col === 'pesoPeca' && valNum > 0) {
                currentAssembly.pesoUnitario = valNum;
              } else if (col === 'totalPeso' && valNum > 0) {
                currentAssembly.pesoTotal = valNum;
              }
            }
            continue;
          }

          // Nova Peça Principal
          let mainQuant = 1;
          const descTokens: string[] = [];

          for (const it of remainingItems) {
            const col = getNearestCol(it.x);
            const qVal = parseInt(it.text, 10);
            if (col === 'qtde' && !isNaN(qVal) && qVal > 0) {
              mainQuant = qVal;
            } else if (col === 'nome' || (!it.text.match(/^[0-9.,]+$/) && descTokens.length === 0)) {
              descTokens.push(it.text);
            }
          }

          if (mainQuant === 1 && remainingItems.length > 0) {
            const firstNum = remainingItems.find((it) => /^[0-9]+$/.test(it.text.trim()));
            if (firstNum) {
              const parsedQ = parseInt(firstNum.text.trim(), 10);
              if (parsedQ > 0 && parsedQ < 1000) mainQuant = parsedQ;
            }
          }

          currentAssembly = {
            rawMark: markStr,
            of: ofCode || defaultOf,
            fase: phaseCode,
            marca: pieceNumber,
            numeroPeca: pieceNumber,
            descricao: descTokens.join(' ') || 'ESTRUTURA',
            quantidade: mainQuant,
            material: '',
            comprimento: 0,
            pesoUnitario: 0,
            pesoTotal: 0,
            subtotalPeso: 0,
            isComposed: 'NÃO',
            components: []
          };
          assemblies.push(currentAssembly);
        } else {
          // Componente com marca >= 1000 (Peça Composta)
          if (currentAssembly) {
            currentAssembly.isComposed = 'SIM';
            let compQuant = 1;
            const compDescTokens: string[] = [];
            let compMaterial = 'A36';
            let compLength = 0;
            let compWeightTotal = 0;

            for (const it of remainingItems) {
              const col = getNearestCol(it.x);
              const valNum = parseNumeric(it.text);
              const t = it.text.trim();

              if (col === 'qtde') {
                const qVal = parseInt(t, 10);
                if (!isNaN(qVal)) compQuant = qVal;
              } else if (col === 'nome') {
                compDescTokens.push(t);
              } else if (col === 'qualidade') {
                compMaterial = t;
              } else if (col === 'comprimento' && valNum > 0) {
                compLength = valNum;
              } else if (col === 'totalPeso' && valNum > 0) {
                compWeightTotal = valNum;
              }
            }

            // Fallback caso coordenadas não tenham capturado peso total do componente
            if (compWeightTotal === 0) {
              const nums = remainingItems.map((it) => parseNumeric(it.text)).filter((n) => n > 0);
              if (nums.length >= 2) {
                compWeightTotal = nums[nums.length - 1];
              }
            }

            currentAssembly.components.push({
              quantidade: compQuant,
              perfil: compDescTokens.join(' ') || currentAssembly.descricao,
              material: compMaterial,
              comprimento: compLength,
              pesoTotal: compWeightTotal
            });
          }
        }
      } else {
        // Linhas sem marca explícita (subitens, parafusos '-' ou linha de subtotal)
        if (currentAssembly) {
          if (lineText.includes('M13') || lineText.startsWith('-') || lineText.includes('ASTM') || lineText.includes('10.9')) {
            currentAssembly.isComposed = 'SIM';
            let compLength = 0;
            let compWeightTotal = 0;
            let compQuant = 1;

            for (const it of line) {
              const col = getNearestCol(it.x);
              const valNum = parseNumeric(it.text);
              if (col === 'qtde') {
                const q = parseInt(it.text, 10);
                if (!isNaN(q)) compQuant = q;
              } else if (col === 'comprimento' && valNum > 0) {
                compLength = valNum;
              } else if (col === 'totalPeso' && valNum > 0) {
                compWeightTotal = valNum;
              }
            }

            currentAssembly.components.push({
              quantidade: compQuant,
              perfil: lineText.split(' ')[0] || 'ACESSÓRIO',
              material: '10.9',
              comprimento: compLength,
              pesoTotal: compWeightTotal
            });
          } else if (lineText.includes('W ') || lineText.includes('C ') || lineText.includes('Pl ')) {
            // Perfil principal de conjunto composto
            let compLength = 0;
            let compWeightTotal = 0;
            let compMaterial = 'A36';

            for (const it of line) {
              const col = getNearestCol(it.x);
              const valNum = parseNumeric(it.text);
              if (col === 'qualidade') compMaterial = it.text;
              else if (col === 'comprimento' && valNum > 0) compLength = valNum;
              else if (col === 'totalPeso' && valNum > 0) compWeightTotal = valNum;
            }

            currentAssembly.components.push({
              quantidade: 1,
              perfil: lineText.split(' ')[0] + ' ' + (lineText.split(' ')[1] || ''),
              material: compMaterial,
              comprimento: compLength,
              pesoTotal: compWeightTotal
            });
          } else {
            // Linha com totais do conjunto (ex: 3,5 na coluna Total Peso)
            for (const it of line) {
              const col = getNearestCol(it.x);
              const valNum = parseNumeric(it.text);
              if (col === 'totalPeso' && valNum > 0) {
                currentAssembly.subtotalPeso = valNum;
              }
            }
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
        let bestComp = asm.components[0];
        asm.components.forEach((c) => {
          if (c.comprimento > maxComp) {
            maxComp = c.comprimento;
            bestComp = c;
          }
          sumComponentsWeight += c.pesoTotal;
        });

        if (bestComp) {
          perfilPrincipal = bestComp.perfil || asm.descricao;
          materialPrincipal = bestComp.material || 'A36';
        }

        if (!totalPeso || totalPeso === 0) {
          totalPeso = sumComponentsWeight;
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
