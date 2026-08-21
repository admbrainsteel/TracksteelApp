import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Check, X, Upload, FileSpreadsheet, Weight, AlertCircle, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { parseCSV } from '@/utils/csvUtils';

interface PecaCSVData {
  of_number: string;
  etapa_fase: string;
  marca: string;
  descricao: string;
  quantidade: number;
  peso_unitario: number;
  peso_total: number;
  tratamento_superficial: string;
  material: string;
  perfil_principal: string;
  tem_componentes: boolean;
  marca_componente?: string;
  descricao_componente?: string;
  perfil_componente?: string;
  peso_unitario_componente?: number;
  quantidade_por_peca?: number;
}

interface DuplicateInfo {
  index: number;
  marca: string;
  of_number: string;
  etapa_fase: string;
  isDuplicate: boolean;
}

interface ValidationError {
  row: number;
  column: string;
  value: any;
  error: string;
  suggestion: string;
  canAutoFix: boolean;
}

interface ImportarPecasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (pecas: PecaCSVData[]) => Promise<void>;
  pecasExistentes: Array<{ marca: string; of_number: string; etapa_fase: string }>;
}

export function ImportarPecasModal({ open, onOpenChange, onImport, pecasExistentes }: ImportarPecasModalProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<PecaCSVData[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [showErrors, setShowErrors] = useState(false);

  const requiredHeaders = [
    'of_number', 'etapa_fase', 'marca', 'descricao', 'quantidade',
    'peso_unitario', 'peso_total', 'tratamento_superficial', 'material',
    'perfil_principal', 'tem_componentes', 'marca_componente',
    'descricao_componente', 'perfil_componente', 'peso_unitario_componente',
    'quantidade_por_peca'
  ];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      console.log('📁 Arquivo CSV selecionado:', file.name, 'Tamanho:', file.size);
    } else {
      toast.error('Por favor, selecione um arquivo CSV válido');
    }
  };

  const validateAndCleanData = (rawRow: any, rowIndex: number): { data: PecaCSVData | null; errors: ValidationError[] } => {
    const errors: ValidationError[] = [];
    
    console.log(`🔍 Validando linha ${rowIndex + 1}:`, rawRow);
    
    // Verificar campos obrigatórios
    const requiredStringFields = ['of_number', 'marca', 'descricao'];
    requiredStringFields.forEach(field => {
      if (!rawRow[field] || rawRow[field].toString().trim() === '') {
        errors.push({
          row: rowIndex + 1,
          column: field,
          value: rawRow[field],
          error: 'Campo obrigatório vazio',
          suggestion: 'Preencha este campo obrigatório',
          canAutoFix: false
        });
      }
    });

    // Validar e converter campos numéricos
    const numericFields = ['quantidade', 'peso_unitario', 'peso_total', 'peso_unitario_componente', 'quantidade_por_peca'];
    const convertedData: any = { ...rawRow };

    numericFields.forEach(field => {
      const value = rawRow[field];
      if (value !== null && value !== undefined && value !== '') {
        // Limpar e converter string para número
        let cleanValue = value.toString().replace(',', '.');
        const numValue = parseFloat(cleanValue);
        
        if (isNaN(numValue)) {
          errors.push({
            row: rowIndex + 1,
            column: field,
            value: value,
            error: 'Valor numérico inválido',
            suggestion: `Corrigir para um número válido (ex: ${field === 'quantidade' ? '10' : '152.5'})`,
            canAutoFix: /^[\d,\.]+$/.test(value.toString())
          });
          convertedData[field] = 0;
        } else {
          convertedData[field] = numValue;
        }
      } else {
        convertedData[field] = field.includes('componente') ? 0 : (field === 'quantidade' ? 1 : 0);
      }
    });

    // Validar campo booleano
    const boolValue = rawRow.tem_componentes;
    if (boolValue !== null && boolValue !== undefined) {
      const strValue = boolValue.toString().toLowerCase().trim();
      if (['true', '1', 'sim', 'yes'].includes(strValue)) {
        convertedData.tem_componentes = true;
      } else if (['false', '0', 'não', 'nao', 'no'].includes(strValue)) {
        convertedData.tem_componentes = false;
      } else {
        errors.push({
          row: rowIndex + 1,
          column: 'tem_componentes',
          value: boolValue,
          error: 'Valor booleano inválido',
          suggestion: 'Use: true/false, 1/0, sim/não',
          canAutoFix: true
        });
        convertedData.tem_componentes = false;
      }
    } else {
      convertedData.tem_componentes = false;
    }

    if (errors.length > 0) {
      console.log(`❌ Erros na linha ${rowIndex + 1}:`, errors);
      return { data: null, errors };
    }

    // Criar objeto final
    const processedData: PecaCSVData = {
      of_number: convertedData.of_number?.toString().trim() || '',
      etapa_fase: convertedData.etapa_fase?.toString().trim() || '',
      marca: convertedData.marca?.toString().trim() || '',
      descricao: convertedData.descricao?.toString().trim() || '',
      quantidade: convertedData.quantidade || 0,
      peso_unitario: convertedData.peso_unitario || 0,
      peso_total: convertedData.peso_total || 0,
      tratamento_superficial: convertedData.tratamento_superficial?.toString().trim() || '',
      material: convertedData.material?.toString().trim() || '',
      perfil_principal: convertedData.perfil_principal?.toString().trim() || '',
      tem_componentes: convertedData.tem_componentes,
      marca_componente: convertedData.marca_componente?.toString().trim() || '',
      descricao_componente: convertedData.descricao_componente?.toString().trim() || '',
      perfil_componente: convertedData.perfil_componente?.toString().trim() || '',
      peso_unitario_componente: convertedData.peso_unitario_componente || 0,
      quantidade_por_peca: convertedData.quantidade_por_peca || 0
    };

    console.log(`✅ Linha ${rowIndex + 1} processada:`, processedData);
    return { data: processedData, errors: [] };
  };

  const processCSV = async () => {
    if (!csvFile) return;

    console.log('🔄 Processando arquivo CSV...');
    setIsLoading(true);
    
    try {
      const text = await csvFile.text();
      const parsed = parseCSV(text);

      console.log('📊 Dados parseados:', parsed.length, 'linhas');

      if (parsed.length === 0) {
        toast.error('Arquivo CSV vazio ou inválido');
        return;
      }

      setRawData(parsed);

      // Verificar headers
      const firstRow = parsed[0];
      const missingHeaders = requiredHeaders.filter(header => !(header in firstRow));
      
      if (missingHeaders.length > 0) {
        console.error('❌ Headers obrigatórios ausentes:', missingHeaders);
        toast.error(`Colunas obrigatórias ausentes: ${missingHeaders.join(', ')}`);
        return;
      }

      // Processar e validar cada linha
      const validData: PecaCSVData[] = [];
      const allErrors: ValidationError[] = [];

      parsed.forEach((row, index) => {
        const { data, errors } = validateAndCleanData(row, index);
        if (data) {
          validData.push(data);
        }
        allErrors.push(...errors);
      });

      console.log('✅ Linhas válidas processadas:', validData.length);
      console.log('❌ Erros encontrados:', allErrors.length);

      setValidationErrors(allErrors);

      // Verificar duplicatas para dados válidos
      const duplicateInfo: DuplicateInfo[] = validData.map((peca, index) => {
        const isDuplicate = pecasExistentes.some(existente => 
          existente.marca === peca.marca &&
          existente.of_number === peca.of_number &&
          existente.etapa_fase === peca.etapa_fase
        );

        return {
          index,
          marca: peca.marca,
          of_number: peca.of_number,
          etapa_fase: peca.etapa_fase,
          isDuplicate
        };
      });

      setCsvData(validData);
      setDuplicates(duplicateInfo);
      setStep('preview');

      // Mostrar resumo
      if (allErrors.length > 0) {
        toast.warning(`${parsed.length - validData.length} linha(s) com problemas encontradas. Verifique os detalhes.`);
      } else {
        toast.success(`${validData.length} peça(s) válida(s) encontrada(s) para importação!`);
      }
    } catch (error) {
      console.error('❌ Erro ao processar CSV:', error);
      toast.error('Erro ao processar arquivo CSV');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoFix = () => {
    const fixableErrors = validationErrors.filter(err => err.canAutoFix);
    
    if (fixableErrors.length === 0) {
      toast.info('Não há erros que possam ser corrigidos automaticamente');
      return;
    }

    // Aplicar correções automáticas e reprocessar
    const correctedRawData = rawData.map((row, index) => {
      const rowErrors = fixableErrors.filter(err => err.row === index + 1);
      const correctedRow = { ...row };

      rowErrors.forEach(error => {
        if (error.column === 'tem_componentes') {
          correctedRow[error.column] = 'false';
        } else if (['quantidade', 'peso_unitario', 'peso_total', 'peso_unitario_componente', 'quantidade_por_peca'].includes(error.column)) {
          const cleaned = error.value.toString().replace(/[^\d,\.]/g, '').replace(',', '.');
          correctedRow[error.column] = cleaned;
        }
      });

      return correctedRow;
    });

    // Reprocessar com dados corrigidos
    const validData: PecaCSVData[] = [];
    const remainingErrors: ValidationError[] = [];

    correctedRawData.forEach((row, index) => {
      const { data, errors } = validateAndCleanData(row, index);
      if (data) {
        validData.push(data);
      }
      remainingErrors.push(...errors);
    });

    setValidationErrors(remainingErrors);
    setCsvData(validData);

    toast.success(`${fixableErrors.length} erro(s) corrigido(s) automaticamente`);
  };

  const handleImport = async () => {
    const validPecas = csvData.filter((_, index) => !duplicates[index]?.isDuplicate);
    
    console.log('🚀 Iniciando importação de', validPecas.length, 'peças...');
    
    if (validPecas.length === 0) {
      toast.error('Nenhuma peça válida para importar');
      return;
    }

    setIsLoading(true);
    try {
      await onImport(validPecas);
      console.log('✅ Importação concluída com sucesso!');
      handleClose();
    } catch (error) {
      console.error('❌ Erro na importação:', error);
      toast.error(`Erro ao importar peças: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    console.log('🔒 Fechando modal de importação');
    setCsvFile(null);
    setCsvData([]);
    setRawData([]);
    setDuplicates([]);
    setValidationErrors([]);
    setStep('upload');
    setShowErrors(false);
    onOpenChange(false);
  };

  const duplicateCount = duplicates.filter(d => d.isDuplicate).length;
  const validCount = csvData.length - duplicateCount;
  const totalRows = rawData.length;
  const errorCount = validationErrors.length;
  const rowsWithErrors = new Set(validationErrors.map(err => err.row)).size;
  
  const totalWeight = csvData
    .filter((_, index) => !duplicates[index]?.isDuplicate)
    .reduce((sum, peca) => sum + peca.peso_total, 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Peças via CSV
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">Selecionar arquivo CSV</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
            </div>

            {csvFile && (
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription>
                  Arquivo selecionado: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                </AlertDescription>
              </Alert>
            )}

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Formato do arquivo CSV:</p>
              <p className="mb-1">Colunas obrigatórias (em ordem):</p>
              <div className="text-xs bg-muted p-3 rounded leading-relaxed break-words">
                <div className="grid grid-cols-2 gap-2">
                  <div>of_number, etapa_fase, marca, descricao,</div>
                  <div>quantidade, peso_unitario, peso_total,</div>
                  <div>tratamento_superficial, material,</div>
                  <div>perfil_principal, tem_componentes,</div>
                  <div>marca_componente, descricao_componente,</div>
                  <div>perfil_componente, peso_unitario_componente,</div>
                  <div>quantidade_por_peca</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <FileSpreadsheet className="h-3 w-3 mr-1" />
                  {totalRows} total
                </Badge>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Check className="h-3 w-3 mr-1" />
                  {validCount} válidas
                </Badge>
                {duplicateCount > 0 && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <X className="h-3 w-3 mr-1" />
                    {duplicateCount} duplicatas
                  </Badge>
                )}
                {rowsWithErrors > 0 && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {rowsWithErrors} com erros
                  </Badge>
                )}
              </div>
              {rowsWithErrors > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowErrors(!showErrors)}
                  className="text-orange-600 border-orange-200"
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {showErrors ? 'Ocultar' : 'Ver'} Erros
                </Button>
              )}
            </div>

            {duplicateCount > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {duplicateCount} peça(s) já existem no banco de dados e serão ignoradas na importação.
                </AlertDescription>
              </Alert>
            )}

            {rowsWithErrors > 0 && !showErrors && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>
                    {rowsWithErrors} linha(s) não puderam ser processadas devido a erros nos dados.
                  </span>
                  <div className="flex gap-2">
                    {validationErrors.some(err => err.canAutoFix) && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleAutoFix}
                        className="text-blue-600"
                      >
                        <Edit3 className="h-3 w-3 mr-1" />
                        Corrigir Automaticamente
                      </Button>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {showErrors && rowsWithErrors > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Erros Encontrados:</h4>
                  {validationErrors.some(err => err.canAutoFix) && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleAutoFix}
                      className="text-blue-600"
                    >
                      <Edit3 className="h-3 w-3 mr-1" />
                      Corrigir Automaticamente
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-32 border rounded-md">
                  <div className="p-3 space-y-1">
                    {validationErrors.map((error, index) => (
                      <div key={index} className="text-xs p-2 bg-orange-50 rounded border-l-2 border-orange-300">
                        <div className="font-medium text-orange-800">
                          Linha {error.row}, Coluna "{error.column}"
                        </div>
                        <div className="text-orange-700">
                          Valor: "{error.value}" - {error.error}
                        </div>
                        <div className="text-orange-600 italic">
                          Sugestão: {error.suggestion}
                          {error.canAutoFix && <span className="text-blue-600 ml-1">(Pode ser corrigido automaticamente)</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <ScrollArea className="h-64 border rounded-md">
              <div className="p-4">
                <div className="grid grid-cols-10 gap-2 text-xs font-medium border-b pb-2 mb-2">
                  <div>Status</div>
                  <div>OF</div>
                  <div>Fase</div>
                  <div>Marca</div>
                  <div>Descrição</div>
                  <div>Qtd</div>
                  <div>Peso Unit.</div>
                  <div>Peso Total</div>
                  <div>Material</div>
                  <div>Perfil</div>
                </div>
                {csvData.map((peca, index) => {
                  const duplicate = duplicates.find(d => d.index === index);
                  return (
                    <div key={index} className={`grid grid-cols-10 gap-2 text-xs py-1 ${duplicate?.isDuplicate ? 'text-red-600 bg-red-50' : 'text-green-600'}`}>
                      <div>
                        {duplicate?.isDuplicate ? (
                          <X className="h-3 w-3" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                      </div>
                      <div>{peca.of_number}</div>
                      <div>{peca.etapa_fase}</div>
                      <div>{peca.marca}</div>
                      <div className="truncate" title={peca.descricao}>{peca.descricao}</div>
                      <div>{peca.quantidade}</div>
                      <div>{peca.peso_unitario}</div>
                      <div>{peca.peso_total}</div>
                      <div className="truncate" title={peca.material}>{peca.material}</div>
                      <div className="truncate" title={peca.perfil_principal}>{peca.perfil_principal}</div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {step === 'preview' && validCount > 0 && (
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Weight className="h-4 w-4" />
                <span>Peso Total: {totalWeight.toFixed(2)} kg</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            {step === 'upload' ? (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button 
                  onClick={processCSV} 
                  disabled={!csvFile || isLoading}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {isLoading ? 'Processando...' : 'Processar CSV'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setStep('upload')}
                >
                  Voltar
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={validCount === 0 || isLoading}
                  className="flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  {isLoading ? 'Importando...' : `Importar ${validCount} peças`}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
