
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { UserFunction } from '@/hooks/useUserManagement';

interface FunctionsManagerProps {
  functions: UserFunction[];
  onCreate: (data: { name: string; description?: string }) => void;
  onUpdate: (id: string, data: { name: string; description?: string }) => void;
  onDelete: (id: string) => void;
}

export function FunctionsManager({ functions, onCreate, onUpdate, onDelete }: FunctionsManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingFunction, setEditingFunction] = useState<UserFunction | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const handleOpenModal = (func?: UserFunction) => {
    if (func) {
      setEditingFunction(func);
      setFormData({ name: func.name, description: func.description || '' });
    } else {
      setEditingFunction(null);
      setFormData({ name: '', description: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingFunction(null);
    setFormData({ name: '', description: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingFunction) {
      onUpdate(editingFunction.id, formData);
    } else {
      onCreate(formData);
    }
    
    handleCloseModal();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Gerenciar Funções</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie as funções disponíveis no sistema
          </p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Função
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">Descrição</TableHead>
                  <TableHead className="hidden md:table-cell">Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {functions.map((func) => (
                  <TableRow key={func.id}>
                    <TableCell className="min-w-0">
                      <div className="font-medium text-xs sm:text-sm">{func.name}</div>
                      {/* Mobile: Show description and date on small screens */}
                      <div className="sm:hidden space-y-1 mt-1">
                        <div className="text-xs text-muted-foreground">
                          {func.description || 'Sem descrição'}
                        </div>
                        <div className="text-xs text-muted-foreground md:hidden">
                          Criado: {new Date(func.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground">{func.description || '-'}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">{new Date(func.created_at).toLocaleDateString('pt-BR')}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenModal(func)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/50 p-1 h-6 w-6"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDelete(func.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/50 p-1 h-6 w-6"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <Dialog open={true} onOpenChange={handleCloseModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingFunction ? 'Editar Função' : 'Nova Função'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Digite o nome da função"
                  required
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Digite a descrição da função"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit">
                  Salvar
                </Button>
                <Button type="button" variant="ghost" onClick={handleCloseModal}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
