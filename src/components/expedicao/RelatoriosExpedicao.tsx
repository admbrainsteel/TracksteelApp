
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, BarChart3 } from 'lucide-react';
import { useOFsAtivas } from '@/hooks/useOFsAtivas';
import { RelatorioGeralModal } from './RelatorioGeralModal';
import { RelatorioPecasModal } from './RelatorioPecasModal';

export const RelatoriosExpedicao = () => {
  const { data: ofsAtivas } = useOFsAtivas();
  const [selectedOF, setSelectedOF] = useState<string>('');
  const [showRelatorioGeral, setShowRelatorioGeral] = useState(false);
  const [showRelatorioPecas, setShowRelatorioPecas] = useState(false);

  const handleGerarRelatorioGeral = () => {
    if (!selectedOF) {
      alert('Por favor, selecione uma OF para gerar o relatório');
      return;
    }
    setShowRelatorioGeral(true);
  };

  const handleGerarRelatorioPecas = () => {
    if (!selectedOF) {
      alert('Por favor, selecione uma OF para gerar o relatório');
      return;
    }
    setShowRelatorioPecas(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Relatórios de Expedição</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Selecione a OF:</label>
            <Select value={selectedOF} onValueChange={setSelectedOF}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma OF..." />
              </SelectTrigger>
              <SelectContent>
                {ofsAtivas?.map((of) => (
                  <SelectItem key={of.of_number} value={of.of_number}>
                    {of.of_number} - {of.descricao_resumida || of.cliente}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-4 flex-wrap">
            <Button 
              onClick={handleGerarRelatorioGeral}
              disabled={!selectedOF}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Relatório Geral de Romaneios da OF
            </Button>
            
            <Button 
              onClick={handleGerarRelatorioPecas}
              disabled={!selectedOF}
              variant="outline"
              className="flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Relatório de Peças por OF
            </Button>
          </div>
        </CardContent>
      </Card>

      {showRelatorioGeral && (
        <RelatorioGeralModal
          isOpen={showRelatorioGeral}
          onClose={() => setShowRelatorioGeral(false)}
          ofNumber={selectedOF}
        />
      )}

      {showRelatorioPecas && (
        <RelatorioPecasModal
          isOpen={showRelatorioPecas}
          onClose={() => setShowRelatorioPecas(false)}
          ofNumber={selectedOF}
        />
      )}
    </div>
  );
};
