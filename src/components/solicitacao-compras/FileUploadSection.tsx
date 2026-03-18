
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Paperclip, X, FileText, Image, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FileUploadSectionProps {
  onFilesChange: (files: File[], urls: string[]) => void;
  initialFiles?: string[];
}

const MAX_FILE_SIZE = 300 * 1024; // 300KB
const ALLOWED_TYPES = [
  'text/plain',
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv'
];

export function FileUploadSection({ onFilesChange, initialFiles = [] }: FileUploadSectionProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(initialFiles);
  const [uploading, setUploading] = useState(false);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) return <FileSpreadsheet className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validar arquivos
    const validFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Arquivo ${file.name} excede 300KB`);
        return false;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`Tipo de arquivo ${file.type} não permitido`);
        return false;
      }
      return true;
    });

    const newFiles = [...selectedFiles, ...validFiles];
    setSelectedFiles(newFiles);
    onFilesChange(newFiles, uploadedUrls);
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesChange(newFiles, uploadedUrls);
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      for (const file of selectedFiles) {
        const fileName = `${userData.user.id}/${Date.now()}-${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('solicitacao-compras-anexos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('solicitacao-compras-anexos')
          .getPublicUrl(fileName);

        newUrls.push(publicUrl);
      }

      const allUrls = [...uploadedUrls, ...newUrls];
      setUploadedUrls(allUrls);
      setSelectedFiles([]);
      onFilesChange([], allUrls);
      toast.success('Arquivos enviados com sucesso!');
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar arquivos');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          type="file"
          multiple
          accept=".txt,.pdf,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.csv"
          onChange={handleFileSelect}
          className="flex-1"
        />
        <Button 
          type="button" 
          variant="outline" 
          onClick={uploadFiles}
          disabled={selectedFiles.length === 0 || uploading}
        >
          <Paperclip className="h-4 w-4 mr-2" />
          {uploading ? 'Enviando...' : 'Anexar'}
        </Button>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Arquivos selecionados:</p>
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1 pr-1">
                {getFileIcon(file.type)}
                <span className="text-xs">{file.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {uploadedUrls.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Arquivos anexados:</p>
          <div className="flex flex-wrap gap-2">
            {uploadedUrls.map((url, index) => (
              <Badge key={index} variant="default" className="flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                <span className="text-xs">Anexo {index + 1}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
