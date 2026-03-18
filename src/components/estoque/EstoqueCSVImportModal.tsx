
import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCriarMaterial } from '@/hooks/useEstoque';
import { toast } from 'sonner';

interface EstoqueCSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CSVRow {
  [key: string]: string;
}

interface ValidationError {
  row: number;
  field: string;
  value: string;
  message: string;
}

interface ProcessedMaterial {
  codigo: string;
  descricao: string;
  tipo_material_id?: string;
  unidade: string;
  quantidade_total: number;
  quantidade_disponivel: number;
  quantidade_empenhada: number;
  quantidade_minima: number;
  quantidade_maxima?: number;
  peso_unitario: number;
  valor_unitario?: number;
  lote_atual?: string;
  fornecedor?: string;
  localizacao?: string;
  status: 'Normal' | 'Crítico' | 'Excesso';
  certificado?: string;
  observacoes?: string;
  comprimento?: number;
  largura?: number;
  espessura?: number;
  qualidade_aco?: string;
  kg_por_metro?: number;
}

const REQUIRED_FIELDS = ['descricao', 'unidade'];
const VALID_STATUS = ['Normal', 'Crítico', 'Excesso'] as const;
const VALID_UNITS = ['PC', 'KG', 'M', 'M2', 'M3', 'L', 'UN'];

