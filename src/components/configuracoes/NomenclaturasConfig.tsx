import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Building2, 
  Settings2, 
  Layers, 
  Hash, 
  Sparkles, 
  RotateCcw, 
  Save, 
  CheckCircle2, 
  FileSpreadsheet,
  Tag
} from 'lucide-react';
import { useAppLabels } from '@/hooks/useAppLabels';
import { AppLabelsConfig, PRESETS_EMPRESAS } from '@/contexts/AppLabelsContext';

export const NomenclaturasConfig: React.FC = () => {
  const { labels, updateLabels, resetLabels, formatTag, isComponente } = useAppLabels();
  const [formData, setFormData] = useState<AppLabelsConfig>({ ...labels });
  const [selectedPreset, setSelectedPreset] = useState<string>('baldon_engemetal');

  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = PRESETS_EMPRESAS.find(p => p.id === presetId);
    if (preset) {
      setFormData({ ...preset.config });
      toast.info(`Preset carregado: ${preset.nome}`);
    }
  };

  const handleSave = () => {
    updateLabels(formData);
    toast.success('Configurações de identificação e nomenclaturas salvas com sucesso!');
  };

  const handleReset = () => {
    resetLabels();
    const defaultPreset = PRESETS_EMPRESAS[0];
    setFormData({ ...defaultPreset.config });
    setSelectedPreset('baldon_engemetal');
    toast.info('Restaurado para o padrão de fábrica da Baldon Engemetal.');
  };

  // Live preview examples
  const sampleOF = 'B134';
  const sampleFase = '13';
  const samplePeca = '1';
  const sampleComp = '1000';

  const previewPecaTag = formData.marcaFormato === 'peca_direto' 
    ? samplePeca 
    : formData.marcaFormato === 'fase_peca' 
      ? `${sampleFase}-${samplePeca}` 
      : `${sampleOF}-${sampleFase}-${samplePeca}`;

  const previewCompTag = formData.marcaFormato === 'peca_direto' 
    ? sampleComp 
    : formData.marcaFormato === 'fase_peca' 
      ? `${sampleFase}-${sampleComp}` 
      : `${sampleOF}-${sampleFase}-${sampleComp}`;

  return (
    <Card className="bg-white border-slate-300 shadow-sm dark:bg-slate-800/50 dark:border-slate-700">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl text-foreground flex items-center gap-2">
                Nomenclaturas & Identificação da Fábrica
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700">
                  Universal
                </Badge>
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Personalize os termos de OF, Fases, Peças e regras de numeração de componentes para qualquer empresa.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-slate-600 border-slate-300 hover:bg-slate-100 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Restaurar Baldon
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
            >
              <Save className="w-4 h-4 mr-1.5" />
              Salvar Alterações
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-2">
        {/* Seletor de Perfis / Modelos de Empresas */}
        <div className="p-4 rounded-xl border border-blue-200/80 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <Label className="text-sm font-semibold text-slate-900 dark:text-white">
                Perfil de Fábrica Selecionado
              </Label>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Modelos pré-configurados prontos para uso
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {PRESETS_EMPRESAS.map(preset => {
              const isSelected = selectedPreset === preset.id || formData.empresaNome === preset.config.empresaNome;
              return (
                <div
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  className={`cursor-pointer p-3 rounded-lg border transition-all text-left relative ${
                    isSelected
                      ? 'bg-white border-blue-500 shadow-sm ring-2 ring-blue-500/20 dark:bg-slate-800 dark:border-blue-400'
                      : 'bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300 dark:bg-slate-800/40 dark:border-slate-700 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      {preset.nome}
                    </span>
                    {preset.isPadrao && (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px] px-1.5 py-0 border border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300">
                        Ativa
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {preset.descricao}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Formulário de Campos e Nomenclaturas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Nome da Empresa */}
          <div className="space-y-1.5 lg:col-span-2">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nome da Empresa / Fábrica
            </Label>
            <Input
              value={formData.empresaNome || ''}
              onChange={e => setFormData(prev => ({ ...prev, empresaNome: e.target.value }))}
              placeholder="Ex: Baldon Engemetal"
              className="bg-white border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>

          {/* Formato da Tag da Peça */}
          <div className="space-y-1.5 lg:col-span-2">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Estrutura da Tag das Peças / Marcas
            </Label>
            <Select
              value={formData.marcaFormato}
              onValueChange={(val: any) => setFormData(prev => ({ ...prev, marcaFormato: val }))}
            >
              <SelectTrigger className="bg-white border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-300 dark:bg-slate-800 dark:border-slate-700">
                <SelectItem value="of_fase_peca">OF-Fase-Peça (Padrão: B134-13-1)</SelectItem>
                <SelectItem value="fase_peca">Fase-Peça (Ex: 13-1)</SelectItem>
                <SelectItem value="peca_direto">Peça Direto / Marca Única (Ex: 1)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ordem de Fabricação (OF) */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Identificador da Ordem
              </span>
            </div>
            <div className="space-y-2">
              <div>
                <Label className="text-[11px] text-slate-500">Nome Singular</Label>
                <Input
                  value={formData.ofLabel}
                  onChange={e => setFormData(prev => ({ ...prev, ofLabel: e.target.value }))}
                  placeholder="OF, OC, Contrato..."
                  className="h-8 text-sm bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-500">Nome Plural</Label>
                <Input
                  value={formData.ofPlural}
                  onChange={e => setFormData(prev => ({ ...prev, ofPlural: e.target.value }))}
                  placeholder="OFs, OCs, Contratos..."
                  className="h-8 text-sm bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Fases / Etapas */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Divisão de Fases
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500">Usa Fases</span>
                <Switch
                  checked={formData.temFases}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, temFases: checked }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <Label className="text-[11px] text-slate-500">Nome Singular</Label>
                <Input
                  value={formData.faseLabel}
                  disabled={!formData.temFases}
                  onChange={e => setFormData(prev => ({ ...prev, faseLabel: e.target.value }))}
                  placeholder="Fase, Etapa, Lote..."
                  className="h-8 text-sm bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-500">Nome Plural</Label>
                <Input
                  value={formData.fasePlural}
                  disabled={!formData.temFases}
                  onChange={e => setFormData(prev => ({ ...prev, fasePlural: e.target.value }))}
                  placeholder="Fases, Etapas, Lotes..."
                  className="h-8 text-sm bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Peças / Marcas */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Peça Principal / Conjunto
              </span>
            </div>
            <div className="space-y-2">
              <div>
                <Label className="text-[11px] text-slate-500">Nome Singular</Label>
                <Input
                  value={formData.pecaLabel}
                  onChange={e => setFormData(prev => ({ ...prev, pecaLabel: e.target.value }))}
                  placeholder="Peça, Marca, Conjunto..."
                  className="h-8 text-sm bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-500">Nome Plural</Label>
                <Input
                  value={formData.pecaPlural}
                  onChange={e => setFormData(prev => ({ ...prev, pecaPlural: e.target.value }))}
                  placeholder="Peças, Marcas, Conjuntos..."
                  className="h-8 text-sm bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Componentes / Acessórios */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Subitens / Componentes
              </span>
            </div>
            <div className="space-y-2">
              <div>
                <Label className="text-[11px] text-slate-500">Nome Singular</Label>
                <Input
                  value={formData.componenteLabel}
                  onChange={e => setFormData(prev => ({ ...prev, componenteLabel: e.target.value }))}
                  placeholder="Componente, Acessório..."
                  className="h-8 text-sm bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-500">Faixa Inicial (Numeração)</Label>
                <Input
                  type="number"
                  value={formData.faixaComponenteMin}
                  onChange={e => setFormData(prev => ({ ...prev, faixaComponenteMin: parseInt(e.target.value, 10) || 1000 }))}
                  placeholder="1000"
                  className="h-8 text-sm bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pré-visualização Dinâmica */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              Simulação de Visualização no Sistema ({formData.empresaNome || 'Sua Empresa'})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 block mb-1">
                {formData.pecaLabel} Principal (Exemplo):
              </span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                  {previewPecaTag}
                </span>
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300">
                  {formData.pecaLabel}
                </Badge>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 block mb-1">
                {formData.componenteLabel} (Exemplo):
              </span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                  {previewCompTag}
                </span>
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300">
                  {formData.componenteLabel} (&ge; {formData.faixaComponenteMin})
                </Badge>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700 sm:col-span-2 md:col-span-1">
              <span className="text-[11px] text-slate-500 block mb-1">
                Tabela e Filtros:
              </span>
              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                {formData.ofLabel} / {formData.faseLabel} / {formData.pecaLabel} / {formData.componenteLabel}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
