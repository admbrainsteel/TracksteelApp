
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Package } from 'lucide-react';
import { useApontamentosProducao } from '@/hooks/useApontamentosProducao';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const ApontamentosList = () => {
  const { apontamentos, loading } = useApontamentosProducao();
  const [filtroOF, setFiltroOF] = useState('');
  const [filtroProcesso, setFiltroProcesso] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [filtroPecaComponente, setFiltroPecaComponente] = useState('');

  const apontamentosFiltrados = apontamentos.filter(apt => {
    const matchOF = !filtroOF || apt.of_number.toLowerCase().includes(filtroOF.toLowerCase());
    const matchProcesso = !filtroProcesso || apt.processo?.nome.toLowerCase().includes(filtroProcesso.toLowerCase());
    const matchData = !filtroData || apt.data_apontamento.includes(filtroData);
    
    // Filtro por peça/componente - busca na marca da peça ou componente
    const matchPecaComponente = !filtroPecaComponente || 
      getMarcaExibida(apt).toLowerCase().includes(filtroPecaComponente.toLowerCase());
    
    return matchOF && matchProcesso && matchData && matchPecaComponente;
  });

  // Função para determinar a marca exibida baseada no tipo de apontamento
  const getMarcaExibida = (apontamento: any) => {
    if (apontamento.tipo_apontamento === 'componente' && apontamento.componente?.marca_componente) {
      return apontamento.componente.marca_componente;
    }
    if (apontamento.tipo_apontamento === 'peca' && apontamento.peca?.marca) {
      return apontamento.peca.marca;
    }
    return 'N/A';
  };

  // Função para calcular peso total baseado no tipo correto (peça ou componente)
  const calcularPesoTotal = (apontamento: any) => {
    let pesoUnitario = 0;
    
    if (apontamento.tipo_apontamento === 'componente' && apontamento.componente?.peso_unitario) {
      pesoUnitario = Number(apontamento.componente.peso_unitario);
    } else if (apontamento.tipo_apontamento === 'peca' && apontamento.peca?.peso_unitario) {
      pesoUnitario = Number(apontamento.peca.peso_unitario);
    }
    
    const quantidade = Number(apontamento.quantidade_produzida) || 0;
    const pesoTotal = pesoUnitario * quantidade;
    
    console.log(`Apontamento ${apontamento.id}: Tipo: ${apontamento.tipo_apontamento}, Peso unitário: ${pesoUnitario}, Quantidade: ${quantidade}, Peso total: ${pesoTotal}`);
    
    return pesoTotal.toFixed(3);
  };

  // Função para obter a descrição correta baseada no tipo
  const getDescricaoExibida = (apontamento: any) => {
    if (apontamento.tipo_apontamento === 'componente' && apontamento.componente?.descricao) {
      return apontamento.componente.descricao;
    }
    if (apontamento.tipo_apontamento === 'peca' && apontamento.peca?.descricao) {
      return apontamento.peca.descricao;
    }
    return '';
  };

  // Calcular totais para debug
  const pesoTotalApontamentos = apontamentosFiltrados.reduce((total, apt) => {
    return total + Number(calcularPesoTotal(apt));
  }, 0);

  console.log('Total de peso dos apontamentos filtrados:', pesoTotalApontamentos);

  if (loading) {
    return <div className="text-center py-8">Carregando apontamentos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="text-sm font-medium mb-2 block">OF</label>
              <Input
                placeholder="Filtrar por OF..."
                value={filtroOF}
                onChange={(e) => setFiltroOF(e.target.value)}
                className="h-8"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Processo</label>
              <Input
                placeholder="Filtrar por processo..."
                value={filtroProcesso}
                onChange={(e) => setFiltroProcesso(e.target.value)}
                className="h-8"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Data</label>
              <Input
                type="date"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
                className="h-8"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Peça/Componente</label>
              <Input
                placeholder="Filtrar por peça/componente..."
                value={filtroPecaComponente}
                onChange={(e) => setFiltroPecaComponente(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="flex flex-col items-start">
              <div className="text-xs text-muted-foreground">
                {apontamentosFiltrados.length} registros encontrados
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Peso total: {pesoTotalApontamentos.toFixed(3)} kg
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Apontamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Histórico de Apontamentos
            </div>
            <Badge variant="secondary">
              {apontamentosFiltrados.length} registros
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {apontamentosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum apontamento encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OF</TableHead>
                    <TableHead>Peça/Componente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Processo</TableHead>
                    <TableHead className="text-center">Quantidade</TableHead>
                    <TableHead className="text-center">Peso Unit. (kg)</TableHead>
                    <TableHead className="text-center">Peso Total (kg)</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apontamentosFiltrados.map((apontamento) => {
                    const pesoUnitario = apontamento.tipo_apontamento === 'componente' 
                      ? Number(apontamento.componente?.peso_unitario || 0)
                      : Number(apontamento.peca?.peso_unitario || 0);
                    
                    return (
                      <TableRow key={apontamento.id} className="h-9">
                        <TableCell className="font-medium py-1">
                          {apontamento.of_number}
                        </TableCell>
                        <TableCell className="py-1">
                          <div className="font-medium">
                            {getMarcaExibida(apontamento)}
                          </div>
                          {getDescricaoExibida(apontamento) && (
                            <div className="text-xs text-muted-foreground">
                              {getDescricaoExibida(apontamento)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-1">
                          <Badge variant={apontamento.tipo_apontamento === 'componente' ? 'secondary' : 'default'}>
                            {apontamento.tipo_apontamento === 'componente' ? 'Componente' : 'Peça'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1">
                          <Badge variant="outline">
                            {apontamento.processo?.nome || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium py-1">
                          {apontamento.quantidade_produzida}
                        </TableCell>
                        <TableCell className="text-center py-1">
                          {pesoUnitario.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-center font-medium py-1">
                          {calcularPesoTotal(apontamento)}
                        </TableCell>
                        <TableCell className="py-1">
                          {format(new Date(apontamento.data_apontamento), 'dd/MM/yyyy', {
                            locale: ptBR
                          })}
                        </TableCell>
                        <TableCell className="max-w-xs py-1">
                          <div className="text-sm text-muted-foreground truncate">
                            {apontamento.observacoes || '-'}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
