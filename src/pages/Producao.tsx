
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { ApontamentoDiarioChart } from '@/components/producao/ApontamentoDiarioChart';
import { RelatorioPecasProcessoModal } from '@/components/producao/RelatorioPecasProcessoModal';
import { useState } from 'react';

const Producao = () => {
  const [showRelatorioPecasProcesso, setShowRelatorioPecasProcesso] = useState(false);

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Produção</h1>
          <p className="text-sm md:text-base text-muted-foreground">Controle e monitoramento da produção</p>
        </div>
        
        <Button
          onClick={() => setShowRelatorioPecasProcesso(true)}
          className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 px-4 py-2"
        >
          <FileText className="h-4 w-4" />
          Relatório Pçs p/ Processo
        </Button>
      </div>

      {/* Gráfico de Apontamento Diário */}
      <ApontamentoDiarioChart />

      {/* Modal do Relatório de Peças por Processo */}
      <RelatorioPecasProcessoModal
        isOpen={showRelatorioPecasProcesso}
        onClose={() => setShowRelatorioPecasProcesso(false)}
      />
    </div>
  );
};

export default Producao;
