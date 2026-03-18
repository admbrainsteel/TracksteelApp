
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, Upload, Clock, CheckCircle, XCircle, Database, FileText, AlertTriangle } from 'lucide-react';
import { useBackupManager } from '@/hooks/useBackupManager';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BackupManager = () => {
  const { backupLogs, logsLoading, isBackingUp, isRestoring, createBackup, restoreBackup } = useBackupManager();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleCreateBackup = () => {
    createBackup();
  };

  const handleRestore = () => {
    if (selectedFile) {
      restoreBackup(selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Concluído</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Em Progresso</Badge>;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Seção de Criação de Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Criar Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Backup Completo do Banco de Dados</p>
                <p className="text-sm text-blue-700">Exporta todas as tabelas e dados em formato ZIP</p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  disabled={isBackingUp}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  {isBackingUp ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Criar Backup
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Criação de Backup</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso irá criar um backup completo de todas as tabelas do banco de dados. 
                    O processo pode demorar alguns minutos dependendo do tamanho dos dados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCreateBackup}>
                    Criar Backup
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {isBackingUp && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 animate-spin" />
                Criando backup...
              </div>
              <Progress value={50} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção de Restauração de Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Restaurar Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <p className="font-medium text-yellow-900">Atenção!</p>
            </div>
            <p className="text-sm text-yellow-800">
              A restauração irá <strong>substituir completamente</strong> todos os dados atuais do banco. 
              Esta operação não pode ser desfeita. Certifique-se de ter um backup atual antes de prosseguir.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">Selecionar Arquivo de Backup</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,.json"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {selectedFile && (
              <div className="p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                  <span className="text-xs text-gray-500">({formatFileSize(selectedFile.size)})</span>
                </div>
              </div>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={!selectedFile || isRestoring}
                  className="w-full"
                >
                  {isRestoring ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Restaurando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Restaurar Backup
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-red-600">Confirmar Restauração</AlertDialogTitle>
                  <AlertDialogDescription>
                    <div className="space-y-2">
                      <p>Esta ação irá:</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li>Apagar TODOS os dados atuais do banco</li>
                        <li>Restaurar os dados do arquivo: <strong>{selectedFile?.name}</strong></li>
                        <li>Esta operação NÃO pode ser desfeita</li>
                      </ul>
                      <p className="text-red-600 font-medium mt-3">Tem certeza de que deseja continuar?</p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRestore} className="bg-red-600 hover:bg-red-700">
                    Sim, Restaurar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {isRestoring && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 animate-spin" />
                Restaurando backup...
              </div>
              <Progress value={50} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Operações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Operações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Carregando histórico...</p>
            </div>
          ) : backupLogs && backupLogs.length > 0 ? (
            <div className="space-y-4">
              {backupLogs.map((log) => (
                <div key={log.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(log.status)}
                      <div>
                        <p className="font-medium">
                          {log.operation_type === 'backup' ? 'Backup' : 'Restauração'}
                        </p>
                        <p className="text-sm text-muted-foreground">{log.file_name}</p>
                      </div>
                    </div>
                    {getStatusBadge(log.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Iniciado em:</span>
                      <p>{format(new Date(log.started_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                    </div>
                    {log.completed_at && (
                      <div>
                        <span className="text-muted-foreground">Concluído em:</span>
                        <p>{format(new Date(log.completed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Tamanho:</span>
                      <p>{formatFileSize(log.file_size)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tabelas/Registros:</span>
                      <p>{log.tables_count || 0} / {log.records_count || 0}</p>
                    </div>
                  </div>

                  {log.error_message && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm text-red-800">{log.error_message}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-8 w-8 mx-auto mb-4 opacity-50" />
              <p>Nenhuma operação de backup encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupManager;
