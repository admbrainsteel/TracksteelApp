import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Upload, FileText, Download, Trash2, Plus, RefreshCw, Settings, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { jsonCodeManager } from '@/utils/jsonCodeManager';
import { apiKeyManager } from '@/utils/apiKeyManager';
import { useWebhookConfigs } from '@/hooks/useWebhookConfigs';
import WebhookConfigManager from './WebhookConfigManager';

interface ProcessedRow {
  of_number: string;
  etapa_fase: string;
  marca: string;
  descricao: string;
  quantidade: string;
  peso_unitario: string;
  peso_total: string;
  tratamento_superficial: string;
  material: string;
  perfil_principal: string;
  tem_componentes: string;
  marca_componente: string;
  descricao_componente: string;
  perfil_componente: string;
  peso_unitario_componente: string;
  quantidade_por_peca: string;
}

const TecnometalConverter: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedRow[]>([]);
  const [showTable, setShowTable] = useState(false);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [tecnometalConfig, setTecnometalConfig] = useState<any>(null);
  const [showWebhookConfig, setShowWebhookConfig] = useState(false);
  const [selectedWebhookConfig, setSelectedWebhookConfig] = useState<any>(null);
  const [currentProcessing, setCurrentProcessing] = useState<any>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const { createFileProcessing, updateFileProcessing, fileProcessings } = useWebhookConfigs();

  const columnHeaders = [
    'of_number', 'etapa_fase', 'marca', 'descricao', 'quantidade',
    'peso_unitario', 'peso_total', 'tratamento_superficial', 'material',
    'perfil_principal', 'tem_componentes', 'marca_componente', 'descricao_componente',
    'perfil_componente', 'peso_unitario_componente', 'quantidade_por_peca'
  ];

  const columnLabels = {
    of_number: 'OF',
    etapa_fase: 'Fase',
    marca: 'Marca',
    descricao: 'Descrição',
    quantidade: 'Qtd',
    peso_unitario: 'Peso Un.',
    peso_total: 'Peso Total',
    tratamento_superficial: 'Tratamento',
    material: 'Material',
    perfil_principal: 'Perfil Principal',
    tem_componentes: 'Tem Comp.',
    marca_componente: 'Marca Comp.',
    descricao_componente: 'Desc. Comp.',
    perfil_componente: 'Perfil Comp.',
    peso_unitario_componente: 'Peso Un. Comp.',
    quantidade_por_peca: 'Qtd por Peça'
  };

  useEffect(() => {
    const loadTecnometalConfig = async () => {
      try {
        const config = await jsonCodeManager.getJsonCodeByName('Tecnometal');
        if (config) {
          setTecnometalConfig(config);
          setDebugInfo(prev => prev + 'Configuração Tecnometal carregada com sucesso!\n');
        } else {
          setDebugInfo(prev => prev + 'AVISO: Configuração "Tecnometal" não encontrada no sistema.\n');
        }
      } catch (error) {
        console.error('Erro ao carregar configuração Tecnometal:', error);
        setDebugInfo(prev => prev + `ERRO ao carregar configuração: ${error}\n`);
      }
    };

    loadTecnometalConfig();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/pdf'
      ];
      
      if (allowedTypes.includes(file.type)) {
        setSelectedFile(file);
        setDebugInfo('');
        setShowTable(false);
        setProcessedData([]);
        setCurrentProcessing(null);
        toast.success('Arquivo selecionado com sucesso!');
      } else {
        toast.error('Tipo de arquivo não suportado. Use .xlsx, .xls ou .pdf');
      }
    }
  };

  const sendToWebhook = async (file: File, webhookConfig: any) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(webhookConfig.link_envio, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erro no webhook: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao enviar para webhook:', error);
      throw error;
    }
  };

  const checkWebhookStatus = async (webhookConfig: any, processingId: string) => {
    try {
      const response = await fetch(`${webhookConfig.link_recebimento}/${processingId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Erro ao verificar status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      return null;
    }
  };

  const startMonitoring = async (processingId: string) => {
    if (!selectedWebhookConfig) return;

    setIsMonitoring(true);
    
    const monitorInterval = setInterval(async () => {
      const status = await checkWebhookStatus(selectedWebhookConfig, processingId);
      
      if (status) {
        if (status.completed) {
          await updateFileProcessing(processingId, {
            status: 'concluido',
            completed_at: new Date().toISOString(),
            download_url: status.download_url
          });
          
          setCurrentProcessing({
            ...currentProcessing,
            status: 'concluido',
            download_url: status.download_url
          });
          
          setIsMonitoring(false);
          clearInterval(monitorInterval);
          toast.success('Arquivo processado e disponível para download!');
        } else if (status.error) {
          await updateFileProcessing(processingId, {
            status: 'erro'
          });
          
          setIsMonitoring(false);
          clearInterval(monitorInterval);
          toast.error('Erro no processamento do arquivo');
        }
      }
    }, 5000); // Verifica a cada 5 segundos

    // Para o monitoramento após 10 minutos
    setTimeout(() => {
      clearInterval(monitorInterval);
      setIsMonitoring(false);
    }, 600000);
  };

  const processFile = async () => {
    if (!selectedFile) {
      toast.error('Por favor, selecione um arquivo para processar.');
      return;
    }

    if (!selectedWebhookConfig) {
      toast.error('Por favor, selecione uma configuração de webhook.');
      return;
    }

    setIsProcessing(true);
    setDebugInfo('Enviando arquivo para webhook...\n');
    
    try {
      // Criar registro de processamento
      const processing = {
        webhook_config_id: selectedWebhookConfig.id,
        file_name: selectedFile.name,
        file_type: selectedFile.type,
        status: 'enviando'
      };

      const success = await createFileProcessing(processing);
      if (!success) {
        throw new Error('Erro ao criar registro de processamento');
      }

      // Enviar arquivo para webhook
      const webhookResponse = await sendToWebhook(selectedFile, selectedWebhookConfig);
      
      setDebugInfo(prev => prev + 'Arquivo enviado com sucesso!\n');
      setDebugInfo(prev => prev + `ID do processamento: ${webhookResponse.processing_id}\n`);
      
      // Atualizar status para enviado
      const currentFileProcessing = fileProcessings.find(fp => 
        fp.file_name === selectedFile.name && fp.status === 'enviando'
      );
      
      if (currentFileProcessing) {
        await updateFileProcessing(currentFileProcessing.id, {
          status: 'processando'
        });
        
        setCurrentProcessing({
          ...currentFileProcessing,
          status: 'processando'
        });
        
        // Iniciar monitoramento
        startMonitoring(currentFileProcessing.id);
      }

      toast.success('Arquivo enviado para processamento!');
      
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      setDebugInfo(prev => prev + `ERRO: ${error}\n`);
      toast.error('Erro ao processar o arquivo. Verifique as configurações de webhook.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadProcessedFile = async () => {
    if (!currentProcessing?.download_url) {
      toast.error('URL de download não disponível.');
      return;
    }

    try {
      const response = await fetch(currentProcessing.download_url);
      if (!response.ok) {
        throw new Error('Erro ao baixar arquivo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `processed_${currentProcessing.file_name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Arquivo baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      toast.error('Erro ao baixar o arquivo processado.');
    }
  };

  const processFileLocally = async (jsonData: any[], ofNumber: string, etapaFase: string) => {
    const linhasFinais: ProcessedRow[] = [];
    let dadosPecaMae: any = null;
    let componentesDoGrupo: any[] = [];

    for (const row of jsonData) {
      const isEmptyRow = Object.values(row).every(val => 
        val === null || val === undefined || val === ''
      );
      
      if (isEmptyRow) continue;

      if (row['Marca']) {
        if (dadosPecaMae) {
          const pecaMaeFormatada = {
            of_number: ofNumber,
            etapa_fase: etapaFase,
            marca: formatarMarca(dadosPecaMae['Marca']),
            descricao: dadosPecaMae['Descrição'] || '',
            quantidade: String(dadosPecaMae['Qtde'] || ''),
            peso_unitario: formatarDecimal(dadosPecaMae['P.Un.'] || ''),
            peso_total: formatarDecimal(dadosPecaMae['P.Tot.'] || ''),
            tratamento_superficial: '-',
            material: componentesDoGrupo.length > 0 ? 
              getMaterial(componentesDoGrupo[0]['Comp. Mat.'] || '') : '',
            perfil_principal: dadosPecaMae['Descrição'] || '',
            tem_componentes: componentesDoGrupo.length > 0 ? 'true' : 'false'
          };

          if (componentesDoGrupo.length > 0) {
            for (const comp of componentesDoGrupo) {
              linhasFinais.push({
                ...pecaMaeFormatada,
                marca_componente: formatarMarca(comp['Pos.'] || ''),
                descricao_componente: comp['Descrição'] || '',
                perfil_componente: comp['Descrição'] || '',
                peso_unitario_componente: formatarDecimal(comp['P.Un.'] || ''),
                quantidade_por_peca: String(comp['Qtde'] || '')
              });
            }
          } else {
            linhasFinais.push({
              ...pecaMaeFormatada,
              marca_componente: '',
              descricao_componente: '',
              perfil_componente: '',
              peso_unitario_componente: '',
              quantidade_por_peca: ''
            });
          }
        }

        dadosPecaMae = row;
        componentesDoGrupo = [];
      } else if (row['Pos.'] && dadosPecaMae) {
        componentesDoGrupo.push(row);
      }
    }

    return linhasFinais;
  };

  const extractMetadataFromFilename = (filename: string) => {
    console.log('Extraindo metadados do nome do arquivo:', filename);
    const ofNumber = filename.split('-')[0];
    const faseMatch = filename.match(/FASE-(\d+)/i);
    const etapaFase = faseMatch ? faseMatch[1] : '1';
    
    console.log('Metadados extraídos:', { ofNumber, etapaFase });
    return { ofNumber, etapaFase };
  };

  const formatarMarca = (marca: string): string => {
    if (typeof marca === 'string' && marca.includes('-')) {
      return marca.split('-').pop() || marca;
    }
    return marca;
  };

  const formatarDecimal = (numero: any): string => {
    try {
      return String(numero).replace(',', '.');
    } catch {
      return String(numero);
    }
  };

  const getMaterial = (matStr: string): string => {
    if (typeof matStr === 'string') {
      const parts = matStr.split(' ');
      return parts[parts.length - 1] || '';
    }
    return '';
  };

  const handleCellEdit = (rowIndex: number, column: string, value: string) => {
    const newData = [...processedData];
    newData[rowIndex] = { ...newData[rowIndex], [column]: value };
    setProcessedData(newData);
  };

  const deleteRow = (rowIndex: number) => {
    const newData = processedData.filter((_, index) => index !== rowIndex);
    setProcessedData(newData);
    toast.success('Linha excluída com sucesso!');
  };

  const addNewRow = () => {
    const newRow: ProcessedRow = {
      of_number: '',
      etapa_fase: '',
      marca: '',
      descricao: '',
      quantidade: '',
      peso_unitario: '',
      peso_total: '',
      tratamento_superficial: '-',
      material: '',
      perfil_principal: '',
      tem_componentes: 'false',
      marca_componente: '',
      descricao_componente: '',
      perfil_componente: '',
      peso_unitario_componente: '',
      quantidade_por_peca: ''
    };
    
    setProcessedData([...processedData, newRow]);
    toast.success('Nova linha adicionada!');
  };

  const generateCSV = () => {
    if (processedData.length === 0) {
      toast.error('Nenhum dado para gerar o CSV.');
      return;
    }

    try {
      const csvContent = [
        columnHeaders.join(','),
        ...processedData.map(row => 
          columnHeaders.map(col => row[col as keyof ProcessedRow]).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      const { ofNumber, etapaFase } = extractMetadataFromFilename(selectedFile?.name || 'arquivo');
      const fileName = `CSV_FINAL_${ofNumber}_FASE-${etapaFase}.csv`;
      
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Arquivo ${fileName} gerado com sucesso!`);
    } catch (error) {
      console.error('Erro ao gerar CSV:', error);
      toast.error('Erro ao gerar o arquivo CSV.');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Processador Tecnometal com Webhook
            <Button
              onClick={() => setShowWebhookConfig(!showWebhookConfig)}
              size="sm"
              variant="outline"
              className="ml-auto"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showWebhookConfig && (
            <WebhookConfigManager
              converterName="Tecnometal"
              onConfigSelect={(config) => {
                setSelectedWebhookConfig(config);
                setShowWebhookConfig(false);
                toast.success('Configuração selecionada!');
              }}
            />
          )}

          {selectedWebhookConfig && (
            <Card className="bg-slate-700/30 border-slate-600">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">Configuração Ativa:</p>
                    <p className="text-slate-400 text-xs">
                      Envio: {selectedWebhookConfig.link_envio}
                    </p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <label className="text-white text-sm font-medium">
              Selecionar Arquivo (.pdf, .xlsx)
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.xlsx,.xls"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button
                variant="outline"
                className="w-full bg-slate-600 border-slate-500 text-white hover:bg-slate-500"
              >
                <Upload className="w-4 h-4 mr-2" />
                {selectedFile ? selectedFile.name : 'Selecionar Arquivo'}
              </Button>
            </div>
          </div>

          <Button
            onClick={processFile}
            disabled={!selectedFile || !selectedWebhookConfig || isProcessing}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Enviando para Webhook...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Enviar e Processar
              </>
            )}
          </Button>

          {currentProcessing && (
            <Card className="bg-slate-700/30 border-slate-600">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">Status do Processamento:</p>
                    <div className="flex items-center gap-2 mt-1">
                      {currentProcessing.status === 'processando' ? (
                        <>
                          <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />
                          <span className="text-yellow-400 text-sm">Processando...</span>
                        </>
                      ) : currentProcessing.status === 'concluido' ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-green-400 text-sm">Concluído</span>
                        </>
                      ) : (
                        <span className="text-slate-400 text-sm">{currentProcessing.status}</span>
                      )}
                    </div>
                  </div>
                  {currentProcessing.status === 'concluido' && currentProcessing.download_url && (
                    <Button
                      onClick={downloadProcessedFile}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Baixar Arquivo
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {debugInfo && (
            <div className="bg-slate-900 border border-slate-600 rounded p-3">
              <h4 className="text-white font-medium mb-2">Log de Processamento:</h4>
              <pre className="text-green-400 text-xs whitespace-pre-wrap overflow-x-auto">
                {debugInfo}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {isMonitoring && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-white">Monitorando processamento...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TecnometalConverter;
