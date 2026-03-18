
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FiltrosVisualizacaoProps {
  onFiltroChange: (ofNumber: string | null, etapaFase: string | null) => void;
  ofSelecionada: string | null;
  faseSelecionada: string | null;
}

export const FiltrosVisualizacao: React.FC<FiltrosVisualizacaoProps> = ({
  onFiltroChange,
  ofSelecionada,
  faseSelecionada
}) => {
  // Buscar OFs disponíveis - corrigida para buscar de todas as fontes
  const { data: ofsDisponiveis = [] } = useQuery({
    queryKey: ['ofs-disponiveis-prioridade'],
    queryFn: async () => {
      console.log('🔍 Buscando OFs disponíveis...');
      
      // Buscar OFs da tabela prioridades_fabricacao
      const { data: ofsPrioridades, error: errorPrioridades } = await supabase
        .from('prioridades_fabricacao')
        .select('of_number')
        .eq('ativo', true)
        .order('of_number');
      
      if (errorPrioridades) {
        console.error('❌ Erro ao buscar OFs das prioridades:', errorPrioridades);
      }
      
      // Buscar OFs da tabela pecas (backup)
      const { data: ofsPecas, error: errorPecas } = await supabase
        .from('pecas')
        .select('of_number')
        .order('of_number');
      
      if (errorPecas) {
        console.error('❌ Erro ao buscar OFs das peças:', errorPecas);
      }
      
      // Combinar e remover duplicatas
      const todasOfs = [
        ...(ofsPrioridades || []).map(item => item.of_number),
        ...(ofsPecas || []).map(item => item.of_number)
      ];
      
      const ofsUnicas = Array.from(new Set(todasOfs.filter(Boolean)));
      
      console.log('📋 OFs encontradas:', ofsUnicas);
      return ofsUnicas.sort();
    }
  });

  // Buscar Fases disponíveis (baseado na OF selecionada)
  const { data: fasesDisponiveis = [] } = useQuery({
    queryKey: ['fases-disponiveis-prioridade', ofSelecionada],
    queryFn: async () => {
      if (!ofSelecionada) return [];
      
      console.log('🔍 Buscando fases para OF:', ofSelecionada);
      
      // Buscar fases da tabela prioridades_fabricacao
      const { data: fasesPrioridades, error: errorPrioridades } = await supabase
        .from('prioridades_fabricacao')
        .select('etapa_fase')
        .eq('of_number', ofSelecionada)
        .eq('ativo', true)
        .order('etapa_fase');
      
      if (errorPrioridades) {
        console.error('❌ Erro ao buscar fases das prioridades:', errorPrioridades);
      }
      
      // Buscar fases da tabela pecas (backup)
      const { data: fasesPecas, error: errorPecas } = await supabase
        .from('pecas')
        .select('etapa_fase')
        .eq('of_number', ofSelecionada)
        .order('etapa_fase');
      
      if (errorPecas) {
        console.error('❌ Erro ao buscar fases das peças:', errorPecas);
      }
      
      // Combinar e remover duplicatas
      const todasFases = [
        ...(fasesPrioridades || []).map(item => item.etapa_fase),
        ...(fasesPecas || []).map(item => item.etapa_fase)
      ];
      
      const fasesUnicas = Array.from(new Set(todasFases.filter(Boolean)));
      
      console.log('📋 Fases encontradas para OF', ofSelecionada, ':', fasesUnicas);
      return fasesUnicas.sort();
    },
    enabled: !!ofSelecionada
  });

  const handleOfChange = (value: string) => {
    const novaOf = value === 'todas' ? null : value;
    console.log('🔄 Mudança de OF:', novaOf);
    onFiltroChange(novaOf, null); // Reset fase quando muda OF
  };

  const handleFaseChange = (value: string) => {
    const novaFase = value === 'todas' ? null : value;
    console.log('🔄 Mudança de Fase:', novaFase);
    onFiltroChange(ofSelecionada, novaFase);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Filtros de Visualização do Kanban</CardTitle>
        <p className="text-sm text-muted-foreground">
          Use os filtros abaixo para visualizar apenas as peças de uma OF e Fase específicas no Kanban
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Ordem de Fabricação (OF) - Filtro de Visualização
            </label>
            <Select value={ofSelecionada || 'todas'} onValueChange={handleOfChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma OF para filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as OFs</SelectItem>
                {ofsDisponiveis.map((of) => (
                  <SelectItem key={of} value={of}>
                    {of}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Fase (etapa_fase) - Filtro de Visualização
            </label>
            <Select 
              value={faseSelecionada || 'todas'} 
              onValueChange={handleFaseChange}
              disabled={!ofSelecionada}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma fase para filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Fases</SelectItem>
                {fasesDisponiveis.map((fase) => (
                  <SelectItem key={fase} value={fase}>
                    {fase}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
