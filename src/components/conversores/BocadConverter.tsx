import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  CheckCircle2,
  AlertCircle,
  Paintbrush,
  ShieldCheck,
  FileText,
  Boxes,
  Layers,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export interface BocadConvertedPiece {
  of: string;
  fase: string;
  marca: string;
  descricao: string;
  compostoPorComponentes: 'SIM' | 'NAO';
  quantidade: number;
  pesoUnitario: number;
  pesoTotal: number;
  tratamentoSuperficial: string;
  material: string;
  perfilPrincipal: string;
  comprimentoRef: number | string;
  qtdComponentesFilhos: number;
}

interface RawBocadComponent {
  marca: string;
  quant: number;
  perfil: string;
  qualid: string;
  compr: number | string;
  pesoUnit: number;
  pesoTot: number;
  nota: string;
  rowIndex: number;
}

interface RawBocadAssembly {
  marca: string;
  quant: number;
  descricao: string; // Coluna Perfil da linha cinza (ex: VIGA)
  compr: number | string;
  pesoUnit: number;
  pesoTot: number;
  nota: string;
  rowIndex: number;
  components: RawBocadComponent[];
}

export const BocadConverter: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tratamentoGlobal, setTratamentoGlobal] = useState<'pintura' | 'galvanizacao'>('pintura');
  const [extractedPieces, setExtractedPieces] = useState<BocadConvertedPiece[]>([]);
  const [headerOf, setHeaderOf] = useState<string>('');
  const [headerFase, setHeaderFase] = useState<string>('');
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) => {
    setProcessingLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Normalizador de Material (ex: ASTM-A572 -> A572-GR 50, ASTM-A36 -> A36)
  const normalizeMaterial = (rawMat: string): string => {
    if (!rawMat) return 'A36';
    const clean = rawMat.trim().toUpperCase();

    if (clean.includes('A572') || clean.includes('A-572')) {
      if (clean.includes('50') || clean.includes('GR50') || clean.includes('GR 50')) {
        return 'A572-GR 50';
      }
      return 'A572-GR 50';
    }

    if (clean.includes('A36') || clean.includes('A-36')) {
      return 'A36';
    }

    if (clean.includes('1020') || clean.includes('SAE1020') || clean.includes('SAE 1020')) {
      return 'SAE 1020';
    }

    // Remove prefixo ASTM- se existir
    return clean.replace(/^ASTM-?/i, '').trim();
  };

  // Conversão de valor numérico seguro
  const parseSafeNumber = (val: unknown): number => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;

    let str = String(val).trim();
    if (str.includes('.') && str.includes(',')) {
      if (str.indexOf('.') < str.indexOf(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
      } else {
        str = str.replace(/,/g, '');
      }
    } else if (str.includes(',')) {
      str = str.replace(',', '.');
    }

    const n = parseFloat(str);
    return isNaN(n) ? 0 : n;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  // Função principal de leitura e parsing da planilha Bocad
  const processSelectedFile = async (file: File) => {
    const isExcel =
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel';

    if (!isExcel) {
      toast.error('Por favor, selecione um arquivo Excel (.xlsx ou .xls).');
      return;
    }

    setSelectedFile(file);
    setIsProcessing(true);
    setProcessingLogs([]);
    setExtractedPieces([]);

    addLog(`Iniciando leitura do arquivo: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellStyles: true });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('A planilha selecionada não possui abas de dados.');
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      addLog(`Aba selecionada: "${firstSheetName}"`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      addLog(`Total de linhas brutas encontradas: ${rawRows.length}`);

      if (rawRows.length < 5) {
        throw new Error('O arquivo não possui linhas suficientes para o padrão de listas Bocad.');
      }

      // 1. Extração do Cabeçalho Geral: Obra (OF) e Fase
      let detectedOF = '';
      let detectedFase = '';

      for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
        const row = rawRows[r];
        if (!Array.isArray(row)) continue;

        for (let c = 0; c < row.length; c++) {
          const valStr = String(row[c] || '').trim();
          const valLower = valStr.toLowerCase();

          // Identificar Obra -> OF
          if (valLower === 'obra' || valLower.startsWith('obra:')) {
            for (let k = c + 1; k < row.length; k++) {
              const nextVal = String(row[k] || '').trim();
              if (nextVal) {
                const match = nextVal.match(/B\s*(\d+)/i);
                detectedOF = match ? `B${match[1]}` : nextVal;
                break;
              }
            }
          }

          // Identificar Fase
          if (valLower === 'fase' || valLower.startsWith('fase:')) {
            for (let k = c + 1; k < row.length; k++) {
              const nextVal = String(row[k] || '').trim();
              if (nextVal) {
                detectedFase = nextVal;
                break;
              }
            }
          }
        }
      }

      // Fallbacks inteligentes se não encontrou nos labels específicos
      if (!detectedOF) {
        // Tenta buscar "B" seguido de números em qualquer célula das primeiras 10 linhas
        for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
          const rowStr = rawRows[r].join(' ');
          const match = rowStr.match(/B\s*(\d{2,4})/i);
          if (match) {
            detectedOF = `B${match[1]}`;
            break;
          }
        }
      }

      if (!detectedOF) detectedOF = 'B138';
      if (!detectedFase) detectedFase = '1';

      setHeaderOf(detectedOF);
      setHeaderFase(detectedFase);
      addLog(`OF detectada: ${detectedOF} | Fase detectada: ${detectedFase}`);

      // 2. Localização da Tabela de Peças (Linha de Cabeçalho das Colunas)
      let headerRowIndex = -1;
      let colMarca = 0;
      let colQuant = 1;
      let colPerfil = 2;
      let colQualid = 3;
      let colCompr = 4;
      let colPesoUnit = 5;
      let colPesoTot = 6;
      let colNota = 8;

      for (let r = 0; r < Math.min(rawRows.length, 25); r++) {
        const row = rawRows[r];
        if (!Array.isArray(row)) continue;

        const rowStr = row.map((cell) => String(cell || '').trim().toLowerCase()).join(' | ');

        if (
          (rowStr.includes('marca') && rowStr.includes('quant')) ||
          (rowStr.includes('marca') && rowStr.includes('perfil'))
        ) {
          headerRowIndex = r;

          // Mapeia colunas dinamicamente com base no texto exato
          row.forEach((cell, cIdx) => {
            const cStr = String(cell || '').trim().toLowerCase();
            if (cStr === 'marca') colMarca = cIdx;
            else if (cStr.startsWith('quant')) colQuant = cIdx;
            else if (cStr === 'perfil') colPerfil = cIdx;
            else if (cStr.startsWith('qualid') || cStr.startsWith('material')) colQualid = cIdx;
            else if (cStr.startsWith('compr')) colCompr = cIdx;
            else if (cStr === 'peso' || cStr.includes('peso kg')) colPesoUnit = cIdx;
            else if (cStr.includes('peso tot')) colPesoTot = cIdx;
            else if (cStr === 'nota') colNota = cIdx;
          });

          addLog(`Cabeçalho da tabela de peças encontrado na linha ${r + 1}`);
          break;
        }
      }

      if (headerRowIndex === -1) {
        throw new Error("Não foi possível encontrar a linha de cabeçalho da tabela ('Marca', 'Quant', 'Perfil').");
      }

      // 3. Agrupamento de Linhas Principais (Fundo Cinza) e Componentes (Fundo Branco)
      const assemblies: RawBocadAssembly[] = [];
      let currentAssembly: RawBocadAssembly | null = null;

      const normalizeCell = (val: unknown) => String(val || '').trim();

      for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0) continue;

        const marcaVal = normalizeCell(row[colMarca]);
        const quantVal = parseSafeNumber(row[colQuant]);
        const perfilVal = normalizeCell(row[colPerfil]);
        const qualidVal = normalizeCell(row[colQualid]);
        const comprVal = normalizeCell(row[colCompr]);
        const pesoUnitVal = parseSafeNumber(row[colPesoUnit]);
        const pesoTotVal = parseSafeNumber(row[colPesoTot]);
        const notaVal = normalizeCell(row[colNota]);

        // Verifica se chegamos ao final da tabela (linha de Total ou fim de dados)
        if (
          marcaVal.toLowerCase().startsWith('total') ||
          perfilVal.toLowerCase().startsWith('total') ||
          notaVal.toLowerCase().startsWith('total')
        ) {
          addLog(`Linha de totalizador encontrada na linha ${r + 1}. Finalizando leitura.`);
          break;
        }

        // Se a linha estiver completamente vazia, encerra ou pula
        if (!marcaVal && !perfilVal && quantVal === 0 && pesoTotVal === 0) {
          continue;
        }

        // Critério de identificação da Peça Principal (Linha com Fundo Cinza):
        // No formato Bocad:
        // 1. Linha principal tem 'Marca' preenchida, 'Quant' > 0, 'Perfil' genérico (ex: VIGA)
        // 2. E o campo 'Qualid' é VAZIO na linha principal (o aço fica nas linhas de componentes)
        // 3. O Peso Total é a somatória do lote da peça
        const isMainAssemblyRow = !qualidVal && marcaVal && quantVal > 0 && perfilVal;

        if (isMainAssemblyRow) {
          // Se já havia um subconjunto sendo processado, salva-o
          if (currentAssembly) {
            assemblies.push(currentAssembly);
          }

          currentAssembly = {
            marca: marcaVal,
            quant: quantVal,
            descricao: perfilVal,
            compr: comprVal,
            pesoUnit: pesoUnitVal,
            pesoTot: pesoTotVal,
            nota: notaVal,
            rowIndex: r + 1,
            components: []
          };
        } else if (currentAssembly) {
          // Linha com Fundo Branco (Componente / Sub-peça associada ao subconjunto atual)
          currentAssembly.components.push({
            marca: marcaVal,
            quant: quantVal,
            perfil: perfilVal,
            qualid: qualidVal,
            compr: comprVal,
            pesoUnit: pesoUnitVal,
            pesoTot: pesoTotVal,
            nota: notaVal,
            rowIndex: r + 1
          });
        }
      }

      // Adiciona o último subconjunto
      if (currentAssembly) {
        assemblies.push(currentAssembly);
      }

      addLog(`Total de peças principais (subconjuntos) identificadas: ${assemblies.length}`);

      if (assemblies.length === 0) {
        throw new Error('Nenhuma peça principal com fundo cinza foi identificada na planilha.');
      }

      // 4. Montagem das Peças Convertidas segundo as Regras do Usuário
      const converted: BocadConvertedPiece[] = assemblies.map((asm) => {
        const whiteRowsCount = asm.components.length;

        // Regra do Usuário:
        // "se a planilha tiver duas ou mais linhas com fundo branco apos um fundo cinza (que é a peça principal)
        // é porque a peças principal tem componentes sim!
        // caso haver apenas uma linha com fundo branco apos uma linha com fundo cinza é porque ela é unica e nao tem componentes."
        const isComposed: 'SIM' | 'NAO' = whiteRowsCount >= 2 ? 'SIM' : 'NAO';

        // Regra do Usuário:
        // "quando a peças tem varios componentes , vao aparecer varios materiais e perfil principal ,
        // mas sempre pegue as informacoes da primeira linha abaixo da peça principal (fundo cinza) OK!"
        const firstWhiteRow = asm.components[0];

        const perfilPrincipal = firstWhiteRow ? firstWhiteRow.perfil : asm.descricao;
        const rawMaterial = firstWhiteRow ? firstWhiteRow.qualid : 'A36';
        const normalizedMat = normalizeMaterial(rawMaterial);

        // Comprimento de referência (pega da linha principal, do primeiro componente ou do maior componente)
        let maxCompSub = 0;
        asm.components.forEach(c => {
          const n = Number(c.compr) || 0;
          if (n > maxCompSub) maxCompSub = n;
        });
        const compRef = asm.compr || (firstWhiteRow ? firstWhiteRow.compr : '') || (maxCompSub > 0 ? maxCompSub : '');

        return {
          of: detectedOF,
          fase: detectedFase,
          marca: asm.marca,
          descricao: asm.descricao, // Coluna 'Perfil' da linha cinza, ex: VIGA
          compostoPorComponentes: isComposed,
          quantidade: asm.quant,
          pesoUnitario: asm.pesoUnit,
          pesoTotal: asm.pesoTot,
          tratamentoSuperficial: tratamentoGlobal,
          material: normalizedMat,
          perfilPrincipal: perfilPrincipal,
          comprimentoRef: compRef,
          qtdComponentesFilhos: whiteRowsCount
        };
      });

      setExtractedPieces(converted);
      addLog(`Conversão concluída com sucesso! ${converted.length} peças prontas para exportação.`);
      toast.success(`${converted.length} peças identificadas com sucesso a partir da lista Bocad!`);
    } catch (err: unknown) {
      console.error('Erro na leitura da planilha Bocad:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao processar o arquivo';
      addLog(`ERRO: ${msg}`);
      toast.error(`Falha no processamento: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Atualização dinâmica quando o usuário troca o Tratamento Superficial global
  const handleTratamentoChange = (novoTratamento: 'pintura' | 'galvanizacao') => {
    setTratamentoGlobal(novoTratamento);
    setExtractedPieces((prev) =>
      prev.map((item) => ({
        ...item,
        tratamentoSuperficial: novoTratamento
      }))
    );
  };

  // Atualização dinâmica de OF e Fase para todas as peças
  const handleOfChange = (newOf: string) => {
    setHeaderOf(newOf);
    setExtractedPieces((prev) =>
      prev.map((item) => ({
        ...item,
        of: newOf
      }))
    );
  };

  const handleFaseChange = (newFase: string) => {
    setHeaderFase(newFase);
    setExtractedPieces((prev) =>
      prev.map((item) => ({
        ...item,
        fase: newFase
      }))
    );
  };

  // 5. Geração e Download da Planilha Excel Padrão de Destino (Print 2)
  const exportToOfficialExcel = () => {
    if (extractedPieces.length === 0) {
      toast.error('Nenhum dado extraído para exportar.');
      return;
    }

    try {
      // Cabeçalho exatamente igual ao Print 2 e ao ImportarXLSModal
      const rows = extractedPieces.map((p) => ({
        OF: p.of,
        Fase: isNaN(Number(p.fase)) ? p.fase : Number(p.fase),
        Marca: isNaN(Number(p.marca)) ? p.marca : Number(p.marca),
        Descrição: p.descricao,
        'Composto por Componentes': p.compostoPorComponentes,
        Quantidade: Number(p.quantidade),
        'Peso Unitário (kg)': Number(p.pesoUnitario),
        'Peso Total (kg)': Number(p.pesoTotal),
        'Tratamento Superficial': p.tratamentoSuperficial,
        Material: p.material,
        'Perfil Principal': p.perfilPrincipal,
        'Comprimento Ref. (mm)': p.comprimentoRef ? Number(p.comprimentoRef) : ''
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);

      // Larguras adequadas para cada coluna
      ws['!cols'] = [
        { wch: 10 }, // OF
        { wch: 8 },  // Fase
        { wch: 10 }, // Marca
        { wch: 16 }, // Descrição
        { wch: 26 }, // Composto por Componentes
        { wch: 12 }, // Quantidade
        { wch: 18 }, // Peso Unitário (kg)
        { wch: 16 }, // Peso Total (kg)
        { wch: 22 }, // Tratamento Superficial
        { wch: 16 }, // Material
        { wch: 22 }, // Perfil Principal
        { wch: 22 }  // Comprimento Ref. (mm)
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Lista_Pecas');

      const outFileName = `${headerOf || 'OF'}_Fase_${headerFase || '1'}_Lista_Pecas_Bocad.xlsx`;
      XLSX.writeFile(wb, outFileName);

      toast.success(`Planilha padrão baixada com sucesso: ${outFileName}`);
      addLog(`Planilha gerada e baixada: ${outFileName}`);
    } catch (err: unknown) {
      console.error('Erro ao exportar planilha:', err);
      toast.error('Erro ao gerar o arquivo Excel para download.');
    }
  };

  const totalPesoGeral = extractedPieces.reduce((acc, curr) => acc + (curr.pesoTotal || 0), 0);
  const totalPecasCompostas = extractedPieces.filter((p) => p.compostoPorComponentes === 'SIM').length;
  const totalPecasSimples = extractedPieces.filter((p) => p.compostoPorComponentes === 'NAO').length;

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
                  Conversor de Listas Bocad (BSI)
                </CardTitle>
              </div>
              <CardDescription className="text-slate-300 text-sm">
                Converte a Lista de Sub-conjuntos do Bocad para o padrão oficial de importação do TrackSteel.
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
                  <RadioGroupItem value="pintura" id="trat-pintura" className="border-indigo-400 text-indigo-500" />
                  <Label htmlFor="trat-pintura" className="text-xs font-medium text-slate-200 cursor-pointer">
                    Pintura
                  </Label>
                </div>

                <div className="flex items-center space-x-2 bg-slate-900/90 hover:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700/70 cursor-pointer transition-colors">
                  <RadioGroupItem value="galvanizacao" id="trat-galvanizacao" className="border-indigo-400 text-indigo-500" />
                  <Label htmlFor="trat-galvanizacao" className="text-xs font-medium text-slate-200 cursor-pointer">
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
              accept=".xls,.xlsx"
              onChange={handleFileSelect}
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
                    <span className="text-indigo-400 font-bold hover:underline">Clique para selecionar</span> ou arraste a lista Bocad (.xlsx / .xls)
                  </>
                )}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Lê automaticamente cabeçalho (Obra, Fase), peças com fundo cinza e componentes filhos com fundo branco.
              </p>
            </div>

            {selectedFile && (
              <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700 mt-2 font-mono text-[11px]">
                {(selectedFile.size / 1024).toFixed(1)} KB carregado
              </Badge>
            )}
          </div>

          {/* Cards de Métricas e Identificação da OF */}
          {extractedPieces.length > 0 && (
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
                  {extractedPieces.length} <span className="text-xs font-normal text-slate-400">itens</span>
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
          {extractedPieces.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/40 p-3 rounded-lg border border-slate-700/60">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs px-2.5 py-1">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" />
                  {extractedPieces.length} Peças Prontas para Importação
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
                  onClick={exportToOfficialExcel}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 h-9 shadow-lg shadow-emerald-950/40"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Baixar Planilha Padrão (.xlsx)
                </Button>
              </div>
            </div>
          )}

          {/* Logs Expansíveis */}
          {showLogs && processingLogs.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-slate-400 space-y-1 max-h-40 overflow-y-auto">
              {processingLogs.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          )}

          {/* Tabela de Pré-visualização com Visual Moderno (Igual ao Print 2) */}
          {extractedPieces.length > 0 && (
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
                    {extractedPieces.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-2.5 font-mono text-indigo-300 font-medium">{p.of}</td>
                        <td className="p-2.5 font-mono text-slate-300">{p.fase}</td>
                        <td className="p-2.5 font-mono font-bold text-white">{p.marca}</td>
                        <td className="p-2.5 text-slate-200 font-medium">{p.descricao}</td>
                        <td className="p-2.5 text-center">
                          {p.compostoPorComponentes === 'SIM' ? (
                            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] px-2 py-0">
                              SIM ({p.qtdComponentesFilhos})
                            </Badge>
                          ) : (
                            <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-[10px] px-2 py-0">
                              NAO (1)
                            </Badge>
                          )}
                        </td>
                        <td className="p-2.5 text-center font-bold text-slate-200">{p.quantidade}</td>
                        <td className="p-2.5 text-right font-mono text-slate-300">
                          {p.pesoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-amber-300">
                          {p.pesoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        </td>
                        <td className="p-2.5 text-slate-300">
                          <Badge variant="outline" className="text-[10px] bg-slate-900 border-slate-700 text-slate-300">
                            {p.tratamentoSuperficial}
                          </Badge>
                        </td>
                        <td className="p-2.5 font-medium text-emerald-400">{p.material}</td>
                        <td className="p-2.5 font-mono text-slate-200">{p.perfilPrincipal}</td>
                        <td className="p-2.5 text-right font-mono text-slate-400">
                          {p.comprimentoRef || '-'}
                        </td>
                      </tr>
                    ))}
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

export default BocadConverter;
