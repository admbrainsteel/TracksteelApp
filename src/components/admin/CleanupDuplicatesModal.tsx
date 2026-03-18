
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, AlertTriangle, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CleanupDuplicatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DuplicateGroup {
  chave_agrupamento: string;
  of_number: string;
  marca: string;
  etapa_fase: string;
  processo_nome: string;
  quantidade_total_peca: number;
  apontamentos: Array<{
    id: string;
    data_apontamento: string;
    created_at: string;
    quantidade_produzida: number;
    tipo_apontamento: string;
  }>;
  total_apontado: number;
  excesso: number;
}

export const CleanupDuplicatesModal: React.FC<CleanupDuplicatesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [ofNumber, setOfNumber] = useState('');
  const [duplicatesData, setDuplicatesData] = useState<{
    duplicatesFound: boolean;
    details: DuplicateGroup[];
    totalGroups: number;
    groupsWithDuplicates: number;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const analyzeOF = async () => {
    if (!ofNumber.trim()) {
      toast.error('Por favor, informe o número da OF');
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-duplicates', {
        body: { 
          of_number: ofNumber.trim(),
          action: 'analyze' // Apenas analisar, não executar limpeza
        }
      });

      if (error) throw error;

      setDuplicatesData({
        duplicatesFound: data.groupsWithDuplicates > 0,
        details: data.details || [],
        totalGroups: data.totalGroups || 0,
        groupsWithDuplicates: data.groupsWithDuplicates || 0
      });

      if (data.groupsWithDuplicates === 0) {
        toast.success('Nenhuma duplicata encontrada para esta OF!');
      } else {
        toast.info(`Encontradas ${data.groupsWithDuplicates} duplicatas para análise`);
      }
    } catch (error) {
      console.error('Erro ao analisar duplicatas:', error);
      toast.error('Erro ao analisar duplicatas');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeCleaning = async () => {
    setIsCleaning(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-duplicates', {
        body: { 
          of_number: ofNumber.trim(),
          action: 'execute' // Executar limpeza
        }
      });

      if (error) throw error;

      toast.success(`Limpeza concluída! ${data.duplicatesRemoved} duplicatas removidas.`);
      
      // Resetar dados após limpeza
      setDuplicatesData(null);
      setOfNumber('');
    } catch (error) {
      console.error('Erro ao executar limpeza:', error);
      toast.error('Erro ao executar limpeza de duplicatas');
    } finally {
      setIsCleaning(false);
    }
  };

  const handleClose = () => {
    setDuplicatesData(null);
    setOfNumber('');
    onClose();
  };

  const groupedByPhase = duplicatesData?.details.reduce((acc, group) => {
    const phase = group.etapa_fase;
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(group);
    return acc;
  }, {} as Record<string, DuplicateGroup[]>) || {};

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Limpeza de Duplicatas de Apontamentos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input para OF */}
          <div className="flex gap-2">
            <Input
              placeholder="Digite o número da OF (ex: B117)"
              value={ofNumber}
              onChange={(e) => setOfNumber(e.target.value.toUpperCase())}
              className="flex-1"
            />
            <Button 
              onClick={analyzeOF}
              disabled={isAnalyzing || !ofNumber.trim()}
              className="flex items-center gap-2"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Analisar
            </Button>
          </div>

          {/* Resultados da análise */}
          {duplicatesData && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Resumo da Análise - OF {ofNumber}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {duplicatesData.totalGroups}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Grupos Analisados
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {duplicatesData.groupsWithDuplicates}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Com Duplicatas
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {duplicatesData.details.reduce((sum, g) => sum + g.apontamentos.length - 1, 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Registros a Remover
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detalhes por fase */}
              {duplicatesData.duplicatesFound && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Duplicatas Encontradas por Fase:</h3>
                  
                  {Object.entries(groupedByPhase).map(([phase, groups]) => (
                    <Card key={phase}>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          Fase {phase}
                          <Badge variant="destructive">
                            {groups.length} duplicatas
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {groups.map((group, index) => (
                            <div key={index} className="border rounded-lg p-3 bg-muted/30">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-medium">
                                    Marca: {group.marca} | Processo: {group.processo_nome}
                                  </h4>
                                  <div className="text-sm text-muted-foreground">
                                    Quantidade da Peça: {group.quantidade_total_peca} | 
                                    Total Apontado: {group.total_apontado}
                                    {group.excesso > 0 && (
                                      <span className="text-red-600 font-medium">
                                        {' '}| Excesso: +{group.excesso}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Badge variant="outline">
                                  {group.apontamentos.length} apontamentos
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {group.apontamentos.map((apt, aptIndex) => (
                                  <div 
                                    key={aptIndex} 
                                    className={`p-2 rounded text-xs border ${
                                      aptIndex === 0 
                                        ? 'bg-green-50 border-green-200' 
                                        : 'bg-red-50 border-red-200'
                                    }`}
                                  >
                                    <div className="font-medium">
                                      {aptIndex === 0 ? '✅ Manter' : '🗑️ Remover'}
                                    </div>
                                    <div>Data: {new Date(apt.data_apontamento).toLocaleDateString('pt-BR')}</div>
                                    <div>Qtd: {apt.quantidade_produzida}</div>
                                    <div>Criado: {new Date(apt.created_at).toLocaleDateString('pt-BR')}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Botão para executar limpeza */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={handleClose}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={executeCleaning}
                      disabled={isCleaning}
                      className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
                    >
                      {isCleaning ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Executar Limpeza Definitiva
                    </Button>
                  </div>
                </div>
              )}

              {!duplicatesData.duplicatesFound && (
                <Card>
                  <CardContent className="text-center py-8">
                    <div className="text-green-600 mb-2">✅</div>
                    <h3 className="font-medium mb-2">Nenhuma Duplicata Encontrada</h3>
                    <p className="text-muted-foreground">
                      A OF {ofNumber} está livre de duplicatas de apontamentos.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
