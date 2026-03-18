
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Catalogo } from '@/hooks/useCatalogos';
import { FileUploadSection } from './FileUploadSection';

interface CatalogoModalProps {
  catalogo?: Catalogo | null;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}

const categorias = [
  'Aço',
  'Adesivo',
  'Tintas',
  'Parafusos',
  'Soldas',
  'Estruturas',
  'Materiais'
];

const disciplinas = [
  'Engenharia Civil',
  'Engenharia Mecânica',
  'Arquitetura',
  'Construção',
  'Fabricação',
  'Montagem'
];

export function CatalogoModal({ catalogo, onSave, onClose }: CatalogoModalProps) {
  const [formData, setFormData] = useState({
    titulo: '',
    categoria: '',
    disciplina: '',
    conteudo: '',
    numero_paginas: '',
    palavras_chave: [] as string[],
    arquivo_urls: [] as string[]
  });
  const [newKeyword, setNewKeyword] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (catalogo) {
      setFormData({
        titulo: catalogo.titulo,
        categoria: catalogo.categoria,
        disciplina: catalogo.disciplina,
        conteudo: catalogo.conteudo,
        numero_paginas: catalogo.numero_paginas?.toString() || '',
        palavras_chave: catalogo.palavras_chave || [],
        arquivo_urls: (catalogo as any).arquivo_urls || []
      });
    }
  }, [catalogo]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !formData.palavras_chave.includes(newKeyword.trim())) {
      setFormData(prev => ({
        ...prev,
        palavras_chave: [...prev.palavras_chave, newKeyword.trim()]
      }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      palavras_chave: prev.palavras_chave.filter(k => k !== keyword)
    }));
  };

  const handleFilesAnalyzed = (analysisResult: any) => {
    setFormData(prev => ({
      ...prev,
      titulo: analysisResult.titulo || prev.titulo,
      categoria: analysisResult.categoria || prev.categoria,
      disciplina: analysisResult.disciplina || prev.disciplina,
      conteudo: analysisResult.conteudo || prev.conteudo,
      palavras_chave: [...new Set([...prev.palavras_chave, ...(analysisResult.palavras_chave || [])])]
    }));
  };

  const handleFilesUploaded = (urls: string[]) => {
    setFormData(prev => ({
      ...prev,
      arquivo_urls: [...new Set([...prev.arquivo_urls, ...urls])]
    }));
  };

  const analyzeWithAI = async () => {
    if (!formData.conteudo.trim()) {
      toast.error('Por favor, cole o conteúdo do documento antes de analisar');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Simulação da análise com IA (seria integração real com Gemini)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Análise simulada baseada no conteúdo
      const content = formData.conteudo.toLowerCase();
      
      let suggestedCategoria = '';
      let suggestedDisciplina = '';
      let suggestedTitulo = '';
      let suggestedKeywords: string[] = [];
      
      // Lógica simples de categorização baseada em palavras-chave
      if (content.includes('aço') || content.includes('steel')) {
        suggestedCategoria = 'Aço';
        suggestedKeywords.push('aço', 'steel');
      } else if (content.includes('tinta') || content.includes('pintura')) {
        suggestedCategoria = 'Tintas';
        suggestedKeywords.push('tinta', 'pintura');
      } else if (content.includes('parafuso') || content.includes('fixação')) {
        suggestedCategoria = 'Parafusos';
        suggestedKeywords.push('parafuso', 'fixação');
      } else {
        suggestedCategoria = 'Materiais';
      }

      if (content.includes('estrutura') || content.includes('construção')) {
        suggestedDisciplina = 'Engenharia Civil';
        suggestedKeywords.push('estrutura', 'construção');
      } else if (content.includes('mecânica') || content.includes('fabricação')) {
        suggestedDisciplina = 'Engenharia Mecânica';
        suggestedKeywords.push('mecânica', 'fabricação');
      } else {
        suggestedDisciplina = 'Construção';
      }

      // Extrair título das primeiras linhas
      const firstLine = formData.conteudo.split('\n')[0];
      if (firstLine && firstLine.length > 10 && firstLine.length < 100) {
        suggestedTitulo = firstLine.trim();
      }

      // Adicionar palavras-chave técnicas comuns
      if (content.includes('resistência')) suggestedKeywords.push('resistência');
      if (content.includes('qualidade')) suggestedKeywords.push('qualidade');
      if (content.includes('especificação')) suggestedKeywords.push('especificação');
      if (content.includes('norma')) suggestedKeywords.push('norma');
      
      setFormData(prev => ({
        ...prev,
        titulo: suggestedTitulo || prev.titulo,
        categoria: suggestedCategoria || prev.categoria,
        disciplina: suggestedDisciplina || prev.disciplina,
        palavras_chave: [...new Set([...prev.palavras_chave, ...suggestedKeywords])]
      }));

      toast.success('Análise concluída! Os campos foram preenchidos automaticamente.');
    } catch (error) {
      console.error('Erro na análise:', error);
      toast.error('Erro ao analisar documento com IA');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.categoria || !formData.disciplina || !formData.conteudo) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    const submitData = {
      ...formData,
      numero_paginas: formData.numero_paginas ? parseInt(formData.numero_paginas) : null
    };

    await onSave(submitData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {catalogo ? 'Editar Documento' : 'Novo Documento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção de Upload de Arquivos - apenas para novos documentos */}
          {!catalogo && (
            <div className="p-4 bg-slate-50 rounded-lg border">
              <FileUploadSection
                onFilesAnalyzed={handleFilesAnalyzed}
                onFilesUploaded={handleFilesUploaded}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => handleInputChange('titulo', e.target.value)}
                placeholder="Digite o título do documento"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero_paginas">Número de Páginas</Label>
              <Input
                id="numero_paginas"
                type="number"
                value={formData.numero_paginas}
                onChange={(e) => handleInputChange('numero_paginas', e.target.value)}
                placeholder="Ex: 25"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria *</Label>
              <Select
                value={formData.categoria}
                onValueChange={(value) => handleInputChange('categoria', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((categoria) => (
                    <SelectItem key={categoria} value={categoria}>
                      {categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="disciplina">Disciplina *</Label>
              <Select
                value={formData.disciplina}
                onValueChange={(value) => handleInputChange('disciplina', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma disciplina" />
                </SelectTrigger>
                <SelectContent>
                  {disciplinas.map((disciplina) => (
                    <SelectItem key={disciplina} value={disciplina}>
                      {disciplina}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conteudo">Conteúdo do Documento *</Label>
            <Textarea
              id="conteudo"
              value={formData.conteudo}
              onChange={(e) => handleInputChange('conteudo', e.target.value)}
              placeholder="Cole o conteúdo do documento aqui..."
              className="min-h-[200px]"
            />
            {!catalogo && (
              <Button
                type="button"
                onClick={analyzeWithAI}
                disabled={isAnalyzing || !formData.conteudo.trim()}
                className="mt-2"
                variant="outline"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {isAnalyzing ? 'Analisando...' : 'Analisar com IA'}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Palavras-chave</Label>
            <div className="flex gap-2">
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Adicionar palavra-chave"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              />
              <Button type="button" onClick={addKeyword} variant="outline">
                Adicionar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.palavras_chave.map((keyword, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {keyword}
                  <button
                    type="button"
                    onClick={() => removeKeyword(keyword)}
                    className="ml-1 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              {catalogo ? 'Atualizar' : 'Salvar'} Documento
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
