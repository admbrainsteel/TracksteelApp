
import React, { useEffect } from 'react';
import { ApontamentoAutomaticoHandler } from './ApontamentoAutomaticoHandler';

interface RomaneioEntregueDetail {
  romaneioId: string;
  status: string;
  romaneioData?: any;
  statusAnterior?: string;
}

export const ApontamentoAutomaticoListener: React.FC = () => {
  const [romaneioParaProcessar, setRomaneioParaProcessar] = React.useState<any>(null);

  useEffect(() => {
    const handleRomaneioEntregue = async (event: CustomEvent<RomaneioEntregueDetail>) => {
      console.log('🎯 Evento romaneio-entregue capturado:', event.detail);
      
      const { romaneioId, romaneioData, status, statusAnterior } = event.detail;
      
      try {
        // Verificação adicional de segurança
        if (status !== 'Entregue') {
          console.log('❌ Status não é "Entregue", ignorando evento');
          return;
        }

        if (statusAnterior === 'Entregue') {
          console.log('❌ Status anterior já era "Entregue", ignorando evento');
          return;
        }
        
        // Verificar se temos dados do romaneio
        if (!romaneioData) {
          console.log('⚠️ Dados do romaneio não fornecidos no evento');
          return;
        }

        // Verificar se o romaneio tem peças para processar
        if (!romaneioData.itens_pecas || romaneioData.itens_pecas.length === 0) {
          console.log('ℹ️ Romaneio sem peças para apontar automaticamente');
          return;
        }

        console.log('✅ Iniciando processamento do apontamento automático');
        console.log('📦 Romaneio:', romaneioData.numero_romaneio);
        console.log('🔧 OF:', romaneioData.of_number);
        console.log('📋 Peças encontradas:', romaneioData.itens_pecas.length);
        console.log('🔄 Mudança de status:', `"${statusAnterior}" → "${status}"`);
        
        setRomaneioParaProcessar(romaneioData);
        
      } catch (error) {
        console.error('❌ Erro ao processar romaneio entregue:', error);
      }
    };

    // Adicionar listener para o evento customizado
    window.addEventListener('romaneio-entregue', handleRomaneioEntregue as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('romaneio-entregue', handleRomaneioEntregue as EventListener);
    };
  }, []);

  // Renderizar o handler de apontamento automático quando há um romaneio para processar
  if (romaneioParaProcessar) {
    return (
      <ApontamentoAutomaticoHandler
        romaneio={romaneioParaProcessar}
        onApontamentoConcluido={() => {
          console.log('✅ Apontamento automático concluído');
          setRomaneioParaProcessar(null);
        }}
      />
    );
  }

  return null;
};
