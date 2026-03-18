
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Edit3 } from 'lucide-react';

interface AlteracoesPopupProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function AlteracoesPopup({ formData, setFormData }: AlteracoesPopupProps) {
  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Edit3 className="w-4 h-4 mr-2" />
          Gerenciar Alterações
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alterações da Ordem de Fabricação</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Alteração de Custo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Alteração de Custo</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.alteracao_custo}
                onValueChange={(value) => handleChange('alteracao_custo', value)}
                className="flex flex-row space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sim" id="custo-sim" />
                  <Label htmlFor="custo-sim" className="text-xs">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nao" id="custo-nao" />
                  <Label htmlFor="custo-nao" className="text-xs">Não</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Alteração de Cronograma */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Alteração de Cronograma</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.alteracao_cronograma || ''}
                onChange={(e) => handleChange('alteracao_cronograma', e.target.value)}
                placeholder="Descreva as alterações no cronograma"
                className="min-h-[60px] text-xs"
              />
            </CardContent>
          </Card>

          {/* Alteração Descritivo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Alteração Descritivo</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.alteracao_descritivo || ''}
                onChange={(e) => handleChange('alteracao_descritivo', e.target.value)}
                placeholder="Alterações no descritivo"
                className="min-h-[60px] text-xs"
              />
            </CardContent>
          </Card>

          {/* Alteração Detalhamento Projeto */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Alteração Detalhamento Projeto</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.alteracao_detalh_projeto || ''}
                onChange={(e) => handleChange('alteracao_detalh_projeto', e.target.value)}
                placeholder="Alterações no detalhamento do projeto"
                className="min-h-[60px] text-xs"
              />
            </CardContent>
          </Card>

          {/* Alteração Material */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Alteração Material</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.alteracao_material || ''}
                onChange={(e) => handleChange('alteracao_material', e.target.value)}
                placeholder="Alterações nos materiais"
                className="min-h-[60px] text-xs"
              />
            </CardContent>
          </Card>

          {/* Alteração Desenho */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Alteração Desenho</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.alteracao_desenho || ''}
                onChange={(e) => handleChange('alteracao_desenho', e.target.value)}
                placeholder="Alterações nos desenhos"
                className="min-h-[60px] text-xs"
              />
            </CardContent>
          </Card>

          {/* Alteração Impacto */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Alteração Impacto</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.alteracao_impacto}
                onChange={(e) => handleChange('alteracao_impacto', e.target.value)}
                placeholder="Descreva o impacto das alterações"
                className="min-h-[80px] text-xs"
              />
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
