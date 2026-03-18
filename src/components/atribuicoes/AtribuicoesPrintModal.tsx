
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer } from 'lucide-react';
import { Atribuicao } from '@/hooks/useAtribuicoes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AtribuicoesPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  atribuicoes: Atribuicao[];
}

export function AtribuicoesPrintModal({ isOpen, onClose, atribuicoes }: AtribuicoesPrintModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Obter lista única de usuários
  const uniqueUsers = Array.from(
    new Map(atribuicoes.map(attr => [attr.user_id, { id: attr.user_id, name: attr.user_name }]))
      .values()
  );

  const handlePrint = () => {
    if (!selectedUserId) return;

    // Filtrar atribuições do usuário selecionado
    const userAtribuicoes = atribuicoes.filter(attr => attr.user_id === selectedUserId);
    const selectedUser = uniqueUsers.find(user => user.id === selectedUserId);

    if (!selectedUser || userAtribuicoes.length === 0) return;

    const getImportanceBadgeStyle = (importancia: string) => {
      switch (importancia) {
        case 'essencial': 
          return 'bg-red-100 text-red-800';
        case 'estrategico': 
          return 'bg-blue-100 text-blue-800';
        case 'suporte': 
          return 'bg-gray-100 text-gray-800';
        case 'informativo': 
          return 'bg-green-100 text-green-800';
        default: 
          return 'bg-gray-100 text-gray-800';
      }
    };

    const printContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Relatório de Atribuições</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
              body {
                  font-family: 'Inter', sans-serif;
              }
              @media print {
                  body {
                      -webkit-print-color-adjust: exact;
                      color-adjust: exact;
                  }
                  .print-container {
                      box-shadow: none;
                      margin: 0;
                      max-width: 100%;
                      border: 1px solid #ddd;
                  }
                  .no-print {
                      display: none;
                  }
              }
          </style>
      </head>
      <body class="bg-gray-100 p-4 sm:p-6">
          <div class="print-container max-w-6xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
              <header class="bg-gray-100 text-gray-800 p-4 md:p-5 border-b border-gray-200">
                  <h1 class="text-xl md:text-2xl font-bold">Relatório de Atribuições de ${selectedUser.name}</h1>
                  <p class="text-gray-600 text-sm">Lista de atribuições para o usuário selecionado.</p>
              </header>

              <main class="p-4 md:p-6">
                  <div class="overflow-x-auto rounded-lg border border-gray-200">
                      <table class="min-w-full divide-y divide-gray-200 text-sm">
                          <thead class="bg-gray-50">
                              <tr>
                                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Atribuição</th>
                                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Frequência</th>
                                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Método</th>
                                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Cliente</th>
                                  <th scope="col" class="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Importância</th>
                                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Duração</th>
                              </tr>
                          </thead>
                          <tbody class="bg-white divide-y divide-gray-200">
                              ${userAtribuicoes.map((attr, index) => `
                                  <tr${index % 2 === 1 ? ' class="hover:bg-gray-50"' : ''}>
                                      <td class="px-4 py-3 align-top text-gray-700" style="white-space: normal;">${attr.attribution}</td>
                                      <td class="px-4 py-3 align-top whitespace-nowrap text-gray-700">${attr.frequency}</td>
                                      <td class="px-4 py-3 align-top whitespace-nowrap text-gray-700">${attr.method}</td>
                                      <td class="px-4 py-3 align-top whitespace-nowrap text-gray-700">${attr.client}</td>
                                      <td class="px-4 py-3 align-top whitespace-nowrap text-center">
                                          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getImportanceBadgeStyle(attr.importance)}">
                                              ${attr.importance}
                                          </span>
                                      </td>
                                      <td class="px-4 py-3 align-top whitespace-nowrap text-gray-700">${attr.duration}</td>
                                  </tr>
                              `).join('')}
                          </tbody>
                      </table>
                  </div>
              </main>

              <footer class="text-center text-xs text-gray-400 p-3 bg-gray-50 border-t">
                  <p>Relatório gerado em: ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}</p>
              </footer>
          </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(printContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Imprimir Atribuições
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Selecionar Usuário:</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um usuário..." />
              </SelectTrigger>
              <SelectContent>
                {uniqueUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handlePrint} 
              disabled={!selectedUserId}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
