
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Trash2, Edit, Plus, Code, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useJsonCodes, JsonCode } from '@/hooks/useJsonCodes';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export function JsonCodesManager() {
  const { jsonCodes, loading, saveJsonCode, deleteJsonCode, toggleActiveStatus } = useJsonCodes();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<JsonCode | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    json_code: '',
    is_active: true
  });

  const handleOpenDialog = (code?: JsonCode) => {
    if (code) {
      setEditingCode(code);
      setFormData({
        name: code.name,
        description: code.description || '',
        json_code: JSON.stringify(code.json_code, null, 2),
        is_active: code.is_active
      });
    } else {
      setEditingCode(null);
      setFormData({
        name: '',
        description: '',
        json_code: '{\n  \n}',
        is_active: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const jsonData = JSON.parse(formData.json_code);
      
      await saveJsonCode({
        id: editingCode?.id,
        name: formData.name,
        description: formData.description,
        json_code: jsonData,
        is_active: formData.is_active
      });

      setIsDialogOpen(false);
      setEditingCode(null);
    } catch (error) {
      console.error('JSON inválido:', error);
      alert('JSON inválido. Por favor, verifique a sintaxe.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6">
          <div className="text-white">Carregando códigos JSON...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Gerenciamento de Códigos JSON
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => handleOpenDialog()}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Código
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingCode ? 'Editar Código JSON' : 'Novo Código JSON'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-white">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Nome do código JSON"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-white">Descrição</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Descrição opcional"
                  />
                </div>

                <div>
                  <Label htmlFor="json_code" className="text-white">Código JSON *</Label>
                  <Textarea
                    id="json_code"
                    value={formData.json_code}
                    onChange={(e) => setFormData({ ...formData, json_code: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white font-mono min-h-[300px]"
                    placeholder='{"exemplo": "valor"}'
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active" className="text-white">Ativo</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="border-slate-600 text-slate-300"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={!formData.name || !formData.json_code}
                  >
                    {editingCode ? 'Atualizar' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {jsonCodes.length === 0 ? (
          <div className="text-slate-400 text-center py-8">
            Nenhum código JSON cadastrado ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Nome</TableHead>
                  <TableHead className="text-slate-300">Descrição</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Criado em</TableHead>
                  <TableHead className="text-slate-300">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jsonCodes.map((code) => (
                  <TableRow key={code.id} className="border-slate-700">
                    <TableCell className="text-white font-medium">
                      {code.name}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {code.description || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={code.is_active ? 'default' : 'secondary'}>
                          {code.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActiveStatus(code.id, !code.is_active)}
                          className="text-slate-400 hover:text-white"
                        >
                          {code.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {formatDate(code.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(code)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-slate-800 border-slate-700">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">
                                Confirmar exclusão
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-300">
                                Tem certeza que deseja excluir o código "{code.name}"? 
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-slate-600 text-slate-300">
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteJsonCode(code.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
