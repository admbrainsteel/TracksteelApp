import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Save, X, Download, FileText, RefreshCw } from 'lucide-react';
import { usePrompts } from '@/hooks/usePrompts';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const PromptsManager: React.FC = () => {
  const { prompts, loading, savePrompt, deletePrompt, downloadPromptAsJson, refreshPrompts } = usePrompts();
  const [showDialog, setShowDialog] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<any>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    content: ''
  });

  // Prompts atualizados baseados no processamento avançado
  const defaultPrompts = [
    {
      name: "Processamento Estruturas Metálicas - Peças com Componentes",
      content: `PROCESSAMENTO AVANÇADO DE PLANILHAS - ESTRUTURAS METÁLICAS

OBJETIVO: Converter dados de planilhas para CSV estruturado, identificando peças-mãe e seus componentes.

REGRAS DE IDENTIFICAÇÃO:

1. PEÇAS-MÃE:
   - Identificadas pela coluna "Marca" com valor preenchido
   - Extrair número da marca (último número após hífen)
   - Se não houver hífen, usar valor completo da marca

2. COMPONENTES:
   - Identificados pela coluna "Pos." (Posição)
   - Devem ter código numérico entre 1000-9999 no final
   - Formato típico: XXX-XXXX onde XXXX é 1000-9999
   - Pertencem à peça-mãe anterior na sequência

3. EXTRAÇÃO DE METADADOS DO NOME DO ARQUIVO:
   - Formato esperado: "OF_NUMBER-ETAPA_FASE.extensão"
   - Exemplo: "B117-1.xlsx" → OF: B117, Etapa: 1

4. MAPEAMENTO DE COLUNAS (buscar variações):
   - Marca: ['Marca', 'marca', 'MARCA']
   - Descrição: ['Descrição', 'Descricao', 'descrição', 'descricao', 'DESCRIÇÃO', 'DESCRICAO']
   - Quantidade: ['Qtde', 'Quantidade', 'qtde', 'quantidade', 'QTDE', 'QUANTIDADE']
   - Peso Unitário: ['P.Un.', 'PesoUnitario', 'Peso Unitário', 'peso_unitario', 'PESO_UNITARIO']
   - Peso Total: ['P.Tot.', 'PesoTotal', 'Peso Total', 'peso_total', 'PESO_TOTAL']
   - Material: ['Mat', 'Material', 'mat', 'material', 'MAT', 'MATERIAL']
   - Posição: ['Pos.', 'Pos', 'pos', 'POS']

5. ESTRUTURA CSV DE SAÍDA:
   Cabeçalho: of_number,etapa_fase,marca,descricao,quantidade,peso_unitario,peso_total,tratamento_superficial,material,perfil_principal,tem_componentes,marca_componente,descricao_componente,perfil_componente,peso_unitario_componente,quantidade_por_peca

6. LÓGICA DE PROCESSAMENTO:
   - Para peças SEM componentes: uma linha com tem_componentes=false
   - Para peças COM componentes: uma linha para cada componente com tem_componentes=true
   - Tratamento superficial sempre "-" (padrão)
   - Perfil principal = material da peça-mãe
   - Números formatados com 1 casa decimal

7. FORMATAÇÃO:
   - Números: converter vírgula para ponto, 1 casa decimal
   - Texto com vírgula: envolver em aspas duplas
   - Valores vazios: deixar em branco
   - Encoding: UTF-8 com BOM

EXEMPLO DE PROCESSAMENTO:
Entrada: B117-1.xlsx com peça B117-1-1 e componente B117-1-1-1001
Saída: B117,1,1-1,GAB,1,210.0,210.0,-,A36,A36,true,1001,CHAPA,A36,15.0,2`
    },
    {
      name: "Conversão Lista de Peças - Formato Detalhado",
      content: `Converta os dados da tabela para um formato CSV detalhado seguindo estas instruções:

1. ESTRUTURA DO CSV:
   - Primeira linha deve conter todos os cabeçalhos das colunas
   - Cada linha subsequente deve representar uma peça/item
   - Use vírgula como separador
   - Se uma célula estiver vazia, deixe em branco mas mantenha as vírgulas

2. COLUNAS OBRIGATÓRIAS (na ordem):
   - of_number (número da OF)
   - etapa_fase (fase da etapa)
   - marca (marca da peça)
   - descricao (descrição)
   - quantidade (quantidade)
   - peso_unitario (peso unitário)
   - peso_total (peso total)
   - tratamento_superficial (tratamento)
   - material (material)
   - perfil_principal (perfil principal)
   - tem_componentes (true/false)
   - marca_componente (marca do componente)
   - descricao_componente (descrição do componente)
   - perfil_componente (perfil do componente)
   - peso_unitario_componente (peso unitário do componente)
   - quantidade_por_peca (quantidade por peça)

3. FORMATAÇÃO:
   - Mantenha todos os dados originais
   - Para campos booleanos, use "true" ou "false"
   - Para campos numéricos, mantenha os valores como estão
   - Para campos de texto, mantenha exatamente como na tabela original
   - Se não houver componentes, deixe os campos de componente vazios

4. EXEMPLO DE SAÍDA:
   of_number,etapa_fase,marca,descricao,quantidade,peso_unitario,peso_total,tratamento_superficial,material,perfil_principal,tem_componentes,marca_componente,descricao_componente,perfil_componente,peso_unitario_componente,quantidade_por_peca
   B117,1,B117-1-1,GAB,1,210,3,,,A36,false,,,,,
   B117,1,B117-1-2,Ch 3,1,370,3,,,A36,false,,,,,`
    },
    {
      name: "Conversão Lista de Peças - Formato Simplificado",
      content: `Converta os dados da tabela para formato CSV seguindo estas diretrizes:

1. MANTER ESTRUTURA ORIGINAL:
   - Use exatamente os mesmos cabeçalhos da tabela importada
   - Mantenha a mesma ordem das colunas
   - Preserve todos os valores como estão na planilha

2. FORMATAÇÃO CSV:
   - Primeira linha: cabeçalhos separados por vírgula
   - Linhas seguintes: dados separados por vírgula
   - Campos vazios: deixar em branco mas manter vírgulas
   - Não adicionar aspas desnecessárias

3. TRATAMENTO DE DADOS:
   - Números: manter formato original
   - Texto: sem modificações
   - Campos vazios: representar como campo vazio (não "null" ou "undefined")

4. EXEMPLO:
   #,Marca,Pos.,Descrição,Qtde,Lar.,Esp.,Comp.,Mat.,P.Un.,P.Tot.
   1,-,-,-,-,-,-,-,-,-,416
   2,B117-1-1,B117-1-1,GAB,1,210,3,210,A36,1,1`
    }
  ];

  useEffect(() => {
    // Criar prompts padrão se não existirem
    const createDefaultPrompts = async () => {
      if (!loading && prompts.length === 0) {
        for (const defaultPrompt of defaultPrompts) {
          await savePrompt(defaultPrompt);
        }
        await refreshPrompts();
      }
    };

    createDefaultPrompts();
  }, [loading, prompts.length]);

  const handleEdit = (prompt: any) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      content: prompt.content
    });
    setShowDialog(true);
  };

  const handleAdd = () => {
    setEditingPrompt(null);
    setFormData({
      name: '',
      content: ''
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      toast.error('Nome e conteúdo são obrigatórios');
      return;
    }

    await savePrompt({
      id: editingPrompt?.id,
      name: formData.name,
      content: formData.content
    });

    setShowDialog(false);
    setFormData({ name: '', content: '' });
    setEditingPrompt(null);
  };

  const handleClose = () => {
    setShowDialog(false);
    setFormData({ name: '', content: '' });
    setEditingPrompt(null);
  };

  const handleDownload = (prompt: any) => {
    const filename = window.prompt('Nome do arquivo (sem extensão):', prompt.name.replace(/\s+/g, '_'));
    if (filename) {
      downloadPromptAsJson(prompt, `${filename}.json`);
    }
  };

  const handleCreateDefaultPrompts = async () => {
    for (const defaultPrompt of defaultPrompts) {
      await savePrompt(defaultPrompt);
    }
    await refreshPrompts();
    toast.success('Prompts padrão criados com sucesso!');
  };

  if (loading) {
    return <div className="animate-pulse">Carregando prompts...</div>;
  }

  return (
    <>
      <Card className="bg-slate-700/50 border-slate-600">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white text-lg">Gerenciar Prompts</CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={handleCreateDefaultPrompts}
              size="sm"
              variant="outline"
              className="bg-blue-600 hover:bg-blue-700 border-blue-500"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Criar Padrões
            </Button>
            <Button
              onClick={handleAdd}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Novo Prompt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {prompts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm mb-4">
                Nenhum prompt cadastrado
              </p>
              <Button
                onClick={handleCreateDefaultPrompts}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Prompts Padrão
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {prompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className={`p-4 rounded border cursor-pointer transition-colors ${
                    selectedPrompt?.id === prompt.id
                      ? 'bg-blue-800/50 border-blue-500'
                      : 'bg-slate-800/50 border-slate-600 hover:bg-slate-800/70'
                  }`}
                  onClick={() => setSelectedPrompt(prompt)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{prompt.name}</h4>
                      <p className="text-slate-400 text-sm mt-1 line-clamp-2">
                        {prompt.content.substring(0, 100)}...
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(prompt);
                        }}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(prompt);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePrompt(prompt.id);
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedPrompt && (
            <div className="mt-6 p-4 bg-slate-800/30 rounded border border-slate-600">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-medium">Prompt Selecionado</h4>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(selectedPrompt)}
                    className="text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Baixar JSON
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-slate-300 text-sm"><strong>Nome:</strong> {selectedPrompt.name}</p>
                <div>
                  <p className="text-slate-300 text-sm mb-2"><strong>Conteúdo:</strong></p>
                  <div className="bg-slate-900/50 p-3 rounded text-slate-300 text-sm max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {selectedPrompt.content}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={handleClose}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingPrompt ? 'Editar Prompt' : 'Novo Prompt'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure as instruções que serão utilizadas na geração dos arquivos CSV
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-white">Nome do Prompt</Label>
              <Input
                id="name"
                placeholder="Ex: Conversão de Lista de Peças"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="content" className="text-white">Conteúdo do Prompt</Label>
              <Textarea
                id="content"
                placeholder="Insira as instruções detalhadas para a conversão dos dados..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white min-h-[400px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              {editingPrompt ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PromptsManager;