export function EstoqueCSVImportModal({ isOpen, onClose }: EstoqueCSVImportModalProps) {
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [processedData, setProcessedData] = useState<ProcessedMaterial[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [fileName, setFileName] = useState('');

  const criarMaterial = useCriarMaterial();

  // Function to generate a unique codigo
  const generateCodigo = (descricao: string, index: number): string => {
    const prefix = descricao.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const timestamp = Date.now().toString().slice(-6);
    const indexStr = index.toString().padStart(3, '0');
    return `${prefix}${timestamp}${indexStr}`;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };

    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1
  });

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      toast.error('Arquivo CSV deve ter pelo menos uma linha de cabeçalho e uma linha de dados');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: CSVRow = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      rows.push(row);
    }

    setCsvData(rows);
    processAndValidateData(rows);
  };

  const processAndValidateData = (data: CSVRow[]) => {
    setIsProcessing(true);
    const errors: ValidationError[] = [];
    const processed: ProcessedMaterial[] = [];

    data.forEach((row, index) => {
      // Validate and normalize status
      let normalizedStatus: 'Normal' | 'Crítico' | 'Excesso' = 'Normal';
      if (row.status && row.status.trim()) {
        const statusValue = row.status.trim();
        if (VALID_STATUS.includes(statusValue as any)) {
          normalizedStatus = statusValue as 'Normal' | 'Crítico' | 'Excesso';
        } else {
          errors.push({
            row: index + 1,
            field: 'status',
            value: statusValue,
            message: `Status inválido. Use: ${VALID_STATUS.join(', ')}`
          });
        }
      }

      // Generate codigo if not provided
      const codigo = row.codigo?.trim() || generateCodigo(row.descricao || 'MATERIAL', index);

      const material: ProcessedMaterial = {
        codigo,
        descricao: row.descricao?.trim() || '',
        unidade: row.unidade?.trim() || 'PC',
        quantidade_total: parseFloat(row.quantidade_total) || 0,
        quantidade_disponivel: parseFloat(row.quantidade_disponivel) || 0,
        quantidade_empenhada: parseFloat(row.quantidade_empenhada) || 0,
        quantidade_minima: parseFloat(row.quantidade_minima) || 0,
        quantidade_maxima: row.quantidade_maxima ? parseFloat(row.quantidade_maxima) : undefined,
        peso_unitario: parseFloat(row.peso_unitario) || 0,
        valor_unitario: row.valor_unitario ? parseFloat(row.valor_unitario) : undefined,
        lote_atual: row.lote_atual?.trim() || undefined,
        fornecedor: row.fornecedor?.trim() || undefined,
        localizacao: row.localizacao?.trim() || undefined,
        status: normalizedStatus,
        certificado: row.certificado?.trim() || undefined,
        observacoes: row.observacoes?.trim() || undefined,
        comprimento: row.comprimento ? parseFloat(row.comprimento) : undefined,
        largura: row.largura ? parseFloat(row.largura) : undefined,
        espessura: row.espessura ? parseFloat(row.espessura) : undefined,
        qualidade_aco: row.qualidade_aco?.trim() || undefined,
        kg_por_metro: row.kg_por_metro ? parseFloat(row.kg_por_metro) : undefined,
      };

      // Validações
      REQUIRED_FIELDS.forEach(field => {
        if (!material[field as keyof ProcessedMaterial]) {
          errors.push({
            row: index + 1,
            field,
            value: row[field] || '',
            message: `Campo obrigatório não informado`
          });
        }
      });

      // Validar unidade
      if (material.unidade && !VALID_UNITS.includes(material.unidade)) {
        errors.push({
          row: index + 1,
          field: 'unidade',
          value: material.unidade,
          message: `Unidade inválida. Use: ${VALID_UNITS.join(', ')}`
        });
      }

      // Validar quantidades negativas
      const quantityFields = ['quantidade_total', 'quantidade_disponivel', 'quantidade_empenhada', 'quantidade_minima'];
      quantityFields.forEach(field => {
        const value = material[field as keyof ProcessedMaterial] as number;
        if (value < 0) {
          errors.push({
            row: index + 1,
            field,
            value: value.toString(),
            message: 'Quantidade não pode ser negativa'
          });
        }
      });

      processed.push(material);
    });

    setValidationErrors(errors);
    setProcessedData(processed);
    setShowPreview(true);
    setIsProcessing(false);
  };

  const handleImport = async () => {
    if (validationErrors.length > 0) {
      toast.error('Corrija os erros de validação antes de continuar');
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const material of processedData) {
      try {
        await criarMaterial.mutateAsync(material);
        successCount++;
      } catch (error) {
        console.error('Erro ao importar material:', error);
        errorCount++;
      }
    }

    setIsProcessing(false);
    
    if (successCount > 0) {
      toast.success(`${successCount} material(is) importado(s) com sucesso!`);
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} material(is) falharam na importação`);
    }

    if (successCount > 0) {
      handleClose();
    }
  };

  const handleClose = () => {
    setCsvData([]);
    setProcessedData([]);
    setValidationErrors([]);
    setShowPreview(false);
    setFileName('');
    setIsProcessing(false);
    onClose();
  };

  const getErrorsForRow = (rowIndex: number) => {
    return validationErrors.filter(error => error.row === rowIndex + 1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Materiais CSV
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {!showPreview ? (
            <div className="space-y-6">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                {isDragActive ? (
                  <p className="text-blue-600">Solte o arquivo aqui...</p>
                ) : (
                  <div>
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      Arraste um arquivo CSV ou clique para selecionar
                    </p>
                    <p className="text-sm text-gray-500">
                      Arquivos .csv são aceitos
                    </p>
                  </div>
                )}
              </div>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium text-gray-900 mb-4">Formato esperado do CSV:</h3>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p><strong>Campos obrigatórios:</strong> descricao, unidade</p>
                    <p><strong>Campos opcionais:</strong> codigo, quantidade_total, quantidade_disponivel, quantidade_empenhada, quantidade_minima, quantidade_maxima, peso_unitario, valor_unitario, lote_atual, fornecedor, localizacao, status, certificado, observacoes, comprimento, largura, espessura, qualidade_aco, kg_por_metro</p>
                    <p><strong>Status válidos:</strong> Normal, Crítico, Excesso</p>
                    <p><strong>Unidades válidas:</strong> PC, KG, M, M2, M3, L, UN</p>
                    <p><strong>Nota:</strong> Se o campo 'codigo' não for informado, será gerado automaticamente pelo sistema.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm font-medium">{fileName}</span>
                  </div>
                  <Badge variant={validationErrors.length > 0 ? "destructive" : "default"}>
                    {processedData.length} registros
                  </Badge>
                  {validationErrors.length > 0 && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {validationErrors.length} erros
                    </Badge>
                  )}
                </div>
              </div>

              {validationErrors.length > 0 && (
                <Card className="border-red-200">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-red-800 mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Erros de Validação
                    </h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {validationErrors.map((error, index) => (
                        <div key={index} className="text-sm text-red-700 bg-red-50 p-2 rounded">
                          <strong>Linha {error.row}:</strong> {error.field} - {error.message}
                          {error.value && <span className="ml-2 text-red-600">("{error.value}")</span>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Linha</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead>Qtd Total</TableHead>
                        <TableHead>Qtd Disp.</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Erros</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedData.map((material, index) => {
                        const errors = getErrorsForRow(index);
                        return (
                          <TableRow key={index} className={errors.length > 0 ? 'bg-red-50' : ''}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="max-w-24 truncate">{material.codigo}</TableCell>
                            <TableCell className="max-w-48 truncate">{material.descricao}</TableCell>
                            <TableCell>{material.unidade}</TableCell>
                            <TableCell>{material.quantidade_total}</TableCell>
                            <TableCell>{material.quantidade_disponivel}</TableCell>
                            <TableCell>
                              <Badge variant={material.status === 'Normal' ? 'default' : 'secondary'}>
                                {material.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {errors.length > 0 ? (
                                <Badge variant="destructive">{errors.length}</Badge>
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          {showPreview ? (
            <>
              <Button variant="outline" onClick={() => setShowPreview(false)} disabled={isProcessing}>
                <X className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={isProcessing || validationErrors.length > 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? 'Importando...' : `Importar ${processedData.length} Material(is)`}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
