
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FileText, CalendarIcon } from 'lucide-react';
import { useApontamentoDiarioChart } from '@/hooks/useApontamentoDiarioChart';
import { useRelatorioDiario } from '@/hooks/useRelatorioDiario';
import { RelatorioDiarioModal } from './RelatorioDiarioModal';
import { formatBrazilianDateFromString } from '@/utils/dateTimeUtils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export const ApontamentoDiarioChart = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'diario' | 'ultimos7' | 'ultimos15' | 'ultimos30' | 'projecao7'>('ultimos30');
  const [selectedOF, setSelectedOF] = useState<string | null>(null);
  const [showRelatorio, setShowRelatorio] = useState(false);
  const [showRelatorioAnterior, setShowRelatorioAnterior] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  const { data: dadosProcessados, effectiveDate, loading, error } = useApontamentoDiarioChart(selectedPeriod);
  
  // Usar a data efetiva do gráfico para o relatório do dia
  const { apontamentos, resumoProcessos, loading: loadingRelatorio } = useRelatorioDiario(effectiveDate);
  
  // Usar a data selecionada para o relatório anterior - corrigir o formato
  const selectedDateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const { apontamentos: apontamentosAnteriores, resumoProcessos: resumoProcessosAnteriores, loading: loadingRelatorioAnterior } = useRelatorioDiario(selectedDateString);

  console.log('ApontamentoDiarioChart - effectiveDate:', effectiveDate);
  console.log('ApontamentoDiarioChart - selectedDate objeto:', selectedDate);
  console.log('ApontamentoDiarioChart - selectedDateString formatado:', selectedDateString);
  console.log('ApontamentoDiarioChart - selectedPeriod:', selectedPeriod);

  // Obter todas as OFs únicas para a legenda
  const ofsUnicas = useMemo(() => {
    const ofs = new Set<string>();
    dadosProcessados.forEach(item => {
      item.ofs.forEach(ofData => {
        ofs.add(ofData.ofNumber);
      });
    });
    return Array.from(ofs).sort();
  }, [dadosProcessados]);

  // Calcular valor máximo e gerar escala Y otimizada
  const { valorMaximo, linhasGrid } = useMemo(() => {
    const maxTotal = Math.max(...dadosProcessados.map(item => item.total), 0);
    
    if (maxTotal === 0) {
      return { valorMaximo: 0, linhasGrid: [] };
    }
    
    // Encontrar um valor máximo "bonito" baseado no maior valor
    let escala = 1000; // Começar com 1000kg
    let valorMaximo = Math.ceil(maxTotal / escala) * escala;
    
    // Se o valor for muito grande, usar escalas maiores
    if (maxTotal > 50000) {
      escala = 10000;
      valorMaximo = Math.ceil(maxTotal / escala) * escala;
    } else if (maxTotal > 10000) {
      escala = 5000;
      valorMaximo = Math.ceil(maxTotal / escala) * escala;
    }
    
    // Garantir que temos pelo menos 5 divisões
    const numeroDivisoes = Math.max(5, Math.floor(valorMaximo / escala));
    const intervalo = valorMaximo / numeroDivisoes;
    
    const linhas = Array.from({ length: numeroDivisoes + 1 }, (_, i) => ({
      valor: Math.round(i * intervalo),
      porcentagem: (i / numeroDivisoes) * 100
    }));
    
    return { valorMaximo, linhasGrid: linhas };
  }, [dadosProcessados]);

  // Cores para cada OF
  const coresOF = {
    'B114': 'bg-blue-500',
    'B117': 'bg-amber-500', 
    'B118': 'bg-emerald-500',
    'B119': 'bg-purple-500',
    'B120': 'bg-pink-500',
    'B121': 'bg-indigo-500',
    'B122': 'bg-cyan-500',
    'B123': 'bg-teal-500',
    'B124': 'bg-lime-500',
    'B125': 'bg-red-500',
  };

  const getCorOF = (ofNumber: string) => {
    return coresOF[ofNumber as keyof typeof coresOF] || 'bg-gray-500';
  };

  const buttons = [
    { key: 'diario', label: 'Diário' },
    { key: 'ultimos7', label: 'Últ. 7 dias' },
    { key: 'ultimos15', label: 'Últ. 15 dias' },
    { key: 'ultimos30', label: 'Últ. 30 dias' },
    { key: 'projecao7', label: 'Média Próx. 7 dias' },
  ];

  // Filtrar dados por OF selecionada
  const dadosFiltrados = useMemo(() => {
    if (!selectedOF) return dadosProcessados;
    
    return dadosProcessados.map(item => ({
      ...item,
      ofs: item.ofs.filter(ofData => ofData.ofNumber === selectedOF),
      total: item.ofs.filter(ofData => ofData.ofNumber === selectedOF).reduce((sum, ofData) => sum + ofData.peso, 0)
    })).filter(item => item.total > 0);
  }, [dadosProcessados, selectedOF]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-foreground">Apontamento Diário da Produção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando dados...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-foreground">Apontamento Diário da Produção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Tentar novamente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-foreground">Apontamento Diário da Produção</CardTitle>
          <div className="flex flex-wrap gap-2 mt-4">
            {buttons.map((button) => (
              <Button
                key={button.key}
                variant={selectedPeriod === button.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod(button.key as any)}
                className="text-xs md:text-sm"
              >
                {button.label}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRelatorio(true)}
              className="text-xs md:text-sm"
            >
              <FileText className="h-3 w-3 mr-1" />
              Registros do Dia
            </Button>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs md:text-sm"
                >
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  Registros Anteriores
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    console.log('Data selecionada no calendário (objeto Date):', date);
                    console.log('Data selecionada formatada:', date ? format(date, 'yyyy-MM-dd') : 'undefined');
                    setSelectedDate(date);
                    setCalendarOpen(false);
                    if (date) {
                      setShowRelatorioAnterior(true);
                    }
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          {effectiveDate && (
            <div className="mt-2 text-sm text-muted-foreground">
              Data de referência: {formatBrazilianDateFromString(effectiveDate)}
            </div>
          )}
          {ofsUnicas.length > 0 && (
            <div className="mt-2 text-sm text-muted-foreground">
              OFs com dados no período: {ofsUnicas.join(', ')}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Legenda interativa */}
          <div className="flex justify-center flex-wrap gap-4 mb-8">
            {ofsUnicas.map((ofNumber) => (
              <button
                key={ofNumber}
                onClick={() => setSelectedOF(selectedOF === ofNumber ? null : ofNumber)}
                className={`flex items-center gap-2 px-3 py-1 rounded-md transition-all ${
                  selectedOF === ofNumber 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
              >
                <div className={`w-4 h-4 rounded-sm ${getCorOF(ofNumber)}`} />
                <span className="text-sm font-medium">OF {ofNumber}</span>
              </button>
            ))}
            {selectedOF && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedOF(null)}
                className="text-xs"
              >
                Todas OFs
              </Button>
            )}
          </div>

          {/* Gráfico de barras empilhadas com eixo Y otimizado */}
          <div className="relative overflow-x-auto pb-4">
            <div className="flex min-w-fit">
              {/* Eixo Y - apenas nas linhas horizontais */}
              <div className="relative w-16 h-80 mr-4">
                {/* Linhas horizontais com valores */}
                {linhasGrid.slice().reverse().map((linha) => (
                  <div 
                    key={linha.valor} 
                    className="absolute right-0 flex items-center"
                    style={{ bottom: `${linha.porcentagem}%`, transform: 'translateY(50%)' }}
                  >
                    <span className="text-xs text-muted-foreground mr-2">
                      {linha.valor >= 1000 ? `${(linha.valor/1000).toFixed(0)}t` : `${linha.valor}kg`}
                    </span>
                    <div className="w-2 h-px bg-border"></div>
                  </div>
                ))}
                
                {/* Label do eixo Y */}
                <div className="absolute -left-4 top-1/2 -rotate-90 text-xs text-muted-foreground whitespace-nowrap">
                  Peso (Kg)
                </div>
              </div>
              
              {/* Grid lines horizontais */}
              <div className="absolute left-16 top-0 right-0 h-80 pointer-events-none">
                {linhasGrid.map((linha) => (
                  <div 
                    key={linha.valor}
                    className="absolute w-full border-t border-dashed border-muted-foreground/20"
                    style={{ bottom: `${linha.porcentagem}%` }}
                  />
                ))}
              </div>

              {/* Barras */}
              <div className="flex justify-around items-end text-center flex-1 gap-4 relative z-10">
                {dadosFiltrados.map((item) => {
                  const alturaTotal = valorMaximo > 0 ? (item.total / valorMaximo) * 100 : 0;
                  
                  return (
                    <div key={item.processo} className="flex flex-col items-center px-2 min-w-16">
                      {/* Valor total no topo */}
                      <div className="text-sm font-bold text-foreground mb-1 h-6">
                        {item.total > 0 ? `${item.total.toLocaleString('pt-BR')} Kg` : ''}
                      </div>
                      
                      {/* Barra empilhada */}
                      <div 
                        className="relative flex flex-col-reverse w-12 bg-muted border border-border rounded-sm overflow-hidden"
                        style={{ height: '288px' }} // 72 * 4 = altura fixa para o container
                      >
                        {item.ofs.map((ofData, index) => {
                          const alturaSegmento = alturaTotal > 0 ? (ofData.percentage / 100) * alturaTotal : 0;
                          const alturaPixels = (alturaSegmento / 100) * 288; // Converter para pixels
                          
                          return (
                            <div
                              key={`${ofData.ofNumber}-${index}`}
                              className={`w-full transition-all duration-300 cursor-pointer hover:opacity-85 flex items-center justify-center text-white text-xs font-semibold text-shadow ${getCorOF(ofData.ofNumber)}`}
                              style={{ height: `${alturaPixels}px` }}
                              title={`OF ${ofData.ofNumber}: ${ofData.peso.toLocaleString('pt-BR')} Kg`}
                            >
                              {alturaPixels > 20 && (
                                <span className="transform rotate-90 whitespace-nowrap">
                                  {ofData.peso > 999 ? `${Math.round(ofData.peso/1000)}t` : `${ofData.peso}kg`}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Nome do processo */}
                      <div className="mt-2 text-sm font-semibold text-muted-foreground">
                        {item.processo}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {dadosFiltrados.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum dado encontrado para o período selecionado</p>
              <p className="text-sm mt-2">
                Experimente selecionar um período mais amplo como "Últimos 30 dias"
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <RelatorioDiarioModal
        isOpen={showRelatorio}
        onClose={() => setShowRelatorio(false)}
        apontamentos={apontamentos}
        resumoProcessos={resumoProcessos}
        loading={loadingRelatorio}
        selectedDate={effectiveDate}
      />

      <RelatorioDiarioModal
        isOpen={showRelatorioAnterior}
        onClose={() => setShowRelatorioAnterior(false)}
        apontamentos={apontamentosAnteriores}
        resumoProcessos={resumoProcessosAnteriores}
        loading={loadingRelatorioAnterior}
        selectedDate={selectedDateString}
      />
    </>
  );
};
