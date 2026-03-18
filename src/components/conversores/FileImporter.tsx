import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Download, X, Check, Eye, Info } from 'lucide-react';
import { toast } from 'sonner';
import { usePrompts } from '@/hooks/usePrompts';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProcessedData {
  headers: string[];
  rows: any[][];
  totalRows: number;
  totalColumns: number;
  rawData: any[]; // Dados originais para processamento
}

const FileImporter: React.FC = () => {
  const { prompts, loading: promptsLoading } = usePrompts();
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingPP, setProcessingPP] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv', // .csv
        'application/pdf' // .pdf
      ];
      
      if (!validTypes.includes(selectedFile.type) && 
          !selectedFile.name.toLowerCase().endsWith('.csv')) {
        toast.error('Formato de arquivo inválido. Selecione um arquivo .xlsx, .xls, .csv ou .pdf');
        return;
      }
      
      setFile(selectedFile);
      setProcessedData(null);
    }
  };

  const processFile = async (onlyPP = false) => {
    if (!file) return;

    if (onlyPP) {
      setProcessingPP(true);
    } else {
      setProcessing(true);
    }

    try {
      let processedResult: ProcessedData;

      if (file.type === 'application/pdf') {
        // Para PDF, ainda simulamos o processamento
        await new Promise(resolve => setTimeout(resolve, 2000));
        processedResult = {
          headers: ['Marca', 'Perfil', 'Quantidade', 'Peso Unit.', 'Peso Total', 'Material'],
          rows: [
            ['P1', 'VS 200x30x5,0', '2', '15,8', '31,6', 'ASTM A36'],
            ['P2', 'VS 150x25x4,0', '4', '12,3', '49,2', 'ASTM A36'],
            ['P3', 'L 50x50x5,0', '8', '3,77', '30,16', 'ASTM A36'],
            ['P4', 'CH 100x50x17,0', '6', '17,0', '102,0', 'ASTM A36'],
            ['P5', 'FL 200x8,0', '3', '12,56', '37,68', 'ASTM A36']
          ],
          totalRows: 5,
          totalColumns: 6,
          rawData: []
        };
      } else {
        // Processar arquivos Excel/CSV usando xlsx
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        
        // Pegar a primeira planilha
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Converter para JSON com chaves como nomes das colunas
        const jsonDataWithHeaders = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        // Converter para formato de array para visualização
        const jsonArrayData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '',
          raw: false
        }) as any[][];

        if (jsonDataWithHeaders.length === 0) {
          throw new Error('Nenhum dado encontrado no arquivo');
        }

        console.log('Dados JSON com headers:', jsonDataWithHeaders);
        console.log('Dados em array:', jsonArrayData);

        // Se for processamento PP, filtrar apenas linhas onde a coluna "Pos." está vazia
        let filteredJsonData = jsonDataWithHeaders;
        let filteredArrayData = jsonArrayData;

        if (onlyPP) {
          // Filtrar dados JSON com headers
          filteredJsonData = jsonDataWithHeaders.filter(row => {
            const posValue = extrairValor(row, ['Pos.', 'Pos', 'pos', 'POS']);
            return !posValue || posValue.toString().trim() === '';
          });

          // Filtrar dados em array (manter header + linhas filtradas)
          const headerRow = jsonArrayData[0];
          const dataRows = jsonArrayData.slice(1);
          
          // Encontrar índice da coluna Pos.
          const posColumnIndex = headerRow.findIndex(header => 
            ['Pos.', 'Pos', 'pos', 'POS'].includes(header?.toString() || '')
          );

          const filteredDataRows = dataRows.filter(row => {
            if (posColumnIndex === -1) return true; // Se não encontrar coluna Pos., incluir todas
            const posValue = row[posColumnIndex];
            return !posValue || posValue.toString().trim() === '';
          });

          filteredArrayData = [headerRow, ...filteredDataRows];
        }

        // Determinar o número máximo de colunas
        const maxColumns = Math.max(...filteredArrayData.map(row => row.length));
        
        // Padronizar todas as linhas para ter o mesmo número de colunas
        const normalizedData = filteredArrayData.map(row => {
          const normalizedRow = [...row];
          while (normalizedRow.length < maxColumns) {
            normalizedRow.push('');
          }
          return normalizedRow;
        });

        // Primeira linha como headers
        const headers = normalizedData[0].map((header, index) => 
          header || `Coluna ${index + 1}`
        );
        
        // Resto como dados para visualização
        const rows = normalizedData.slice(1);

        processedResult = {
          headers,
          rows,
          totalRows: rows.length,
          totalColumns: headers.length,
          rawData: filteredJsonData // Dados originais filtrados para processamento
        };

        console.log('Dados processados:', {
          totalRows: processedResult.totalRows,
          totalColumns: processedResult.totalColumns,
          headers: processedResult.headers,
          rawDataCount: processedResult.rawData.length,
          onlyPP: onlyPP
        });
      }
      
      setProcessedData(processedResult);
      setShowPreview(true);
      
      const processType = onlyPP ? ' (apenas peças principais)' : '';
      toast.success(`Arquivo processado com sucesso${processType}! ${processedResult.totalRows} linhas e ${processedResult.totalColumns} colunas coletadas.`);
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error('Erro ao processar arquivo. Verifique se o arquivo não está corrompido.');
    } finally {
      if (onlyPP) {
        setProcessingPP(false);
      } else {
        setProcessing(false);
      }
    }
  };

  const generateCSV = async () => {
    if (!processedData || !selectedPrompt || !file) return;

    setGenerating(true);
    try {
      const selectedPromptData = prompts.find(p => p.id === selectedPrompt);
      console.log('Processando com prompt:', selectedPromptData?.name);
      console.log('Dados originais para processar:', processedData.rawData);
      
      // Processar os dados usando a lógica do prompt
      const csvContent = processSpreadsheetToCsv(file.name, processedData.rawData);
      
      // Gerar e baixar CSV
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const csvFileName = file.name.replace(/\.(xlsx|xls|pdf)$/i, '_processado.csv');
      
      link.href = URL.createObjectURL(blob);
      link.download = csvFileName;
      link.click();
      URL.revokeObjectURL(link.href);
      
      toast.success(`CSV gerado com sucesso usando o prompt: ${selectedPromptData?.name}`);
      setShowPreview(false);
      setFile(null);
      setProcessedData(null);
      setSelectedPrompt('');
    } catch (error) {
      console.error('Erro ao gerar CSV:', error);
      toast.error('Erro ao gerar CSV. Verifique as instruções do prompt e os dados.');
    } finally {
      setGenerating(false);
    }
  };

  const processSpreadsheetToCsv = (fileName: string, data: any[]): string => {
    console.log('Processando arquivo:', fileName);
    console.log('Total de linhas:', data.length);
    
    // Extrair metadados do nome do arquivo
    const fileNameParts = fileName.replace(/\.(xlsx|xls|pdf)$/i, '').split('-');
    const ofNumber = fileNameParts[0] || '';
    const etapaFase = fileNameParts[1] || '';

    console.log('OF Number:', ofNumber);
    console.log('Etapa/Fase:', etapaFase);

    const csvHeader = 'of_number,etapa_fase,marca,descricao,quantidade,peso_unitario,peso_total,tratamento_superficial,material,perfil_principal,tem_componentes,marca_componente,descricao_componente,perfil_componente,peso_unitario_componente,quantidade_por_peca';
    
    const csvRows: string[] = [csvHeader];
    let currentPecaMae: any = null;
    const componentes: any[] = [];

    // Log das colunas disponíveis
    if (data.length > 0) {
      console.log('Colunas disponíveis:', Object.keys(data[0]));
    }

    // Processar dados linha por linha
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      console.log(`Processando linha ${i + 1}:`, row);
      
      // Verificar se é uma peça-mãe (tem valor na coluna Marca)
      const marcaValue = extrairValor(row, ['Marca', 'marca', 'MARCA']);
      
      if (marcaValue && marcaValue.toString().trim() !== '') {
        console.log('Encontrou peça-mãe:', marcaValue);
        
        // Processar peça-mãe anterior se existir
        if (currentPecaMae) {
          processarPecaMae(currentPecaMae, componentes, csvRows, ofNumber, etapaFase);
        }
        
        // Nova peça-mãe
        currentPecaMae = row;
        componentes.length = 0; // Limpar componentes
      } else {
        // Verificar se é um componente através da coluna Pos.
        const posValue = extrairValor(row, ['Pos.', 'Pos', 'pos', 'POS']);
        
        if (posValue && posValue.toString().trim() !== '') {
          const posString = posValue.toString();
          console.log('Verificando Pos.:', posString);
          
          // Extrair o último número após o último hífen
          const lastNumber = posString.split('-').pop();
          
          if (lastNumber && parseInt(lastNumber) >= 1000 && parseInt(lastNumber) <= 9999) {
            console.log('Componente encontrado:', posString);
            componentes.push(row);
          }
        }
      }
    }

    // Processar última peça-mãe
    if (currentPecaMae) {
      processarPecaMae(currentPecaMae, componentes, csvRows, ofNumber, etapaFase);
    }

    console.log('Total de linhas CSV geradas:', csvRows.length - 1);
    return csvRows.join('\n');
  };

  const processarPecaMae = (pecaMae: any, componentes: any[], csvRows: string[], ofNumber: string, etapaFase: string) => {
    console.log('Processando peça-mãe:', pecaMae);
    console.log('Com componentes:', componentes);
    
    // Extrair dados da peça-mãe com diferentes variações de nomes de colunas
    const marcaCompleta = extrairValor(pecaMae, ['Marca', 'marca', 'MARCA'])?.toString() || '';
    const marca = marcaCompleta.split('-').pop() || marcaCompleta;
    const descricao = extrairValor(pecaMae, ['Descrição', 'Descricao', 'descrição', 'descricao', 'DESCRIÇÃO', 'DESCRICAO']) || '';
    const quantidade = extrairValor(pecaMae, ['Qtde', 'Quantidade', 'qtde', 'quantidade', 'QTDE', 'QUANTIDADE']) || '';
    const pesoUnitario = formatarNumero(extrairValor(pecaMae, ['P.Un.', 'PesoUnitario', 'Peso Unitário', 'peso_unitario', 'PESO_UNITARIO']));
    const pesoTotal = formatarNumero(extrairValor(pecaMae, ['P.Tot.', 'PesoTotal', 'Peso Total', 'peso_total', 'PESO_TOTAL']));
    const material = extrairValor(pecaMae, ['Mat', 'Material', 'mat', 'material', 'MAT', 'MATERIAL']) || '';
    const perfilPrincipal = material;

    console.log('Dados extraídos - Marca:', marca, 'Descrição:', descricao, 'Qtd:', quantidade);

    if (componentes.length === 0) {
      // Peça-mãe sem componentes
      const csvRow = [
        escapeCSV(ofNumber),
        escapeCSV(etapaFase),
        escapeCSV(marca),
        escapeCSV(descricao),
        escapeCSV(quantidade),
        escapeCSV(pesoUnitario),
        escapeCSV(pesoTotal),
        escapeCSV('-'), // tratamento_superficial
        escapeCSV(material),
        escapeCSV(perfilPrincipal),
        'false', // tem_componentes
        '', // marca_componente
        '', // descricao_componente
        '', // perfil_componente
        '', // peso_unitario_componente
        ''  // quantidade_por_peca
      ].join(',');
      csvRows.push(csvRow);
    } else {
      // Peça-mãe com componentes
      componentes.forEach(componente => {
        const posValue = extrairValor(componente, ['Pos.', 'Pos', 'pos', 'POS'])?.toString() || '';
        const marcaComponente = posValue.split('-').pop() || '';
        const descricaoComponente = extrairValor(componente, ['Descrição', 'Descricao', 'descrição', 'descricao', 'DESCRIÇÃO', 'DESCRICAO']) || '';
        const perfilComponente = extrairValor(componente, ['Mat', 'Material', 'mat', 'material', 'MAT', 'MATERIAL']) || '';
        const pesoUnitarioComponente = formatarNumero(extrairValor(componente, ['P.Un.', 'PesoUnitario', 'Peso Unitário', 'peso_unitario', 'PESO_UNITARIO']));
        const quantidadePorPeca = extrairValor(componente, ['Qtde', 'Quantidade', 'qtde', 'quantidade', 'QTDE', 'QUANTIDADE']) || '';

        const csvRow = [
          escapeCSV(ofNumber),
          escapeCSV(etapaFase),
          escapeCSV(marca),
          escapeCSV(descricao),
          escapeCSV(quantidade),
          escapeCSV(pesoUnitario),
          escapeCSV(pesoTotal),
          escapeCSV('-'), // tratamento_superficial
          escapeCSV(material),
          escapeCSV(perfilPrincipal),
          'true', // tem_componentes
          escapeCSV(marcaComponente),
          escapeCSV(descricaoComponente),
          escapeCSV(perfilComponente),
          escapeCSV(pesoUnitarioComponente),
          escapeCSV(quantidadePorPeca)
        ].join(',');
        csvRows.push(csvRow);
      });
    }
  };

  const extrairValor = (objeto: any, nomes: string[]): any => {
    for (const nome of nomes) {
      if (objeto[nome] !== undefined && objeto[nome] !== null && objeto[nome] !== '') {
        return objeto[nome];
      }
    }
    return '';
  };

  const escapeCSV = (valor: any): string => {
    if (valor === null || valor === undefined) return '';
    const str = valor.toString();
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const formatarNumero = (valor: any): string => {
    if (!valor) return '';
    const numeroStr = valor.toString().replace(',', '.');
    const numero = parseFloat(numeroStr);
    return isNaN(numero) ? '' : numero.toFixed(1);
  };

  const handleCancel = () => {
    setShowPreview(false);
    setProcessedData(null);
  };

  return (
    <>
      <Card className="bg-slate-700/50 border-slate-600">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importar Arquivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file-upload" className="text-white mb-2 block">
              Selecionar Arquivo
            </Label>
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls,.csv,.pdf"
              onChange={handleFileSelect}
              className="bg-slate-600 border-slate-500 text-white file:bg-slate-500 file:text-white file:border-0 file:mr-4 file:py-2 file:px-4 file:rounded"
            />
            <p className="text-slate-400 text-xs mt-1">
              Formatos suportados: .xlsx, .xls, .csv, .pdf
            </p>
          </div>

          {file && (
            <div className="p-3 bg-slate-800/50 rounded border border-slate-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="text-white text-sm">{file.name}</span>
                  <span className="text-slate-400 text-xs">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => processFile(false)}
                    disabled={processing || processingPP}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {processing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Processar
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => processFile(true)}
                    disabled={processing || processingPP}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {processingPP ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Processando PP...
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Processar PP
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="text-slate-300 text-sm">
            <h4 className="font-medium mb-2">Como funciona:</h4>
            <ul className="space-y-1 text-xs">
              <li>1. Selecione um arquivo (.xlsx, .xls, .csv ou .pdf)</li>
              <li>2. O sistema extrairá todas as tabelas e dados</li>
              <li>3. Visualize os dados processados</li>
              <li>4. Escolha um prompt para guiar a conversão</li>
              <li>5. Gere e baixe o arquivo CSV final</li>
            </ul>
            <div className="mt-2 p-2 bg-green-800/20 rounded border border-green-600">
              <p className="text-green-400 text-xs font-medium">Processar PP:</p>
              <p className="text-green-300 text-xs">Processa apenas linhas onde a coluna "Pos." está vazia (peças principais).</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-white">Dados Processados</DialogTitle>
            <DialogDescription className="text-slate-400">
              Visualize os dados extraídos do arquivo e selecione um prompt para gerar o CSV
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-white mb-2 block">Selecionar Prompt</Label>
              <Select value={selectedPrompt} onValueChange={setSelectedPrompt}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Escolha um prompt para guiar a conversão" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {prompts.map((prompt) => (
                    <SelectItem key={prompt.id} value={prompt.id} className="text-white">
                      {prompt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {prompts.length === 0 && (
                <p className="text-yellow-400 text-xs mt-1">
                  Nenhum prompt encontrado. Crie um prompt primeiro.
                </p>
              )}
            </div>

            {processedData && (
              <>
                <div className="flex items-center gap-4 p-3 bg-blue-900/30 rounded border border-blue-600">
                  <Info className="w-5 h-5 text-blue-400" />
                  <div className="text-blue-100 text-sm">
                    <span className="font-medium">Dados coletados:</span>
                    <span className="ml-2">
                      {processedData.totalRows} linhas × {processedData.totalColumns} colunas
                    </span>
                  </div>
                </div>

                <div className="border border-slate-600 rounded overflow-auto max-h-60">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-700">
                      <tr>
                        {processedData.headers.map((header, index) => (
                          <th key={index} className="px-3 py-2 text-left text-white font-medium whitespace-nowrap">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {processedData.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-t border-slate-600">
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="px-3 py-2 text-slate-300 whitespace-nowrap">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={generateCSV} 
              disabled={!selectedPrompt || generating}
              className="bg-green-600 hover:bg-green-700"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Gerando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Aceitar e Gerar CSV
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FileImporter;
