import React, { useState, useEffect } from 'react';
import { SmartHeader } from './smart/components/SmartHeader';
import { SmartObraSelector } from './smart/components/SmartObraSelector';
import { SmartHub } from './smart/components/SmartHub';
import { SmartProducaoFlow } from './smart/components/SmartProducaoFlow';
import { SmartEmbarqueFlow } from './smart/components/SmartEmbarqueFlow';
import { SmartMontagemFlow } from './smart/components/SmartMontagemFlow';
import { SmartConsultaRelatoriosFlow } from './smart/components/SmartConsultaRelatoriosFlow';
import { OFAtiva } from '@/hooks/useOFsAtivas';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const ModoSmart: React.FC = () => {
  const { user } = useAuth();

  // Obra ativa selecionada
  const [obraAtiva, setObraAtiva] = useState<OFAtiva | null>(() => {
    try {
      const saved = localStorage.getItem('tracksteel_smart_last_of');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Tela ativa: 'hub' | 'producao' | 'embarque' | 'montagem' | 'consulta' | 'turno_pdf'
  const [telaAtiva, setTelaAtiva] = useState<
    'hub' | 'producao' | 'embarque' | 'montagem' | 'consulta' | 'turno_pdf'
  >('hub');

  // Produção do operador hoje
  const [producaoHoje, setProducaoHoje] = useState<{ totalPecas: number; totalKg: number }>({
    totalPecas: 0,
    totalKg: 0,
  });

  // Carregar produção de hoje do operador
  const carregarProducaoHoje = React.useCallback(async () => {
    if (!user || !obraAtiva) return;

    try {
      const hoje = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('apontamentos_producao')
        .select(`
          quantidade_produzida,
          pecas (
            peso_unitario
          )
        `)
        .eq('of_number', obraAtiva.of_number)
        .eq('data_apontamento', hoje)
        .eq('created_by', user.id);

      if (data) {
        let pecas = 0;
        let kg = 0;
        data.forEach((ap: any) => {
          const q = Number(ap.quantidade_produzida || 0);
          const p = Number(ap.pecas?.peso_unitario || 0);
          pecas += q;
          kg += q * p;
        });
        setProducaoHoje({ totalPecas: pecas, totalKg: kg });
      }
    } catch (e) {
      console.error('Erro ao carregar produção hoje:', e);
    }
  }, [user, obraAtiva]);

  useEffect(() => {
    carregarProducaoHoje();
  }, [carregarProducaoHoje]);

  const handleSelectObra = (of: OFAtiva) => {
    setObraAtiva(of);
    setTelaAtiva('hub');
  };

  const handleTrocarObra = () => {
    setObraAtiva(null);
    setTelaAtiva('hub');
  };

  const handleApontamentoRealizado = (pecasCount: number, pesoKg: number) => {
    setProducaoHoje((prev) => ({
      totalPecas: prev.totalPecas + pecasCount,
      totalKg: prev.totalKg + pesoKg,
    }));
  };

  // Determinar título do cabeçalho
  const getHeaderInfo = () => {
    if (!obraAtiva) {
      return {
        titulo: 'MODO SMART',
        subtitulo: 'Chão de Fábrica Touch-First',
        mostrarVoltar: false,
      };
    }

    if (telaAtiva === 'hub') {
      return {
        titulo: `OF ${obraAtiva.of_number}`,
        subtitulo: obraAtiva.cliente || 'Central de Operação',
        mostrarVoltar: false,
      };
    }

    const mapaTitulos: Record<string, string> = {
      producao: '1. Apontar Produção',
      embarque: '2. Apontar Embarque',
      montagem: '3. Apontar Montagem',
      consulta: '4. Consultar Peças',
      turno_pdf: 'Relatório do Turno',
    };

    return {
      titulo: mapaTitulos[telaAtiva] || 'Modo Smart',
      subtitulo: `OF ${obraAtiva.of_number}`,
      mostrarVoltar: true,
    };
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Cabeçalho Fixo do Modo Smart */}
      <SmartHeader
        titulo={headerInfo.titulo}
        subtitulo={headerInfo.subtitulo}
        mostrarVoltar={headerInfo.mostrarVoltar}
        onVoltar={() => setTelaAtiva('hub')}
      />

      {/* Conteúdo Principal Touch-First */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {!obraAtiva ? (
          <SmartObraSelector onSelectObra={handleSelectObra} />
        ) : telaAtiva === 'hub' ? (
          <SmartHub
            obra={obraAtiva}
            onTrocarObra={handleTrocarObra}
            onNavigate={(destino) => setTelaAtiva(destino)}
            producaoHoje={producaoHoje}
            onGerarRelatorioTurno={() => setTelaAtiva('turno_pdf')}
          />
        ) : telaAtiva === 'producao' ? (
          <SmartProducaoFlow
            obra={obraAtiva}
            onApontamentoRealizado={handleApontamentoRealizado}
            onVoltarHub={() => setTelaAtiva('hub')}
          />
        ) : telaAtiva === 'embarque' ? (
          <SmartEmbarqueFlow
            obra={obraAtiva}
            onVoltarHub={() => setTelaAtiva('hub')}
          />
        ) : telaAtiva === 'montagem' ? (
          <SmartMontagemFlow
            obra={obraAtiva}
            onVoltarHub={() => setTelaAtiva('hub')}
          />
        ) : telaAtiva === 'consulta' ? (
          <SmartConsultaRelatoriosFlow
            obra={obraAtiva}
            onVoltarHub={() => setTelaAtiva('hub')}
          />
        ) : telaAtiva === 'turno_pdf' ? (
          <SmartConsultaRelatoriosFlow
            obra={obraAtiva}
            onVoltarHub={() => setTelaAtiva('hub')}
            abrirDiretoTurno={true}
          />
        ) : null}
      </main>
    </div>
  );
};

export default ModoSmart;
