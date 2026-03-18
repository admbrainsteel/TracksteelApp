import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Edit, Plus } from 'lucide-react';
import { useOFs } from '@/hooks/useOFs';
import { useUserManagement } from '@/hooks/useUserManagement';
import { type Equipamento } from '@/hooks/useEquipamentos';

interface LoanRecord {
  id: string;
  equipamento_id: string;
  of_number?: string;
  destino_outro?: string;
  data_saida: string;
  retirado_por: string;
  data_retorno?: string;
  devolvido_por?: string;
  status: 'emprestado' | 'devolvido';
}

interface LoanFormData {
  of_number: string;
  destino_outro: string;
  data_saida: string;
  retirado_por: string;
  data_retorno: string;
  devolvido_por: string;
}

interface EquipamentoLoanControlProps {
  isOpen: boolean;
  onClose: () => void;
  equipamento: Equipamento;
}

export const EquipamentoLoanControl: React.FC<EquipamentoLoanControlProps> = ({
  isOpen,
  onClose,
  equipamento
}) => {
  const { ofs } = useOFs();
  const { users } = useUserManagement();
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanRecord | null>(null);
  const [formData, setFormData] = useState<LoanFormData>({
    of_number: '',
    destino_outro: '',
    data_saida: '',
    retirado_por: '',
    data_retorno: '',
    devolvido_por: ''
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  // Função para converter data DD/MM/AA para formato input (YYYY-MM-DD)
  const formatDateToInput = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
  };

  // Função para converter data do input (YYYY-MM-DD) para DD/MM/AA
  const formatDateFromInput = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    // Validação: OF de destino OU Outro Destino obrigatório
    if (!formData.of_number && !formData.destino_outro) {
      errors.destination = 'Informe a OF de destino OU o outro destino';
    }
    
    if (!formData.data_saida) {
      errors.data_saida = 'Data de saída é obrigatória';
    }
    
    if (!formData.retirado_por) {
      errors.retirado_por = 'Retirado por é obrigatório';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      const loanData: LoanRecord = {
        id: editingLoan?.id || Date.now().toString(),
        equipamento_id: equipamento.id,
        of_number: formData.of_number || undefined,
        destino_outro: formData.destino_outro || undefined,
        data_saida: formatDateFromInput(formData.data_saida),
        retirado_por: formData.retirado_por,
        data_retorno: formData.data_retorno ? formatDateFromInput(formData.data_retorno) : undefined,
        devolvido_por: formData.devolvido_por || undefined,
        status: formData.data_retorno ? 'devolvido' : 'emprestado'
      };

      if (editingLoan) {
        setLoans(prev => prev.map(loan => loan.id === editingLoan.id ? loanData : loan));
      } else {
        setLoans(prev => [...prev, loanData]);
      }

      resetForm();
    } catch (error) {
      console.error('Erro ao salvar empréstimo:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      of_number: '',
      destino_outro: '',
      data_saida: '',
      retirado_por: '',
      data_retorno: '',
      devolvido_por: ''
    });
    setFormErrors({});
    setEditingLoan(null);
    setIsFormOpen(false);
  };

  const handleEdit = (loan: LoanRecord) => {
    setFormData({
      of_number: loan.of_number || '',
      destino_outro: loan.destino_outro || '',
      data_saida: formatDateToInput(loan.data_saida),
      retirado_por: loan.retirado_por,
      data_retorno: loan.data_retorno ? formatDateToInput(loan.data_retorno) : '',
      devolvido_por: loan.devolvido_por || ''
    });
    setEditingLoan(loan);
    setIsFormOpen(true);
  };

  const handleDelete = (loanId: string) => {
    if (confirm('Tem certeza que deseja excluir este registro de empréstimo?')) {
      setLoans(prev => prev.filter(loan => loan.id !== loanId));
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || user?.email || 'Usuário não encontrado';
  };

  const getOFDescription = (ofNumber: string) => {
    const of = ofs.find(o => o.num_of === ofNumber);
    return of ? `${of.num_of} - ${of.descritivo || 'Sem descrição'}` : ofNumber;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            Controle de Empréstimo - {equipamento.codigo} ({equipamento.descricao})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Botão para adicionar novo empréstimo */}
          <div className="flex justify-end">
            <Button
              onClick={() => setIsFormOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Empréstimo
            </Button>
          </div>

          {/* Tabela de empréstimos */}
          <div className="border border-slate-600 rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-600">
                  <TableHead className="text-slate-300">Destino</TableHead>
                  <TableHead className="text-slate-300">Data Saída</TableHead>
                  <TableHead className="text-slate-300">Retirado Por</TableHead>
                  <TableHead className="text-slate-300">Data Retorno</TableHead>
                  <TableHead className="text-slate-300">Devolvido Por</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow key={loan.id} className="border-slate-600">
                    <TableCell className="text-white">
                      {loan.of_number ? getOFDescription(loan.of_number) : loan.destino_outro}
                    </TableCell>
                    <TableCell className="text-white">{loan.data_saida}</TableCell>
                    <TableCell className="text-white">{getUserName(loan.retirado_por)}</TableCell>
                    <TableCell className="text-white">{loan.data_retorno || '-'}</TableCell>
                    <TableCell className="text-white">{loan.devolvido_por ? getUserName(loan.devolvido_por) : '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        loan.status === 'emprestado' 
                          ? 'bg-yellow-600 text-yellow-100' 
                          : 'bg-green-600 text-green-100'
                      }`}>
                        {loan.status === 'emprestado' ? 'Emprestado' : 'Devolvido'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(loan)}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(loan.id)}
                          className="border-red-600 text-red-400 hover:bg-red-900"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {loans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                      Nenhum registro de empréstimo encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Modal do formulário */}
        <Dialog open={isFormOpen} onOpenChange={() => resetForm()}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingLoan ? 'Editar Empréstimo' : 'Novo Empréstimo'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Validação de destino */}
              {formErrors.destination && (
                <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded">
                  {formErrors.destination}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="of_number" className="text-slate-300">OF de Destino</Label>
                  <Select
                    value={formData.of_number}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      of_number: value === 'none' ? '' : value,
                      destino_outro: value !== 'none' && value ? '' : prev.destino_outro
                    }))}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Selecione uma OF" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="none" className="text-white hover:bg-slate-600">Nenhuma</SelectItem>
                      {ofs.map((of) => (
                        <SelectItem key={of.id} value={of.num_of} className="text-white hover:bg-slate-600">
                          {of.num_of} - {of.descritivo || 'Sem descrição'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destino_outro" className="text-slate-300">Outro Destino</Label>
                  <Input
                    id="destino_outro"
                    value={formData.destino_outro}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      destino_outro: e.target.value,
                      of_number: e.target.value ? '' : prev.of_number
                    }))}
                    disabled={!!formData.of_number}
                    className="bg-slate-700 border-slate-600 text-white disabled:opacity-50"
                    placeholder="Informe o destino alternativo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_saida" className="text-slate-300">Data de Saída *</Label>
                  <Input
                    id="data_saida"
                    type="date"
                    value={formData.data_saida}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_saida: e.target.value }))}
                    required
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  {formErrors.data_saida && (
                    <span className="text-red-400 text-xs">{formErrors.data_saida}</span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retirado_por" className="text-slate-300">Retirado Por *</Label>
                  <Select
                    value={formData.retirado_por}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, retirado_por: value === 'none' ? '' : value }))}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="none" className="text-white hover:bg-slate-600">Nenhum</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id} className="text-white hover:bg-slate-600">
                          {user.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.retirado_por && (
                    <span className="text-red-400 text-xs">{formErrors.retirado_por}</span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_retorno" className="text-slate-300">Data de Retorno</Label>
                  <Input
                    id="data_retorno"
                    type="date"
                    value={formData.data_retorno}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_retorno: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="devolvido_por" className="text-slate-300">Devolvido Por</Label>
                  <Select
                    value={formData.devolvido_por}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, devolvido_por: value === 'none' ? '' : value }))}
                    disabled={!formData.data_retorno}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white disabled:opacity-50">
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="none" className="text-white hover:bg-slate-600">Nenhum</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id} className="text-white hover:bg-slate-600">
                          {user.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  {editingLoan ? 'Atualizar' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Botão fechar */}
        <div className="flex justify-end pt-4">
          <Button onClick={onClose} className="bg-slate-600 hover:bg-slate-700 text-white">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};