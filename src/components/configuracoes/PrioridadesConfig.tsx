
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { usePrioridades, PrioridadeConfig } from '@/hooks/usePrioridades';
import { Palette, Save } from 'lucide-react';

export const PrioridadesConfig = () => {
  const { prioridades, loading, updatePrioridade } = usePrioridades();
  const [editingPrioridades, setEditingPrioridades] = useState<Record<string, Partial<PrioridadeConfig>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const handleInputChange = (prioridadeId: string, field: string, value: string) => {
    setEditingPrioridades(prev => ({
      ...prev,
      [prioridadeId]: {
        ...prev[prioridadeId],
        [field]: value
      }
    }));
  };

  const handleSave = async (prioridade: PrioridadeConfig) => {
    const updates = editingPrioridades[prioridade.id];
    if (!updates || Object.keys(updates).length === 0) return;

    setSaving(prioridade.id);
    const success = await updatePrioridade(prioridade.id, updates);
    
    if (success) {
      setEditingPrioridades(prev => {
        const newState = { ...prev };
        delete newState[prioridade.id];
        return newState;
      });
    }
    setSaving(null);
  };

  const getCurrentValue = (prioridade: PrioridadeConfig, field: keyof PrioridadeConfig) => {
    return editingPrioridades[prioridade.id]?.[field] ?? prioridade[field];
  };

  const hasChanges = (prioridadeId: string) => {
    return editingPrioridades[prioridadeId] && Object.keys(editingPrioridades[prioridadeId]).length > 0;
  };

  if (loading) {
    return (
      <Card className="bg-white border-slate-300 shadow-sm dark:bg-slate-800/50 dark:border-slate-700">
        <CardContent className="p-6">
          <div className="text-muted-foreground">Carregando configurações de prioridade...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-slate-300 shadow-sm dark:bg-slate-800/50 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Configuração de Prioridades
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Configure os nomes e cores das prioridades das peças
        </p>
        
        <div className="space-y-4">
          {prioridades.map((prioridade) => (
            <div
              key={prioridade.id}
              className="flex items-center gap-4 p-4 rounded-lg border bg-slate-50 border-slate-200 dark:bg-slate-700/50 dark:border-slate-600"
            >
              <div className="flex-shrink-0">
                <Badge 
                  className="text-white font-medium"
                  style={{ backgroundColor: getCurrentValue(prioridade, 'cor') as string }}
                >
                  {prioridade.codigo}
                </Badge>
              </div>
              
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground text-sm">Nome</Label>
                  <Input
                    value={getCurrentValue(prioridade, 'nome') as string}
                    onChange={(e) => handleInputChange(prioridade.id, 'nome', e.target.value)}
                    className="bg-white border-slate-300 text-slate-900 dark:bg-slate-600 dark:border-slate-500 dark:text-white"
                    placeholder="Nome da prioridade"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-foreground text-sm">Cor</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={getCurrentValue(prioridade, 'cor') as string}
                      onChange={(e) => handleInputChange(prioridade.id, 'cor', e.target.value)}
                      className="w-16 h-10 bg-white border-slate-300 cursor-pointer dark:bg-slate-600 dark:border-slate-500"
                    />
                    <Input
                      value={getCurrentValue(prioridade, 'cor') as string}
                      onChange={(e) => handleInputChange(prioridade.id, 'cor', e.target.value)}
                      className="bg-white border-slate-300 text-slate-900 dark:bg-slate-600 dark:border-slate-500 dark:text-white"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex-shrink-0">
                {hasChanges(prioridade.id) && (
                  <Button
                    onClick={() => handleSave(prioridade)}
                    disabled={saving === prioridade.id}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {saving === prioridade.id ? 'Salvando...' : 'Salvar'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
