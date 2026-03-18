
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Calendar as CalendarIcon, Filter, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ApontamentosFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filterOF: string;
  filterFase: string;
  filterProcesso: string;
  dataInicio: Date | undefined;
  dataFim: Date | undefined;
  setDataInicio: (date: Date | undefined) => void;
  setDataFim: (date: Date | undefined) => void;
  uniqueOFs: string[];
  uniqueFases: string[];
  uniqueProcessos: string[];
  handleOFChange: (value: string) => void;
  handleFaseChange: (value: string) => void;
  handleProcessoChange: (value: string) => void;
  clearFilters: () => void;
}

export const ApontamentosFilters: React.FC<ApontamentosFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  filterOF,
  filterFase,
  filterProcesso,
  dataInicio,
  dataFim,
  setDataInicio,
  setDataFim,
  uniqueOFs,
  uniqueFases,
  uniqueProcessos,
  handleOFChange,
  handleFaseChange,
  handleProcessoChange,
  clearFilters
}) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filtros Inteligentes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primeira linha de filtros - mais compacta */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium">Buscar</label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="OF, Marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">OF</label>
            <Select value={filterOF || 'all'} onValueChange={handleOFChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as OFs</SelectItem>
                {uniqueOFs.map((of) => (
                  <SelectItem key={of} value={of}>{of}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Fase</label>
            <Select value={filterFase || 'all'} onValueChange={handleFaseChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as fases</SelectItem>
                {uniqueFases.map((fase) => (
                  <SelectItem key={fase} value={fase}>{fase}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Processo</label>
            <Select value={filterProcesso || 'all'} onValueChange={handleProcessoChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os processos</SelectItem>
                {uniqueProcessos.map((processo) => (
                  <SelectItem key={processo} value={processo}>{processo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button variant="outline" onClick={clearFilters} className="h-8 text-xs">
              <RefreshCw className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          </div>
        </div>

        {/* Segunda linha - filtros de data */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium">Data Início</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-8 justify-start text-left font-normal text-xs",
                    !dataInicio && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataInicio}
                  onSelect={setDataInicio}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Data Fim</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-8 justify-start text-left font-normal text-xs",
                    !dataFim && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {dataFim ? format(dataFim, "dd/MM/yyyy") : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataFim}
                  onSelect={setDataFim}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            {filterOF || filterFase || filterProcesso || dataInicio || dataFim ? 
              'Filtros aplicados automaticamente baseados no último uso' : 
              'Use os filtros para otimizar a visualização'
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
