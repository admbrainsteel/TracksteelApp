
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const BocadConverter: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadText, setUploadText] = useState(true);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = (file: File) => {
    const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                   file.type === 'application/vnd.ms-excel' ||
                   file.name.endsWith('.xlsx') || 
                   file.name.endsWith('.xls');
    
    if (isExcel) {
      setSelectedFile(file);
      setUploadText(false);
      toast.success('Planilha selecionada com sucesso!');
    } else {
      toast.error('Por favor, selecione apenas arquivos de planilha (.xlsx ou .xls).');
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const processFile = async () => {
    if (!selectedFile) {
      toast.error('Por favor, selecione uma planilha para processar.');
      return;
    }

    setIsProcessing(true);
    
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          // 1. Extração e formatação dos dados para o nome do arquivo
          const obraCompleta = String(json[3][1] || 'OBRA_NAO_ENCONTRADA').trim();
          const fase = String(json[3][5] || 'FASE_NAO_ENCONTRADA').trim();
          
          const match = obraCompleta.match(/B\d+/);
          const obra = match ? match[0] : obraCompleta;

          // 2. Localização da tabela de dados
          let dataStartIndex = -1;
          let dataEndIndex = -1;
          for (let i = 0; i < json.length; i++) {
            if (json[i][0] === 'Marca' && json[i][1] === 'Quant.') {
              dataStartIndex = i + 1;
            }
            if (String(json[i][0]).trim().toLowerCase() === 'total') {
              dataEndIndex = i;
              break;
            }
          }

          if (dataStartIndex === -1) {
            throw new Error("Não foi possível encontrar o cabeçalho da tabela de peças ('Marca', 'Quant.').");
          }
          if (dataEndIndex === -1) {
            dataEndIndex = json.length;
          }
          
          // 3. Processamento das linhas da tabela
          const newSheetData: any[][] = [];
          newSheetData.push(['Marca', 'Pos.', 'Descrição', 'Qtde', 'Lar.', 'Esp.', 'Comp.', 'Mat.', 'P.Un.', 'P.Tot.']);

          for (let i = dataStartIndex; i < dataEndIndex; i++) {
            const row = json[i];
            if (!row[0]) continue; 

            const marca = row[0];
            const marcaAsNumber = Number(marca);
            if (isNaN(marcaAsNumber) || marcaAsNumber >= 1000) {
              continue;
            }
            
            const quant = row[1];
            const perfil = row[2];
            const qualid = row[3];
            const compr = row[4];
            const pesoTot = row[6];
            const nota = row[8] || '';

            const comprRounded = Math.round(Number(String(compr).replace(',', '.')));
            const pesoTotRounded = Math.round(Number(String(pesoTot).replace(',', '.')));
            
            const pos = String(nota).split(' ').pop();
            const mat = (qualid === 'ASTM-A572') ? 'A572GR50' : String(qualid).replace('ASTM-', '');

            newSheetData.push([
              marca,      
              pos,        
              perfil,     
              quant,      
              '',         
              '',         
              isNaN(comprRounded) ? '' : comprRounded,
              mat,        
              isNaN(pesoTotRounded) ? '' : pesoTotRounded,
              isNaN(pesoTotRounded) ? '' : pesoTotRounded
            ]);
          }

          if (newSheetData.length <= 1) {
            throw new Error("Nenhuma linha válida (com Marca < 1000) foi encontrada para conversão.");
          }

          // 4. Criação e download do novo arquivo Excel
          const newWorksheet = XLSX.utils.aoa_to_sheet(newSheetData);
          const newWorkbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Lista de Peças');
          
          // *** CORRIGIDO: Nome do arquivo com "peças" em minúsculo ***
          const newFileName = `${obra}-${fase}-Lista de peças.xlsx`;
          XLSX.writeFile(newWorkbook, newFileName);

          toast.success('Arquivo convertido com sucesso!');
          
        } catch (error) {
          console.error('Erro ao processar planilha:', error);
          toast.error(`Erro ao processar o arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        } finally {
          setIsProcessing(false);
        }
      };

      reader.onerror = () => {
        toast.error('Não foi possível ler o arquivo.');
        setIsProcessing(false);
      };

      reader.readAsArrayBuffer(selectedFile);
      
    } catch (error) {
      console.error('Erro geral:', error);
      toast.error('Erro ao processar a planilha. Verifique o arquivo e tente novamente.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-lg mx-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Conversor de Planilhas BSI</h1>
          <p className="text-gray-500 mt-2">Transforme a "Lista de Materiais" em uma "Lista de Peças" pronta para uso.</p>
        </div>

        {/* Área de Upload */}
        <div className="relative">
          <input
            type="file"
            accept=".xls,.xlsx"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-gray-50 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {uploadText ? (
              <div>
                <p className="mt-2 text-sm text-gray-600">
                  <span className="font-semibold text-blue-600">Clique para carregar</span> ou arraste e solte a planilha.
                </p>
                <p className="text-xs text-gray-500">Apenas arquivos .xlsx e .xls</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-800 mb-2">{selectedFile?.name}</p>
                <p className="text-xs text-gray-500">Planilha selecionada</p>
              </div>
            )}
          </div>
        </div>

        {/* Botão de Conversão */}
        <div className="mt-6">
          <Button
            onClick={processFile}
            disabled={!selectedFile || isProcessing}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Converter e Baixar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BocadConverter;
