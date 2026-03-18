
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const AdvanceSteelConverter: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [divideBy1000, setDivideBy1000] = useState(false);

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
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!validTypes.includes(file.type)) {
      toast.error('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
      return;
    }
    
    setSelectedFile(file);
    toast.success('Arquivo selecionado com sucesso!');
  };

  const processFile = () => {
    if (!selectedFile) {
      toast.error('Por favor, selecione um arquivo primeiro.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        const newSheetData: any[][] = [];
        newSheetData.push(['Marca', 'Qtde', 'Descrição', 'Mat.', 'Comp.', 'Larg.', 'P.Un.', 'P.Tot.']);
        
        let fileNamePrefix: string | null = null;
        const processedMarks = new Set<number>();

        for (let i = 0; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length === 0) continue;

          const marcaCompleta = String(row[0] || '');
          
          // Primeiro tenta o formato com fase: B118-4-2
          let mainMarkMatch = marcaCompleta.match(/^(B\d+)-(\d+)-(\d+)$/);
          let prefixo: string;
          let numeroMarca: number;
          
          if (mainMarkMatch) {
            // Formato com fase: B118-4-2
            const ofNumber = mainMarkMatch[1]; // B118
            const faseNumber = mainMarkMatch[2]; // 4
            const marcaNumber = mainMarkMatch[3]; // 2
            prefixo = `${ofNumber}-`; // B118-
            numeroMarca = parseInt(marcaNumber, 10); // 2
          } else {
            // Tenta o formato sem fase: B118-2
            mainMarkMatch = marcaCompleta.match(/^(B\d+-)(\d+)$/);
            if (mainMarkMatch) {
              prefixo = mainMarkMatch[1]; // B118-
              numeroMarca = parseInt(mainMarkMatch[2], 10); // 2
            }
          }

          if (mainMarkMatch) {

            if (numeroMarca >= 999 || processedMarks.has(numeroMarca)) {
              continue;
            }
            processedMarks.add(numeroMarca);

            if (!fileNamePrefix) {
              fileNamePrefix = prefixo;
            }

            const qtde = row[5];
            const descricao = row[6];
            const larg = row[14];
            
            let mat = '';
            let compRaw = '';
            let maxComp = 0;
            
            // Busca o maior comprimento entre todas as sub-linhas da marca
            for (let j = i + 1; j < json.length; j++) {
              const subRow = json[j];
              if (!subRow || !subRow[0]) continue;

              const subMarkCompleta = String(subRow[0]);
              
              // Verifica formato com fase: B118-4-2
              let subMarkMatch = subMarkCompleta.match(/^(B\d+)-(\d+)-(\d+)$/);
              let subNumeroMarca: number | null = null;
              
              if (subMarkMatch) {
                // Formato com fase
                subNumeroMarca = parseInt(subMarkMatch[3], 10);
              } else {
                // Verifica formato sem fase: B118-2
                subMarkMatch = subMarkCompleta.match(/^(B\d+-)(\d+)$/);
                if (subMarkMatch) {
                  subNumeroMarca = parseInt(subMarkMatch[2], 10);
                }
              }

              // Se encontrou uma nova marca principal, para a busca
              if (subMarkMatch && subNumeroMarca !== null && subNumeroMarca < 999 && !processedMarks.has(subNumeroMarca)) {
                break;
              }

              // Se é uma sub-linha da marca atual, verifica o comprimento
              if (subMarkMatch) {
                const currentComp = Number(String(subRow[13] || 0).replace(',', '.'));
                if (!isNaN(currentComp) && currentComp > maxComp) {
                  maxComp = currentComp;
                  mat = subRow[12];
                  compRaw = subRow[13];
                }
              }
            }

            let pTotSum = 0;
            for (let j = i + 1; j < json.length; j++) {
              const subRow = json[j];
              if (!subRow || !subRow[0]) continue;

              const subMarkCompleta = String(subRow[0]);
              
              // Verifica formato com fase: B118-4-2
              let subMarkMatch = subMarkCompleta.match(/^(B\d+)-(\d+)-(\d+)$/);
              let subNumeroMarca: number | null = null;
              
              if (subMarkMatch) {
                // Formato com fase
                subNumeroMarca = parseInt(subMarkMatch[3], 10);
              } else {
                // Verifica formato sem fase: B118-2
                subMarkMatch = subMarkCompleta.match(/^(B\d+-)(\d+)$/);
                if (subMarkMatch) {
                  subNumeroMarca = parseInt(subMarkMatch[2], 10);
                }
              }

              if (subMarkMatch && subNumeroMarca !== null && subNumeroMarca < 999 && !processedMarks.has(subNumeroMarca)) {
                break;
              }

              if (subMarkMatch) {
                const pTotSubItemRaw = Number(String(subRow[16] || 0).replace(',', '.'));
                const pTotSubItemValue = divideBy1000 ? pTotSubItemRaw / 1000 : pTotSubItemRaw;
                if (!isNaN(pTotSubItemValue)) {
                  pTotSum += pTotSubItemValue;
                }
              }
            }
            
            const qtdeValue = Number(String(qtde || 0).replace(',', '.'));
            const compValue = Number(String(compRaw || 0).replace(',', '.'));
            
            let pUnCalculated = 0;
            if (qtdeValue !== 0) {
              pUnCalculated = pTotSum / qtdeValue;
            }
            
            const compRounded = Math.round(compValue);
            const pUnRounded = Math.round(pUnCalculated);
            const pTotRounded = Math.round(pTotSum);

            newSheetData.push([
              numeroMarca,
              qtde,
              descricao,
              mat,
              isNaN(compRounded) ? '' : compRounded,
              larg,
              isNaN(pUnRounded) ? '' : pUnRounded,
              isNaN(pTotRounded) ? '' : pTotRounded
            ]);
          }
        }

        if (newSheetData.length <= 1) {
          throw new Error("Nenhuma linha válida foi encontrada para conversão.");
        }
        if (!fileNamePrefix) {
          throw new Error("Não foi possível determinar o prefixo para o nome do arquivo.");
        }

        const newWorksheet = XLSX.utils.aoa_to_sheet(newSheetData);
        const newWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Lista de Peças');
        
        const newFileName = `${fileNamePrefix}Lista de Peças.xlsx`;
        XLSX.writeFile(newWorkbook, newFileName);

        toast.success('Arquivo convertido e baixado com sucesso!');
        setSelectedFile(null);

      } catch (error) {
        console.error('Erro no processamento:', error);
        toast.error(`Erro ao processar o arquivo: ${(error as Error).message}`);
      }
    };

    reader.onerror = () => {
      toast.error('Não foi possível ler o arquivo.');
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Conversor Advance Steel
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Converta a "Lista de Peças - Estruturada" para o formato final.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-primary bg-primary/10'
              : 'border-muted-foreground/25 hover:border-primary hover:bg-accent'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('advance-file-input')?.click()}
        >
          <input
            id="advance-file-input"
            type="file"
            className="hidden"
            accept=".xlsx,.xls"
            onChange={handleFileInput}
          />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          {selectedFile ? (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">
                Arquivo selecionado:
              </p>
              <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                <span className="font-semibold text-primary">Clique para carregar</span> ou arraste e solte a planilha
              </p>
              <p className="text-xs text-muted-foreground">
                Formatos suportados: .xlsx, .xls
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="divide-by-1000"
            checked={divideBy1000}
            onCheckedChange={(checked) => setDivideBy1000(checked === true)}
          />
          <label
            htmlFor="divide-by-1000"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Dividir peso por 1000?
          </label>
        </div>

        <Button
          onClick={processFile}
          disabled={!selectedFile}
          className="w-full"
        >
          Converter e Baixar
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdvanceSteelConverter;
