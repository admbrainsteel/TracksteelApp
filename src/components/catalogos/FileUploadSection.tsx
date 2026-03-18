
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText, Image, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface FileUploadSectionProps {
  onFilesAnalyzed: (analysisResult: {
    titulo?: string;
    categoria?: string;
    disciplina?: string;
    conteudo?: string;
    palavras_chave?: string[];
  }) => void;
  onFilesUploaded: (urls: string[]) => void;
}

interface UploadedFile {
  file: File;
  url?: string;
  uploading: boolean;
  error?: string;
}

export function FileUploadSection({ onFilesAnalyzed, onFilesUploaded }: FileUploadSectionProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validar tipos de arquivo
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/tiff',
      'image/bmp'
    ];
    
    const validFiles = files.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`Tipo de arquivo não permitido: ${file.name}`);
        return false;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB
        toast.error(`Arquivo muito grande: ${file.name} (máximo 10MB)`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length > 0) {
      const newFiles = validFiles.map(file => ({
        file,
        uploading: false,
        error: undefined
      }));
      
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
    
    // Limpar o input
    event.target.value = '';
  }, []);

  const uploadFile = async (fileData: UploadedFile, index: number) => {
    try {
      setUploadedFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, uploading: true, error: undefined } : f
      ));

      const fileName = `${Date.now()}-${fileData.file.name}`;
      const { data, error } = await supabase.storage
        .from('catalogo-documents')
        .upload(fileName, fileData.file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('catalogo-documents')
        .getPublicUrl(fileName);

      setUploadedFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, uploading: false, url: publicUrl } : f
      ));

      return publicUrl;
    } catch (error) {
      console.error('Erro no upload:', error);
      setUploadedFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, uploading: false, error: 'Erro no upload' } : f
      ));
      toast.error('Erro no upload do arquivo');
      return null;
    }
  };

  const uploadAllFiles = async () => {
    const uploadPromises = uploadedFiles.map((fileData, index) => {
      if (!fileData.url && !fileData.uploading) {
        return uploadFile(fileData, index);
      }
      return Promise.resolve(fileData.url);
    });

    const urls = await Promise.all(uploadPromises);
    const validUrls = urls.filter(url => url !== null) as string[];
    onFilesUploaded(validUrls);
    return validUrls;
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const analyzeFiles = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Adicione pelo menos um arquivo para analisar');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Primeiro fazer upload de todos os arquivos
      const urls = await uploadAllFiles();
      
      if (urls.length === 0) {
        toast.error('Nenhum arquivo foi carregado com sucesso');
        return;
      }

      // Simular análise com IA baseada nos arquivos
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Análise baseada nos nomes e tipos de arquivo
      const fileNames = uploadedFiles.map(f => f.file.name.toLowerCase());
      const hasImages = uploadedFiles.some(f => f.file.type.startsWith('image/'));
      const hasPdf = uploadedFiles.some(f => f.file.type === 'application/pdf');
      
      let suggestedCategoria = '';
      let suggestedDisciplina = '';
      let suggestedTitulo = '';
      let suggestedKeywords: string[] = [];
      let suggestedContent = '';
      
      // Lógica de categorização baseada em nomes de arquivo
      const content = fileNames.join(' ');
      
      if (content.includes('aço') || content.includes('steel')) {
        suggestedCategoria = 'Aço';
        suggestedKeywords.push('aço', 'steel');
      } else if (content.includes('tinta') || content.includes('pintura')) {
        suggestedCategoria = 'Tintas';
        suggestedKeywords.push('tinta', 'pintura');
      } else if (content.includes('parafuso') || content.includes('fixação')) {
        suggestedCategoria = 'Parafusos';
        suggestedKeywords.push('parafuso', 'fixação');
      } else {
        suggestedCategoria = 'Materiais';
      }

      if (content.includes('estrutura') || content.includes('construção')) {
        suggestedDisciplina = 'Engenharia Civil';
        suggestedKeywords.push('estrutura', 'construção');
      } else if (content.includes('mecânica') || content.includes('fabricação')) {
        suggestedDisciplina = 'Engenharia Mecânica';
        suggestedKeywords.push('mecânica', 'fabricação');
      } else {
        suggestedDisciplina = 'Construção';
      }

      // Gerar título baseado no primeiro arquivo
      if (uploadedFiles.length > 0) {
        const firstFileName = uploadedFiles[0].file.name.replace(/\.[^/.]+$/, '');
        suggestedTitulo = firstFileName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }

      // Gerar conteúdo baseado nos tipos de arquivo
      suggestedContent = `Documento ${hasPdf ? 'PDF' : 'de imagens'} contendo informações técnicas sobre ${suggestedCategoria.toLowerCase()}.`;
      
      if (hasImages) {
        suggestedContent += ` Inclui ${uploadedFiles.filter(f => f.file.type.startsWith('image/')).length} imagem(ns) técnica(s).`;
      }
      
      if (hasPdf) {
        suggestedContent += ` Documento PDF com especificações e detalhes técnicos.`;
      }

      // Adicionar palavras-chave relacionadas ao tipo de arquivo
      if (hasPdf) suggestedKeywords.push('pdf', 'documento');
      if (hasImages) suggestedKeywords.push('imagem', 'visual');
      
      onFilesAnalyzed({
        titulo: suggestedTitulo,
        categoria: suggestedCategoria,
        disciplina: suggestedDisciplina,
        conteudo: suggestedContent,
        palavras_chave: [...new Set(suggestedKeywords)]
      });

      toast.success('Análise concluída! Os campos foram preenchidos automaticamente.');
    } catch (error) {
      console.error('Erro na análise:', error);
      toast.error('Erro ao analisar documentos');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getFileIcon = (file: File) => {
    return file.type === 'application/pdf' ? FileText : Image;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file-upload">Upload de Documentos</Label>
        <div className="flex items-center gap-2">
          <Input
            id="file-upload"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.tiff,.bmp"
            onChange={handleFileSelect}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={analyzeFiles}
            disabled={isAnalyzing || uploadedFiles.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {isAnalyzing ? 'Analisando...' : 'Analisar com IA'}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Tipos aceitos: PDF, JPG, PNG, GIF, WebP, TIFF, BMP (máximo 10MB cada)
        </p>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <Label>Arquivos Selecionados</Label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {uploadedFiles.map((fileData, index) => {
              const Icon = getFileIcon(fileData.file);
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-slate-50 rounded border"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    <span className="text-sm truncate">{fileData.file.name}</span>
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      ({(fileData.file.size / (1024 * 1024)).toFixed(1)} MB)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {fileData.uploading && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    )}
                    {fileData.url && (
                      <span className="text-xs text-green-600">✓</span>
                    )}
                    {fileData.error && (
                      <span className="text-xs text-red-600">✗</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
