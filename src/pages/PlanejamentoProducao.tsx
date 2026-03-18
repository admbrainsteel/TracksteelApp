
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarClock, Package, Save } from 'lucide-react';
import { usePecas, Peca } from '@/hooks/usePecas';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const PRIORIDADES = [
  { value: 'P1', label: 'P1 - Alta', color: 'bg-orange-900 text-white' },
  { value: 'P2', label: 'P2 - Média-Alta', color: 'bg-orange-700 text-white' },
  { value: 'P3', label: 'P3 - Média-Baixa', color: 'bg-orange-400 text-black' },
  { value: 'P4', label: 'P4 - Baixa', color: 'bg-orange-100 text-black' },
];

const getPrioridadeColor = (prioridade: string) => {
  const prioridadeObj = PRIORIDADES.find(p => p.value === prioridade);
  return prioridadeObj?.color || 'bg-orange-100 text-black';
};

export default function PlanejamentoProducao() {
  const { pecas, loading, updatePeca } = usePecas();
  const [selectedPecas, setSelectedPecas] = useState<Set<string>>(new Set());
  const [prioridadeLote, setPrioridadeLote] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const handleSelectPeca = (pecaId: string, checked: boolean) => {
    const newSelected = new Set(selectedPecas);
    if (checked) {
      newSelected.add(pecaId);
    } else {
      newSelected.delete(pecaId);
    }
    setSelectedPecas(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPecas(new Set(pecas.map(p => p.id)));
    } else {
      setSelectedPecas(new Set());
    }
  };

  const handlePrioridadeChange = async (pecaId: string, prioridade: string) => {
    try {
      const peca = pecas.find(p => p.id === pecaId);
      if (!peca) return;

      const { error } = await supabase
        .from('pecas')
        .update({ prioridade })
        .eq('id', pecaId);

      if (error) throw error;
      
      toast.success('Prioridade atualizada com sucesso!');
      // A atualização será refletida através do hook usePecas
    } catch (error) {
      console.error('Erro ao atualizar prioridade:', error);
      toast.error('Erro ao atualizar prioridade');
    }
  };

  const handleDefinirPrioridadeLote = async () => {
    if (selectedPecas.size === 0) {
      toast.error('Selecione pelo menos uma peça');
      return;
    }

    if (!prioridadeLote) {
      toast.error('Selecione uma prioridade');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('pecas')
        .update({ prioridade: prioridadeLote })
        .in('id', Array.from(selectedPecas));

      if (error) throw error;

      toast.success(`Prioridade ${prioridadeLote} definida para ${selectedPecas.size} peças`);
      setSelectedPecas(new Set());
      setPrioridadeLote('');
    } catch (error) {
      console.error('Erro ao definir prioridade do lote:', error);
      toast.error('Erro ao definir prioridade do lote');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-white">Carregando planejamento...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Planejamento de Produção</h1>
            <p className="text-slate-400">Defina prioridades para as peças na cadeia produtiva</p>
          </div>
          <Badge variant="secondary" className="bg-slate-700 text-slate-300 border-slate-600">
            {pecas.length} {pecas.length === 1 ? 'peça' : 'peças'}
          </Badge>
        </div>

        {/* Controles de Prioridade em Lote */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Definir Prioridade em Lote
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Select value={prioridadeLote} onValueChange={setPrioridadeLote}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Selecione uma prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map(prioridade => (
                      <SelectItem key={prioridade.value} value={prioridade.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded ${prioridade.color}`}></div>
                          {prioridade.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleDefinirPrioridadeLote}
                disabled={saving || selectedPecas.size === 0 || !prioridadeLote}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : `Definir para ${selectedPecas.size} peças`}
              </Button>
            </div>
            
            <div className="text-sm text-slate-400">
              Selecione as peças na tabela abaixo e escolha uma prioridade para aplicar em lote
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Peças */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="h-5 w-5" />
              Peças Cadastradas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-700/50">
                    <TableHead className="text-slate-300 w-12">
                      <Checkbox
                        checked={selectedPecas.size === pecas.length && pecas.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-slate-300">OF</TableHead>
                    <TableHead className="text-slate-300">Fase</TableHead>
                    <TableHead className="text-slate-300">Marca</TableHead>
                    <TableHead className="text-slate-300">Descrição</TableHead>
                    <TableHead className="text-slate-300">Quantidade</TableHead>
                    <TableHead className="text-slate-300">Peso Total</TableHead>
                    <TableHead className="text-slate-300">Prioridade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pecas.map((peca) => (
                    <TableRow key={peca.id} className="border-slate-700 hover:bg-slate-700/30">
                      <TableCell>
                        <Checkbox
                          checked={selectedPecas.has(peca.id)}
                          onCheckedChange={(checked) => handleSelectPeca(peca.id, checked === true)}
                        />
                      </TableCell>
                      <TableCell className="text-slate-300 font-medium">{peca.of_number}</TableCell>
                      <TableCell className="text-slate-300">{peca.etapa_fase || '-'}</TableCell>
                      <TableCell className="text-slate-300 font-medium">{peca.marca}</TableCell>
                      <TableCell className="text-slate-300">{peca.descricao || '-'}</TableCell>
                      <TableCell className="text-slate-300 text-center">{peca.quantidade}</TableCell>
                      <TableCell className="text-slate-300 text-right">{Math.round(peca.peso_total || 0)} kg</TableCell>
                      <TableCell>
                        <Select 
                          value={peca.prioridade || 'P4'} 
                          onValueChange={(value) => handlePrioridadeChange(peca.id, value)}
                        >
                          <SelectTrigger className="w-32 bg-slate-700 border-slate-600">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORIDADES.map(prioridade => (
                              <SelectItem key={prioridade.value} value={prioridade.value}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded ${prioridade.color}`}></div>
                                  {prioridade.value}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Legenda de Prioridades */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Legenda de Prioridades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {PRIORIDADES.map(prioridade => (
                <div key={prioridade.value} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded ${prioridade.color}`}></div>
                  <span className="text-slate-300">{prioridade.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
