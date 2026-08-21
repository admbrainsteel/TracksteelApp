import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Upload, FileText, Download, Settings, FileUp } from 'lucide-react';
import { toast } from 'sonner';
import TecnometalConverter from '@/components/conversores/TecnometalConverter';
import BocadConverter from '@/components/conversores/BocadConverter';
import AdvanceSteelConverter from '@/components/conversores/AdvanceSteelConverter';
import PromptsManager from '@/components/conversores/PromptsManager';
import FileImporter from '@/components/conversores/FileImporter';
import ConversaoGenericaModal from '@/components/conversores/ConversaoGenericaModal';

const ConversoresDados = () => {
  const [isConverting, setIsConverting] = useState(false);
  const [selectedConverter, setSelectedConverter] = useState<string | null>(null);
  const [showTecnometalConverter, setShowTecnometalConverter] = useState(false);
  const [showBocadConverter, setShowBocadConverter] = useState(false);
  const [showAdvanceSteelConverter, setShowAdvanceSteelConverter] = useState(false);
  const [showPromptsManager, setShowPromptsManager] = useState(false);
  const [showFileImporter, setShowFileImporter] = useState(false);
  const [showGenericConverter, setShowGenericConverter] = useState(false);

  const converters = [
    { id: 'tecnometal', name: 'Conversão Tecnometal', description: 'Converte arquivos no formato Tecnometal' },
    { id: 'bocad', name: 'Conversão Bocad', description: 'Converte arquivos no formato Bocad' },
    { id: 'adv_steel', name: 'Conversão Adv_Steel', description: 'Converte arquivos no formato Advance Steel' },
    { id: 'tekla', name: 'Conversão Tekla', description: 'Converte arquivos no formato Tekla' },
    { id: 'generica', name: 'Conversão Genérica', description: 'Conversão para formatos padronizados' }
  ];

  const handleFileUpload = async (converterId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    if (converterId === 'tecnometal') {
      setShowTecnometalConverter(true);
      return;
    }

    if (converterId === 'bocad') {
      setShowBocadConverter(true);
      return;
    }

    if (converterId === 'adv_steel') {
      setShowAdvanceSteelConverter(true);
      return;
    }

    if (converterId === 'generica') {
      setShowGenericConverter(true);
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    setIsConverting(true);
    setSelectedConverter(converterId);

    try {
      // Simular processamento por enquanto
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Arquivo convertido com sucesso usando ${converters.find(c => c.id === converterId)?.name}!`);
      
      // Reset file input
      event.target.value = '';
    } catch (error) {
      toast.error('Erro ao converter arquivo');
      console.error('Conversion error:', error);
    } finally {
      setIsConverting(false);
      setSelectedConverter(null);
    }
  };

  const handleTecnometalClick = () => {
    setShowTecnometalConverter(true);
  };

  const handleBocadClick = () => {
    setShowBocadConverter(true);
  };

  const handleAdvanceSteelClick = () => {
    setShowAdvanceSteelConverter(true);
  };

  const handleGoBack = () => {
    setShowTecnometalConverter(false);
    setShowBocadConverter(false);
    setShowAdvanceSteelConverter(false);
    setShowPromptsManager(false);
    setShowFileImporter(false);
  };

  // Tela do Gerenciador de Prompts
  if (showPromptsManager) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleGoBack}
            className="bg-slate-600 border-slate-500 text-white hover:bg-slate-500"
          >
            ← Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Gerenciar Prompts</h1>
            <p className="text-slate-400">Configure instruções para conversão de arquivos</p>
          </div>
        </div>
        <PromptsManager />
      </div>
    );
  }

  // Tela do Importador de Arquivos
  if (showFileImporter) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleGoBack}
            className="bg-slate-600 border-slate-500 text-white hover:bg-slate-500"
          >
            ← Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Importar Arquivo</h1>
            <p className="text-slate-400">Converta arquivos externos para CSV com instruções personalizadas</p>
          </div>
        </div>
        <FileImporter />
      </div>
    );
  }

  if (showTecnometalConverter) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleGoBack}
            className="bg-slate-600 border-slate-500 text-white hover:bg-slate-500"
          >
            ← Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Conversão Tecnometal</h1>
            <p className="text-slate-400">Processador e Editor de Lista de Peças para CSV</p>
          </div>
        </div>
        <TecnometalConverter />
      </div>
    );
  }

  if (showBocadConverter) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleGoBack}
            className="bg-slate-600 border-slate-500 text-white hover:bg-slate-500"
          >
            ← Voltar
          </Button>
        </div>
        <BocadConverter />
      </div>
    );
  }



  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Conversores de Dados</h1>
        <p className="text-slate-400">Ferramentas para conversão de diferentes formatos de arquivos</p>
      </div>

      {/* Novos botões principais */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileUp className="w-5 h-5" />
            Ferramentas de Conversão Avançada
          </CardTitle>
          <CardDescription className="text-slate-300">
            Importe arquivos externos e gerencie prompts de conversão personalizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => setShowFileImporter(true)}
              variant="outline"
              className="h-auto p-4 bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700 flex flex-col items-center gap-2"
            >
              <Upload className="w-6 h-6 text-blue-400" />
              <div className="text-center">
                <div className="font-medium">Importar Arquivo</div>
                <div className="text-xs text-slate-400 mt-1">
                  Converta planilhas e PDFs para CSV
                </div>
              </div>
            </Button>
            
            <Button
              onClick={() => setShowPromptsManager(true)}
              variant="outline"
              className="h-auto p-4 bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700 flex flex-col items-center gap-2"
            >
              <Settings className="w-6 h-6 text-green-400" />
              <div className="text-center">
                <div className="font-medium">Gerenciar Prompts</div>
                <div className="text-xs text-slate-400 mt-1">
                  Configure instruções de conversão
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Conversores de Listas de Peças
          </CardTitle>
          <CardDescription className="text-slate-300">
            Importe uma lista de peças para convertê-la em diferentes formatos, como PDF, CSV ou Imagem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {converters.map((converter) => (
              <Card key={converter.id} className="bg-slate-700/50 border-slate-600 hover:bg-slate-700/70 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-white">{converter.name}</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    {converter.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {converter.id === 'tecnometal' ? (
                    <Button
                      onClick={handleTecnometalClick}
                      variant="outline"
                      className="w-full bg-slate-600 border-slate-500 text-white hover:bg-slate-500"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Abrir Conversor
                    </Button>
                  ) : converter.id === 'bocad' ? (
                    <Button
                      onClick={handleBocadClick}
                      variant="outline"
                      className="w-full bg-slate-600 border-slate-500 text-white hover:bg-slate-500"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Abrir Conversor
                    </Button>
                  ) : converter.id === 'adv_steel' ? (
                    <Button
                      onClick={handleAdvanceSteelClick}
                      variant="outline"
                      className="w-full bg-slate-600 border-slate-500 text-white hover:bg-slate-500"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Abrir Conversor
                    </Button>
                  ) : converter.id === 'generica' ? (
                    <Button
                      onClick={() => setShowGenericConverter(true)}
                      variant="outline"
                      className="w-full bg-slate-600 border-slate-500 text-white hover:bg-slate-500"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Selecionar Arquivo
                    </Button>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        id={`file-${converter.id}`}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept=".csv,.txt,.xls,.xlsx"
                        onChange={(e) => handleFileUpload(converter.id, e)}
                        disabled={isConverting}
                      />
                      <Button
                        variant="outline"
                        className="w-full bg-slate-600 border-slate-500 text-white hover:bg-slate-500"
                        disabled={isConverting && selectedConverter === converter.id}
                      >
                        {isConverting && selectedConverter === converter.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Convertendo...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Selecionar Arquivo
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Formatos Suportados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-white font-medium mb-2">Entrada</h4>
              <ul className="text-slate-300 text-sm space-y-1">
                <li>• Arquivos CSV (.csv)</li>
                <li>• Arquivos de texto (.txt)</li>
                <li>• Planilhas Excel (.xls, .xlsx)</li>
                <li>• Documentos PDF (.pdf)</li>
                <li>• Formatos proprietários</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Saída</h4>
              <ul className="text-slate-300 text-sm space-y-1">
                <li>• PDF para impressão</li>
                <li>• CSV padronizado</li>
                <li>• Imagens (PNG, JPG)</li>
                <li>• Planilhas formatadas</li>
                <li>• JSON estruturado</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Conversão Genérica */}
      <ConversaoGenericaModal 
        open={showGenericConverter}
        onOpenChange={setShowGenericConverter}
      />

      {/* Modal de Conversão Advance Steel (PDF para Excel) */}
      <AdvanceSteelConverter
        open={showAdvanceSteelConverter}
        onOpenChange={setShowAdvanceSteelConverter}
      />
    </div>
  );
};

export default ConversoresDados;
