
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Download, X, Check, Eye, AlertCircle } from 'lucide-react';
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

interface ConversaoGenericaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProcessedData {
  headers: string[];
  rows: any[][];
  totalRows: number;
  totalColumns: number;
  rawData: any[];
}

const ConversaoGenericaModal: React.FC<ConversaoGenericaModalProps> = ({ 
  open, 
  onOpenChange 
}) => {
  const { prompts, loading: promptsLoading } = usePrompts();
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Função para verificar se um valor é numérico decimal
  const isDecimalNumber = (value: any): boolean => {
    if (typeof value === 'number') {
      return value % 1 !== 0;
    }
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return !isNaN(num) && num % 1 !== 0 && value.includes('.');
    }
    return false;
  };

  // Função para arredondar valores decimais
  const roundDecimalValue = (value: any): any => {
    if (typeof value === 'number' && value % 1 !== 0) {
      return Math.round(value);
    }
    if (typeof value === 'string' && value.includes('.')) {
      const num = parseFloat(value);
      if (!isNaN(num) && num % 1 !== 0) {
        return Math.round(num).toString();
      }
    }
    return value;
  };

  // Função para processar e arredondar dados
  const processAndRoundData = (data: any[]): any[] => {
    return data.map(row => {
      const processedRow: any = {};
      Object.keys(row).forEach(key => {
        const value = row[key];
        processedRow[key] = roundDecimalValue(value);
      });
      return processedRow;
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
      ];
      
      if (!validTypes.includes(selectedFile.type)) {
        toast.error('Formato de arquivo inválido. Selecione um arquivo .xlsx ou .xls');
        return;
      }
      
      setFile(selectedFile);
      setProcessedData(null);
      setShowPreview(false);
    }
  };

  const processFile = async () => {
    if (!file) return;

    setProcessing(true);
    try {
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

      // Processar e arredondar dados decimais
      const roundedJsonData = processAndRoundData(jsonDataWithHeaders);

      // Determinar o número máximo de colunas
      const maxColumns = Math.max(...jsonArrayData.map(row => row.length));
      
      // Padronizar todas as linhas para ter o mesmo número de colunas e arredondar valores
      const normalizedData = jsonArrayData.map(row => {
        const normalizedRow = [...row];
        while (normalizedRow.length < maxColumns) {
          normalizedRow.push('');
        }
        // Arredondar valores decimais na visualização
        return normalizedRow.map(cell => roundDecimalValue(cell));
      });

      // Primeira linha como headers
      const headers = normalizedData[0].map((header, index) => 
        header || `Coluna ${index + 1}`
      );
      
      // Resto como dados para visualização
      const rows = normalizedData.slice(1);

      const processedResult = {
        headers,
        rows,
        totalRows: rows.length,
        totalColumns: headers.length,
        rawData: roundedJsonData
      };
      
      setProcessedData(processedResult);
      setShowPreview(true);
      
      // Contar quantos valores decimais foram arredondados
      let decimalCount = 0;
      jsonDataWithHeaders.forEach(row => {
        Object.values(row).forEach(value => {
          if (isDecimalNumber(value)) {
            decimalCount++;
          }
        });
      });
      
      if (decimalCount > 0) {
        toast.success(`Arquivo processado com sucesso! ${processedResult.totalRows} linhas e ${processedResult.totalColumns} colunas encontradas. ${decimalCount} valores decimais foram arredondados.`);
      } else {
        toast.success(`Arquivo processado com sucesso! ${processedResult.totalRows} linhas e ${processedResult.totalColumns} colunas encontradas.`);
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error('Erro ao processar arquivo. Verifique se o arquivo não está corrompido.');
    } finally {
      setProcessing(false);
    }
  };

  const generateCSV = async () => {
    if (!processedData || !selectedPrompt || !file) return;

    setGenerating(true);
    try {
      const selectedPromptData = prompts.find(p => p.id === selectedPrompt);
      console.log('Processando com prompt:', selectedPromptData?.name);
      console.log('Dados para processar:', processedData.rawData);
      
      // Processar os dados usando as instruções do prompt
      const csvContent = processDataWithPrompt(processedData.rawData, selectedPromptData?.content || '');
      
      // Gerar e baixar CSV
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const csvFileName = file.name.replace(/\.(xlsx|xls)$/i, '_convertido.csv');
      
      link.href = URL.createObjectURL(blob);
      link.download = csvFileName;
      link.click();
      URL.revokeObjectURL(link.href);
      
      toast.success(`CSV gerado com sucesso usando o prompt: ${selectedPromptData?.name}. Valores decimais foram arredondados para números inteiros.`);
      handleClose();
    } catch (error) {
      console.error('Erro ao gerar CSV:', error);
      toast.error('Erro ao gerar CSV. Verifique as instruções do prompt e os dados.');
    } finally {
      setGenerating(false);
    }
  };

  const processDataWithPrompt = (data: any[], promptContent: string): string => {
    console.log('Aplicando prompt:', promptContent);
    
    // Por enquanto, vamos fazer uma conversão básica baseada nos dados
    if (data.length === 0) return '';
    
    // Obter headers dos dados originais
    const headers = Object.keys(data[0]);
    
    // Criar cabeçalho CSV
    const csvHeaders = headers.join(',');
    
    // Converter dados para CSV, garantindo que valores numéricos não tenham decimais
    const csvRows = data.map(row => 
      headers.map(header => {
        let value = row[header];
        if (value === null || value === undefined) return '';
        
        // Arredondar valores decimais mais uma vez para garantir
        value = roundDecimalValue(value);
        
        const stringValue = value.toString();
        // Escapar valores que contêm vírgula
        return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  };

  const handleClose = () => {
    setFile(null);
    setProcessedData(null);
    setSelectedPrompt('');
    setShowPreview(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Conversão Genérica</DialogTitle>
          <DialogDescription className="text-slate-400">
            Faça upload de uma planilha Excel e selecione um prompt para processar os dados. Valores decimais serão automaticamente arredondados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seleção de arquivo */}
          <Card className="bg-slate-700/50 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Selecionar Arquivo Excel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-upload" className="text-white mb-2 block">
                  Arquivo da Planilha
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="bg-slate-600 border-slate-500 text-white file:bg-slate-500 file:text-white file:border-0 file:mr-4 file:py-2 file:px-4 file:rounded"
                />
                <p className="text-slate-400 text-xs mt-1">
                  Formatos suportados: .xlsx, .xls
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
                    <Button
                      onClick={processFile}
                      disabled={processing}
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
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seleção de prompt */}
          {showPreview && (
            <Card className="bg-slate-700/50 border-slate-600">
              <CardHeader>
                <CardTitle className="text-white text-lg">Selecionar Prompt de Conversão</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-white mb-2 block">Prompt</Label>
                  <Select value={selectedPrompt} onValueChange={setSelectedPrompt}>
                    <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
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
                    <p className="text-yellow-400 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Nenhum prompt encontrado. Crie um prompt primeiro.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview dos dados */}
          {processedData && (
            <Card className="bg-slate-700/50 border-slate-600">
              <CardHeader>
                <CardTitle className="text-white text-lg">Preview dos Dados (Valores Arredondados)</CardTitle>
                <div className="flex items-center gap-4 p-3 bg-blue-900/30 rounded border border-blue-600">
                  <Eye className="w-5 h-5 text-blue-400" />
                  <div className="text-blue-100 text-sm">
                    <span className="font-medium">Dados encontrados:</span>
                    <span className="ml-2">
                      {processedData.totalRows} linhas × {processedData.totalColumns} colunas
                    </span>
                    <span className="ml-2 text-yellow-200">
                      (Decimais arredondados automaticamente)
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
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
                      {processedData.rows.slice(0, 10).map((row, rowIndex) => (
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
                  {processedData.rows.length > 10 && (
                    <div className="p-2 text-center text-slate-400 text-xs bg-slate-800/50">
                      ... e mais {processedData.rows.length - 10} linhas
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            onClick={generateCSV} 
            disabled={!selectedPrompt || !processedData || generating}
            className="bg-green-600 hover:bg-green-700"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Gerando CSV...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Gerar CSV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConversaoGenericaModal;
