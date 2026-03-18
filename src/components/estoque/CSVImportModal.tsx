
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { parseCSV } from '@/utils/csvUtils';
import { useCriarMaterial } from '@/hooks/useEstoque';
import { toast } from 'sonner';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);

  const criarMaterial = useCriarMaterial();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setImportResult(null);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvText = e.target?.result as string;
        const parsed = parseCSV(csvText);
        setCsvData(parsed);
      };
      reader.readAsText(selectedFile);
    } else {
      toast.error('Por favor, selecione um arquivo CSV válido');
    }
  };

  const processImport = async () => {
    if (csvData.length === 0) return;

    setIsProcessing(true);
    const errors: string[] = [];
    let successCount = 0;

    for (const row of csvData) {
      try {
        const materialData = {
          codigo: row.codigo || '',
          descricao: row.descricao || '',
          tipo_material_id: row.tipo_material_id || null,
          unidade: row.unidade || 'PC',
          peso_unitario: parseFloat(row.peso_unitario) || 0,
          quantidade_total: parseFloat(row.quantidade_total) || 0,
          quantidade_disponivel: parseFloat(row.quantidade_disponivel) || 0,
          quantidade_empenhada: parseFloat(row.quantidade_empenhada) || 0,
          quantidade_minima: parseFloat(row.quantidade_minima) || 0,
          quantidade_maxima: row.quantidade_maxima ? parseFloat(row.quantidade_maxima) : null,
          lote_atual: row.lote_atual || null,
          fornecedor: row.fornecedor || null,
          localizacao: row.localizacao || null,
          status: row.status || 'Normal',
          certificado: row.certificado || null,
          observacoes: row.observacoes || null
        };

        await criarMaterial.mutateAsync(materialData);
        successCount++;
      } catch (error: any) {
        errors.push(`Erro na linha ${csvData.indexOf(row) + 2}: ${error.message}`);
      }
    }

    setImportResult({ success: successCount, errors });
    setIsProcessing(false);
    
    if (successCount > 0) {
      toast.success(`${successCount} materiais importados com sucesso!`);
    }
  };

  const resetModal = () => {
    setFile(null);
    setCsvData([]);
    setImportResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetModal}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Matérias-Primas via CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              O arquivo CSV deve conter as seguintes colunas: codigo, descricao, unidade, peso_unitario, 
              quantidade_total, quantidade_disponivel, quantidade_empenhada, quantidade_minima, 
              quantidade_maxima, lote_atual, fornecedor, localizacao, status, certificado, observacoes
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="csv-file">Selecionar arquivo CSV</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mt-1"
            />
          </div>

          {file && (
            <div className="p-3 bg-muted rounded">
              <p className="text-sm">
                <strong>Arquivo:</strong> {file.name} ({csvData.length} registros encontrados)
              </p>
            </div>
          )}

          {importResult && (
            <Alert className={importResult.errors.length > 0 ? "border-yellow-500" : "border-green-500"}>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <p><strong>Resultado da Importação:</strong></p>
                <p>✅ {importResult.success} materiais importados com sucesso</p>
                {importResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p>❌ {importResult.errors.length} erros encontrados:</p>
                    <ul className="text-xs mt-1 max-h-20 overflow-y-auto">
                      {importResult.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={resetModal}>
              Cancelar
            </Button>
            <Button 
              onClick={processImport} 
              disabled={csvData.length === 0 || isProcessing}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isProcessing ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
