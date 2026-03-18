
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Key, Star, Plus, TestTube2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useApiKeys, ApiKey } from '@/hooks/useApiKeys';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const ApiKeysManager = () => {
  const { apiKeys, loading, saveApiKey, setPrimaryKey, deleteApiKey } = useApiKeys();
  const [showDialog, setShowDialog] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [formData, setFormData] = useState({ name: '', key: '' });
  const [testingKeys, setTestingKeys] = useState<Set<string>>(new Set());
  const [keyTestResults, setKeyTestResults] = useState<Map<string, boolean>>(new Map());

  const handleEdit = (apiKey: ApiKey) => {
    setEditingKey(apiKey);
    setFormData({ name: apiKey.name, key: apiKey.key });
    setShowDialog(true);
  };

  const handleAdd = () => {
    setEditingKey(null);
    setFormData({ name: '', key: '' });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.key.trim()) {
      return;
    }

    await saveApiKey({
      id: editingKey?.id,
      name: formData.name,
      key: formData.key
    });

    setShowDialog(false);
    setFormData({ name: '', key: '' });
    setEditingKey(null);
  };

  const handleClose = () => {
    setShowDialog(false);
    setFormData({ name: '', key: '' });
    setEditingKey(null);
  };

  const testApiKey = async (apiKey: ApiKey) => {
    setTestingKeys(prev => new Set([...prev, apiKey.id]));
    
    try {
      // Teste básico para OpenAI/Gemini APIs
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey.key}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setKeyTestResults(prev => new Map([...prev, [apiKey.id, true]]));
        toast.success(`Chave "${apiKey.name}" validada com sucesso!`);
      } else if (response.status === 401 || response.status === 403) {
        // Se falhar com OpenAI, tenta com Gemini
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey.key}`, {
          method: 'GET',
        });

        if (geminiResponse.ok) {
          setKeyTestResults(prev => new Map([...prev, [apiKey.id, true]]));
          toast.success(`Chave "${apiKey.name}" validada com sucesso (Gemini)!`);
        } else {
          setKeyTestResults(prev => new Map([...prev, [apiKey.id, false]]));
          toast.error(`Chave "${apiKey.name}" é inválida ou não tem permissões adequadas.`);
        }
      } else {
        setKeyTestResults(prev => new Map([...prev, [apiKey.id, false]]));
        toast.error(`Erro ao testar chave "${apiKey.name}": ${response.status}`);
      }
    } catch (error) {
      console.error('Erro ao testar chave API:', error);
      setKeyTestResults(prev => new Map([...prev, [apiKey.id, false]]));
      toast.error(`Erro de conexão ao testar chave "${apiKey.name}"`);
    } finally {
      setTestingKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(apiKey.id);
        return newSet;
      });
    }
  };

  const getTestStatusIcon = (keyId: string) => {
    const isValid = keyTestResults.get(keyId);
    if (isValid === true) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (isValid === false) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    return null;
  };

  const canAddMore = apiKeys.length < 3;

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground flex items-center gap-2">
            <Key className="w-5 h-5" />
            Gerenciamento de Chaves API
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-card-foreground flex items-center gap-2">
            <Key className="w-5 h-5" />
            Gerenciamento de Chaves API
          </CardTitle>
          {canAddMore && (
            <Button
              onClick={handleAdd}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {apiKeys.length === 0 ? (
              <div className="text-center py-8">
                <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma chave API configurada</p>
                <p className="text-muted-foreground text-sm">
                  Adicione até 3 chaves para redundância automática
                </p>
              </div>
            ) : (
              apiKeys.map((apiKey) => (
                <div
                  key={apiKey.id}
                  className="border border-border rounded-lg p-2 sm:p-3 space-y-2 bg-card"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-card-foreground font-medium text-sm">{apiKey.name}</h4>
                      {apiKey.is_primary ? (
                        <Badge variant="default" className="bg-primary text-primary-foreground text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Principal
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Secundária</Badge>
                      )}
                      {getTestStatusIcon(apiKey.id)}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {testingKeys.has(apiKey.id) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="text-xs h-6 px-2"
                        >
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          <span className="hidden sm:inline">Testando...</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testApiKey(apiKey)}
                          className="text-xs hover:bg-accent hover:text-accent-foreground h-6 px-2"
                        >
                          <TestTube2 className="w-3 h-3 mr-1" />
                          <span className="hidden sm:inline">Testar</span>
                        </Button>
                      )}
                      {!apiKey.is_primary && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPrimaryKey(apiKey.id)}
                          className="text-xs h-6 px-2 hidden sm:inline-flex"
                        >
                          Definir como Principal
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(apiKey)}
                        className="h-6 w-6 p-0 hover:bg-accent hover:text-accent-foreground"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteApiKey(apiKey.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 w-6 p-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded">
                    {apiKey.key.substring(0, 20)}...
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-muted-foreground">
                    <span>Criada: {new Date(apiKey.created_at).toLocaleDateString('pt-BR')}</span>
                    {keyTestResults.has(apiKey.id) && (
                      <span className={`flex items-center gap-1 ${
                        keyTestResults.get(apiKey.id) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {keyTestResults.get(apiKey.id) ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Válida
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            Inválida
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  
                  {/* Mobile: Show primary button if not primary */}
                  {!apiKey.is_primary && (
                    <div className="sm:hidden">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPrimaryKey(apiKey.id)}
                        className="text-xs h-6 w-full"
                      >
                        Definir como Principal
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
            
            {apiKeys.length > 0 && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
                <p className="text-sm text-card-foreground mb-2">
                  <strong>Sistema de Fallback:</strong>
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  O sistema usa automaticamente a chave principal. Em caso de falha (401/403/timeout), 
                  tenta as chaves secundárias em sequência até encontrar uma válida.
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Teste de Validação:</strong> Verifica se a chave é válida testando conexão com OpenAI ou Gemini APIs.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={handleClose}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">
              {editingKey ? 'Editar Chave API' : 'Adicionar Chave API'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingKey 
                ? 'Modifique os dados da chave API existente.' 
                : 'Adicione uma nova chave API ao sistema.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-card-foreground">Nome da Chave</Label>
              <Input
                id="name"
                placeholder="Ex: OpenAI Principal, Gemini Backup, etc."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-background border-input text-foreground"
              />
            </div>
            
            <div>
              <Label htmlFor="key" className="text-card-foreground">Chave API</Label>
              <Input
                id="key"
                type="password"
                placeholder="Insira a chave API"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                className="bg-background border-input text-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Suporta chaves OpenAI, Gemini e outras APIs compatíveis
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {editingKey ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
