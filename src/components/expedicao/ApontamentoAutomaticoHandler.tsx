
import React, { useEffect, useState } from 'react';
import { useApontamentoAutomaticoRomaneio, PecaComProcessosPulados } from '@/hooks/useApontamentoAutomaticoRomaneio';
import { ProcessosPuladosModal } from './ProcessosPuladosModal';
import { toast } from 'sonner';

interface ApontamentoAutomaticoHandlerProps {
  romaneio: any;
  onApontamentoConcluido: () => void;
}

export const ApontamentoAutomaticoHandler: React.FC<ApontamentoAutomaticoHandlerProps> = ({
  romaneio,
  onApontamentoConcluido
}) => {
  const { processarApontamentos, loading } = useApontamentoAutomaticoRomaneio();
  const [showProcessosPuladosModal, setShowProcessosPuladosModal] = useState(false);
  const [pecasComProcessosPulados, setPecasComProcessosPulados] = useState<PecaComProcessosPulados[]>([]);
  const [pecasOK, setPecasOK] = useState<any[]>([]);

  useEffect(() => {
    if (romaneio) {
      iniciarProcessamento();
    }
  }, [romaneio]);

  const iniciarProcessamento = async () => {
    try {
      console.log('🚀 Iniciando processamento automático do romaneio:', romaneio.numero_romaneio);
      
      if (!romaneio.itens_pecas || romaneio.itens_pecas.length === 0) {
        console.log('ℹ️ Romaneio sem peças para processar');
        onApontamentoConcluido();
        return;
      }

      const itensParaProcessar = romaneio.itens_pecas.map((item: any) => ({
        peca_id: item.peca_id,
        marca: item.marca,
        quantidade_expedida: item.quantidade_expedida,
        fase: item.fase
      }));

      console.log('📋 Itens para processar:', itensParaProcessar);

      const resultado = await processarApontamentos.mutateAsync({
        romaneioId: romaneio.id,
        numeroRomaneio: romaneio.numero_romaneio,
        ofNumber: romaneio.of_number,
        itens: itensParaProcessar,
        criarProcessosRetroativos: false
      });

      console.log('📊 Resultado do processamento:', resultado);

      if (resultado.precisaConfirmacaoProcessosPulados) {
        console.log('⚠️ Confirmação necessária para processos pulados');
        setPecasComProcessosPulados(resultado.pecasComProcessosPulados || []);
        setPecasOK(resultado.pecasOK || []);
        setShowProcessosPuladosModal(true);
      } else if (resultado.sucesso) {
        console.log('✅ Processamento concluído com sucesso');
        onApontamentoConcluido();
      } else {
        console.log('ℹ️ Processamento não realizado:', resultado.erro || 'Motivo não especificado');
        onApontamentoConcluido();
      }
    } catch (error) {
      console.error('❌ Erro no processamento automático:', error);
      onApontamentoConcluido();
    }
  };

  const handleConfirmarProcessosRetroativos = async () => {
    try {
      console.log('✅ Usuário confirmou criação de processos retroativos');
      
      // Combinar peças OK com peças que têm processos pulados
      const todosItens = [
        ...pecasOK,
        ...pecasComProcessosPulados.map(peca => ({
          peca_id: peca.peca_id,
          marca: peca.marca,
          quantidade_expedida: peca.quantidade_expedida,
          fase: peca.fase
        }))
      ];

      const resultado = await processarApontamentos.mutateAsync({
        romaneioId: romaneio.id,
        numeroRomaneio: romaneio.numero_romaneio,
        ofNumber: romaneio.of_number,
        itens: todosItens,
        criarProcessosRetroativos: true
      });

      console.log('📊 Resultado com processos retroativos:', resultado);
      
      setShowProcessosPuladosModal(false);
      onApontamentoConcluido();
    } catch (error) {
      console.error('❌ Erro ao criar processos retroativos:', error);
      setShowProcessosPuladosModal(false);
      onApontamentoConcluido();
    }
  };

  const handleCancelarApontamento = () => {
    console.log('❌ Usuário cancelou o apontamento automático');
    toast.info('Apontamento automático cancelado pelo usuário');
    setShowProcessosPuladosModal(false);
    onApontamentoConcluido();
  };

  const handleFecharModal = () => {
    setShowProcessosPuladosModal(false);
    onApontamentoConcluido();
  };

  return (
    <>
      {showProcessosPuladosModal && (
        <ProcessosPuladosModal
          isOpen={showProcessosPuladosModal}
          onClose={handleFecharModal}
          onConfirm={handleConfirmarProcessosRetroativos}
          onCancel={handleCancelarApontamento}
          pecasComProcessosPulados={pecasComProcessosPulados}
          loading={loading}
        />
      )}
    </>
  );
};
