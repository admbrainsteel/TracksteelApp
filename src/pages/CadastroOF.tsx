
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Save, FileText, User, MapPin, Settings2, Eye, Download, Search, Building2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { AlteracoesPopup } from '@/components/forms/AlteracoesPopup';
import { FichaTecnicaPreview } from '@/components/forms/FichaTecnicaPreview';
import { useThemeConfig } from '@/hooks/useThemeConfig';
import { useFichaTecnica, FichaTecnicaData } from '@/hooks/useFichaTecnica';
import { useUserManagement } from '@/hooks/useUserManagement';
import { usePermissions } from '@/hooks/usePermissions';

interface InfoCalculoEstrutural {
  e: boolean;
  c: boolean;
  na: boolean;
  info: string;
}

interface FormData extends FichaTecnicaData {
  data_inicio: string;
  data_termino_prev: string;
  status: string;
  prioridade: string;
}

const initialFormData: FormData = {
  of_number: '',
  gestor: '',
  projetista: '',
  revisao: '0',
  quantidade: 0,
  data_inicio: '',
  data_termino_prev: '',
  status: 'aberta',
  prioridade: 'media',
  
  // Dados do Cliente
  cliente: '',
  cnpj: '',
  ie: '',
  endereco: '',
  cidade: '',
  estado: '',
  cep: '',
  contato_contrato: '',
  fone_contrato: '',
  cel_contrato: '',
  email_contrato: '',
  contato_obra: '',
  fone_obra: '',
  cel_obra: '',
  email_obra: '',
  contato_qualid: '',
  fone_qualid: '',
  cel_qualid: '',
  email_qualid: '',
  
  // Dados da Obra
  eng_responsavel: '',
  telefone_obra: '',
  email_obra_responsavel: '',
  endereco_obra: '',
  cep_obra: '',
  bairro_obra: '',
  cidade_obra: '',
  estado_obra: '',
  observacoes_obra: '',
  
  // Dados do Projeto
  descricao_resumida: '',
  endereco_projeto: '',
  bairro_projeto: '',
  cep_projeto: '',
  cidade_projeto: '',
  estado_projeto: '',
  horarios_trabalho: '',
  condicoes_acesso: '',
  
  // Tipos de Projeto
  tipo_estrutural: false,
  tipo_residencial: false,
  tipo_espacial: false,
  tipo_comercial: false,
  tipo_grades: false,
  tipo_industrial: false,
  tipo_cobertura: false,
  tipo_com_montagem: false,
  
  // Documentos Fornecidos
  doc_calculo: false,
  doc_projeto: false,
  doc_detalhamento: false,
  doc_cronograma: false,
  doc_normas: false,
  doc_especif_tecnicas: false,
  doc_catalogo: false,
  doc_fotos: false,
  
  // Informações Técnicas
  info_calculo_estrutural: { e: false, c: false, na: false, info: '' },
  info_projeto_basico: { e: false, c: false, na: false, info: '' },
  info_detalhamento: { e: false, c: false, na: false, info: '' },
  info_materia_prima: { e: false, c: false, na: false, info: '' },
  info_fabricacao: { e: false, c: false, na: false, info: '' },
  info_grades_piso: { e: false, c: false, na: false, info: '' },
  info_jateamento: { e: false, c: false, na: false, info: '' },
  info_pintura_base: { e: false, c: false, na: false, info: '' },
  info_pintura_inter: { e: false, c: false, na: false, info: '' },
  info_pintura_acabamento: { e: false, c: false, na: false, info: '' },
  info_galvanizacao: { e: false, c: false, na: false, info: '' },
  info_embalagem: { e: false, c: false, na: false, info: '' },
  info_transporte: { e: false, c: false, na: false, info: '' },
  info_inspecao: { e: false, c: false, na: false, info: '' },
  info_ensaios_lab: { e: false, c: false, na: false, info: '' },
  info_databook: { e: false, c: false, na: false, info: '' },
  info_pre_montagem: { e: false, c: false, na: false, info: '' },
  info_placa_engenetal: { e: false, c: false, na: false, info: '' },
  info_parafusos: { e: false, c: false, na: false, info: '' },
  info_chumbadores: { e: false, c: false, na: false, info: '' },
  info_stud_bolt: { e: false, c: false, na: false, info: '' },
  info_fornec_telhas: { e: false, c: false, na: false, info: '' },
  info_montagem_telhas: { e: false, c: false, na: false, info: '' },
  info_forn_calhas: { e: false, c: false, na: false, info: '' },
  info_mont_calhas: { e: false, c: false, na: false, info: '' },
  info_steel_deck: { e: false, c: false, na: false, info: '' },
  info_fornec_wall: { e: false, c: false, na: false, info: '' },
  info_mont_wall: { e: false, c: false, na: false, info: '' },
  info_outros_materiais: { e: false, c: false, na: false, info: '' },
  
  // Validação
  necessita_validacao_pos_detalh: false,
  
  // Grades
  grades_modelo: '',
  grades_padrao_comercial: false,
  grades_padrao_sa2: false,
  grades_padrao_sa2_meio: false,
  grades_padrao_sa3: false,
  
  // Requisitos
  req_ambientais_existem: false,
  req_ambientais_quais: '',
  req_saude_seguranca_existem: false,
  req_saude_seguranca_quais: '',
  
  // Alterações
  alteracao_descritivo: '',
  alteracao_motivo: '',
  alteracao_impacto: '',
  alteracao_custo: 0,
  alteracao_cronograma: '',
  alteracao_pecas_prontas: '',
  alteracao_detalh_projeto: '',
  
  // Cronograma
  cronograma_semanas: {},
  
  // Vistos
  visto_gestor: '',
  visto_pcp: '',
  visto_eng: '',
  visto_fab: '',
  visto_exp: '',
  visto_qual: '',
  visto_colunas: { '1': false, '2': false, '3': false, '4': false },
};

const CadastroOF = () => {
  const [searchParams] = useSearchParams();
  const ofId = searchParams.get('id');
  const isEditing = Boolean(ofId);
  const { themeConfig } = useThemeConfig();
  const { buscarFichaTecnica, salvarFichaTecnica, loading: fichaTecnicaLoading } = useFichaTecnica();
  const { users } = useUserManagement();
  const { canRegra } = usePermissions();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [searchOfNumber, setSearchOfNumber] = useState('');

  // Apply theme config on component mount
  useEffect(() => {
    if (themeConfig) {
      const root = document.documentElement;
      const isDark = root.classList.contains('dark');
      const theme = isDark ? themeConfig.dark_theme : themeConfig.light_theme;

      Object.entries(theme).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
      });
    }
  }, [themeConfig]);

  const handleLoadOF = async () => {
    if (!searchOfNumber.trim()) {
      toast.error('Digite o número da OF para carregar');
      return;
    }

    try {
      const data = await buscarFichaTecnica(searchOfNumber.trim());
      if (data) {
        const parseJsonField = (field: any) => {
          if (typeof field === 'string') {
            try {
              return JSON.parse(field);
            } catch {
              return { e: false, c: false, na: false, info: '' };
            }
          }
          return field || { e: false, c: false, na: false, info: '' };
        };

        setFormData({
          ...initialFormData,
          ...data,
          data_inicio: data.data_inicio || '',
          data_termino_prev: data.data_termino_prev || '',
          status: 'aberta',
          prioridade: 'media',
          quantidade: data.quantidade || 0,
          info_calculo_estrutural: parseJsonField(data.info_calculo_estrutural),
          info_projeto_basico: parseJsonField(data.info_projeto_basico),
          info_detalhamento: parseJsonField(data.info_detalhamento),
          info_materia_prima: parseJsonField(data.info_materia_prima),
          info_fabricacao: parseJsonField(data.info_fabricacao),
          info_grades_piso: parseJsonField(data.info_grades_piso),
          info_jateamento: parseJsonField(data.info_jateamento),
          info_pintura_base: parseJsonField(data.info_pintura_base),
          info_pintura_inter: parseJsonField(data.info_pintura_inter),
          info_pintura_acabamento: parseJsonField(data.info_pintura_acabamento),
          info_galvanizacao: parseJsonField(data.info_galvanizacao),
          info_embalagem: parseJsonField(data.info_embalagem),
          info_transporte: parseJsonField(data.info_transporte),
          info_inspecao: parseJsonField(data.info_inspecao),
          info_ensaios_lab: parseJsonField(data.info_ensaios_lab),
          info_databook: parseJsonField(data.info_databook),
          info_pre_montagem: parseJsonField(data.info_pre_montagem),
          info_placa_engenetal: parseJsonField(data.info_placa_engenetal),
          info_parafusos: parseJsonField(data.info_parafusos),
          info_chumbadores: parseJsonField(data.info_chumbadores),
          info_stud_bolt: parseJsonField(data.info_stud_bolt),
          info_fornec_telhas: parseJsonField(data.info_fornec_telhas),
          info_montagem_telhas: parseJsonField(data.info_montagem_telhas),
          info_forn_calhas: parseJsonField(data.info_forn_calhas),
          info_mont_calhas: parseJsonField(data.info_mont_calhas),
          info_steel_deck: parseJsonField(data.info_steel_deck),
          info_fornec_wall: parseJsonField(data.info_fornec_wall),
          info_mont_wall: parseJsonField(data.info_mont_wall),
          info_outros_materiais: parseJsonField(data.info_outros_materiais),
        });
        toast.success('OF carregada com sucesso!');
      } else {
        toast.error('OF não encontrada');
      }
    } catch (error) {
      toast.error('Erro ao carregar OF');
    }
  };

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTechnicalInfoChange = (field: keyof FormData, key: keyof InfoCalculoEstrutural, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: {
        ...(prev[field] as InfoCalculoEstrutural),
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!formData.of_number) {
      toast.error('Número da OF é obrigatório');
      return;
    }

    if (!isEditing && !canRegra('eng_criar_of')) {
      toast.error('Atenção: Você não possui permissão para cadastrar novas Ordens de Fabricação.');
      return;
    }

    if (isEditing && !canRegra('eng_editar_of')) {
      toast.error('Atenção: Você não possui permissão para alterar dados desta Ordem de Fabricação.');
      return;
    }

    setIsSaving(true);

    try {
      const success = await salvarFichaTecnica(formData);
      
      if (success && !isEditing) {
        setFormData(initialFormData);
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar a OF');
    } finally {
      setIsSaving(false);
    }
  };

  const renderTechnicalInfoField = (
    label: string,
    fieldName: keyof FormData,
    info: InfoCalculoEstrutural
  ) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      <div className="flex gap-2 mb-2">
        <div className="flex items-center space-x-1">
          <Checkbox
            checked={info.e}
            onCheckedChange={(checked) => 
              handleTechnicalInfoChange(fieldName, 'e', checked as boolean)
            }
          />
          <Label className="text-xs">E</Label>
        </div>
        <div className="flex items-center space-x-1">
          <Checkbox
            checked={info.c}
            onCheckedChange={(checked) => 
              handleTechnicalInfoChange(fieldName, 'c', checked as boolean)
            }
          />
          <Label className="text-xs">C</Label>
        </div>
        <div className="flex items-center space-x-1">
          <Checkbox
            checked={info.na}
            onCheckedChange={(checked) => 
              handleTechnicalInfoChange(fieldName, 'na', checked as boolean)
            }
          />
          <Label className="text-xs">N/A</Label>
        </div>
      </div>
      <Textarea
        value={info.info}
        onChange={(e) => 
          handleTechnicalInfoChange(fieldName, 'info', e.target.value)
        }
        placeholder="Informações adicionais"
        className="min-h-[60px] text-xs bg-input border-border text-foreground"
      />
    </div>
  );

  return (
    <div className="container mx-auto p-4 space-y-4 bg-background text-foreground">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Ficha Técnica da OF
        </h1>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button 
            variant="outline" 
            className="border-border"
            onClick={() => setShowPreview(true)}
            disabled={!formData.of_number}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
        </div>
      </div>

      {/* Seção para Carregar OF */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-card-foreground">
            <Search className="w-5 h-5" />
            Carregar OF Existente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Digite o número da OF"
              value={searchOfNumber}
              onChange={(e) => setSearchOfNumber(e.target.value)}
              className="bg-input border-border text-foreground"
            />
            <Button 
              onClick={handleLoadOF}
              disabled={fichaTecnicaLoading}
              variant="outline"
              className="border-border"
            >
              <Search className="w-4 h-4 mr-2" />
              {fichaTecnicaLoading ? 'Carregando...' : 'Carregar OF'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {/* Informações Básicas */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-card-foreground">
              <FileText className="w-5 h-5" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label htmlFor="of_number" className="text-sm font-medium text-muted-foreground">Número OF</Label>
                <Input
                  id="of_number"
                  value={formData.of_number}
                  onChange={(e) => handleChange('of_number', e.target.value)}
                  className="mt-1 bg-input border-border text-foreground"
                />
              </div>
              <div>
                <Label htmlFor="gestor" className="text-sm font-medium text-muted-foreground">Gestor da OF</Label>
                <Select value={formData.gestor || ''} onValueChange={(value) => handleChange('gestor', value)}>
                  <SelectTrigger className="mt-1 bg-input border-border text-foreground">
                    <SelectValue placeholder="Selecione o gestor" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {users.filter(user => user.status === 'active').map((user) => (
                      <SelectItem key={user.id} value={user.full_name || user.email || ''}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="projetista" className="text-sm font-medium text-muted-foreground">Projetista da OF</Label>
                <Select value={formData.projetista || ''} onValueChange={(value) => handleChange('projetista', value)}>
                  <SelectTrigger className="mt-1 bg-input border-border text-foreground">
                    <SelectValue placeholder="Selecione o projetista" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {users.filter(user => user.status === 'active').map((user) => (
                      <SelectItem key={user.id} value={user.full_name || user.email || ''}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="revisao" className="text-sm font-medium text-muted-foreground">Revisão</Label>
                <Input
                  id="revisao"
                  value={formData.revisao || '0'}
                  onChange={(e) => handleChange('revisao', e.target.value)}
                  className="mt-1 bg-input border-border text-foreground"
                />
              </div>
              <div>
                <Label htmlFor="data_inicio" className="text-sm font-medium text-muted-foreground">Data Início</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => handleChange('data_inicio', e.target.value)}
                  className="mt-1 bg-input border-border text-foreground"
                />
              </div>
              <div>
                <Label htmlFor="data_termino_prev" className="text-sm font-medium text-muted-foreground">Data Prazo</Label>
                <Input
                  id="data_termino_prev"
                  type="date"
                  value={formData.data_termino_prev}
                  onChange={(e) => handleChange('data_termino_prev', e.target.value)}
                  className="mt-1 bg-input border-border text-foreground"
                />
              </div>
              <div>
                <Label htmlFor="quantidade" className="text-sm font-medium text-muted-foreground">Quantidade (kg)</Label>
                <Input
                  id="quantidade"
                  type="number"
                  value={formData.quantidade || ''}
                  onChange={(e) => handleChange('quantidade', parseFloat(e.target.value) || 0)}
                  className="mt-1 bg-input border-border text-foreground"
                />
              </div>
              <div>
                <Label htmlFor="descricao_resumida" className="text-sm font-medium text-muted-foreground">Descrição Resumida</Label>
                <Input
                  id="descricao_resumida"
                  value={formData.descricao_resumida || ''}
                  onChange={(e) => handleChange('descricao_resumida', e.target.value)}
                  className="mt-1 bg-input border-border text-foreground"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status e Prioridade */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-card-foreground">
              <Settings2 className="w-5 h-5" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Status Atual</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger className="mt-1 bg-input border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="arquivada">Arquivada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Prioridade</Label>
              <Select value={formData.prioridade} onValueChange={(value) => handleChange('prioridade', value)}>
                <SelectTrigger className="mt-1 bg-input border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Informações do Cliente */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-card-foreground">
              <User className="w-5 h-5" />
              Informações do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <Label htmlFor="cliente" className="text-sm font-medium text-muted-foreground">Cliente</Label>
                <Input
                  id="cliente"
                  value={formData.cliente || ''}
                  onChange={(e) => handleChange('cliente', e.target.value)}
                  className="mt-1 bg-input border-border text-foreground"
                />
              </div>
              <div>
                <Label htmlFor="cnpj" className="text-sm font-medium text-muted-foreground">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj || ''}
                  onChange={(e) => handleChange('cnpj', e.target.value)}
                  className="mt-1 bg-input border-border text-foreground"
                />
              </div>
              <div>
                <Label htmlFor="ie" className="text-sm font-medium text-muted-foreground">IE</Label>
                <Input
                  id="ie"
                  value={formData.ie || ''}
                  onChange={(e) => handleChange('ie', e.target.value)}
                  className="mt-1 bg-input border-border text-foreground"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="endereco" className="text-sm font-medium text-muted-foreground">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco || ''}
                  onChange={(e) => handleChange('endereco', e.target.value)}
                  className="mt-1 bg-input border-border text-foreground"
                />
              </div>
              <div>
                <Label htmlFor="cidade" className="text-sm font-medium text-muted-foreground">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade || ''}
                  onChange={(e) => handleChange('cidade', e.target.value)}
                  className="mt-1 bg-input border-border text-foreground"
                />
              </div>
              <div>
                <Label htmlFor="estado" className="text-sm font-medium text-muted-foreground">Estado</Label>
                <Input
                  id="estado"
                  value={formData.estado || ''}
                  onChange={(e) => handleChange('estado', e.target.value)}
                  className="mt-1 bg-input border-border text-foreground"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações da Obra */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-card-foreground">
              <Building2 className="w-5 h-5" />
              Informações da Obra
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label htmlFor="eng_responsavel" className="text-sm font-medium text-muted-foreground">Eng. Responsável</Label>
                <Input
                  id="eng_responsavel"
                  value={formData.eng_responsavel || ''}
                  onChange={(e) => handleChange('eng_responsavel', e.target.value)}
                  className="mt-1 bg-input border-border text-foreground"
                />
              </div>
              <div>
                <Label htmlFor="telefone_obra" className="text-sm font-medium text-muted-foreground">Telefone</Label>
                <Input
                  id="telefone_obra"
                  value={formData.telefone_obra || ''}
                  onChange={(e) => handleChange('telefone_obra', e.target.value)}
                  className="mt-1 bg-input border-border text-foreground"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="email_obra_responsavel" className="text-sm font-medium text-muted-foreground">E-mail</Label>
                <Input
                  id="email_obra_responsavel"
                  type="email"
                  value={formData.email_obra_responsavel || ''}
                  onChange={(e) => handleChange('email_obra_responsavel', e.target.value)}
                  className="mt-1 bg-input border-border text-foreground"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="endereco_obra" className="text-sm font-medium text-muted-foreground">Endereço da Obra</Label>
                <Input
                  id="endereco_obra"
                  value={formData.endereco_obra || ''}
                  onChange={(e) => handleChange('endereco_obra', e.target.value)}
                  className="mt-1 bg-input border-border text-foreground"
                />
              </div>
              <div>
                <Label htmlFor="cep_obra" className="text-sm font-medium text-muted-foreground">CEP</Label>
                <Input
                  id="cep_obra"
                  value={formData.cep_obra || ''}
                  onChange={(e) => handleChange('cep_obra', e.target.value)}
                  className="mt-1 bg-input border-border text-foreground"
                />
              </div>
              <div>
                <Label htmlFor="bairro_obra" className="text-sm font-medium text-muted-foreground">Bairro</Label>
                <Input
                  id="bairro_obra"
                  value={formData.bairro_obra || ''}
                  onChange={(e) => handleChange('bairro_obra', e.target.value)}
                  className="mt-1 bg-input border-border text-foreground"
                />
              </div>
              <div>
                <Label htmlFor="cidade_obra" className="text-sm font-medium text-muted-foreground">Cidade</Label>
                <Input
                  id="cidade_obra"
                  value={formData.cidade_obra || ''}
                  onChange={(e) => handleChange('cidade_obra', e.target.value)}
                  className="mt-1 bg-input border-border text-foreground"
                />
              </div>
              <div>
                <Label htmlFor="estado_obra" className="text-sm font-medium text-muted-foreground">Estado (UF)</Label>
                <Input
                  id="estado_obra"
                  value={formData.estado_obra || ''}
                  onChange={(e) => handleChange('estado_obra', e.target.value)}
                  className="mt-1 bg-input border-border text-foreground"
                />
              </div>
              <div className="md:col-span-4">
                <Label htmlFor="observacoes_obra" className="text-sm font-medium text-muted-foreground">Observações Gerais</Label>
                <Textarea
                  id="observacoes_obra"
                  value={formData.observacoes_obra || ''}
                  onChange={(e) => handleChange('observacoes_obra', e.target.value)}
                  className="mt-1 bg-input border-border text-foreground"
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tipos de Projetos */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-card-foreground">
              <Settings2 className="w-5 h-5" />
              Tipos de Projetos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: 'tipo_estrutural', label: 'Estrutural' },
                { key: 'tipo_residencial', label: 'Residencial' },
                { key: 'tipo_espacial', label: 'Espacial' },
                { key: 'tipo_comercial', label: 'Comercial' },
                { key: 'tipo_grades', label: 'Grades' },
                { key: 'tipo_industrial', label: 'Industrial' },
                { key: 'tipo_cobertura', label: 'Cobertura' },
                { key: 'tipo_com_montagem', label: 'Com Montagem' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData[key as keyof FormData] as boolean || false}
                    onCheckedChange={(checked) => handleChange(key as keyof FormData, checked)}
                  />
                  <Label className="text-sm">{label}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Documentos Fornecidos */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-card-foreground">
              <FileText className="w-5 h-5" />
              Documentos Fornecidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: 'doc_calculo', label: 'Cálculo' },
                { key: 'doc_projeto', label: 'Projeto' },
                { key: 'doc_detalhamento', label: 'Detalhamento' },
                { key: 'doc_cronograma', label: 'Cronograma' },
                { key: 'doc_normas', label: 'Normas' },
                { key: 'doc_especif_tecnicas', label: 'Especif. Técnicas' },
                { key: 'doc_catalogo', label: 'Catálogo' },
                { key: 'doc_fotos', label: 'Fotos' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData[key as keyof FormData] as boolean || false}
                    onCheckedChange={(checked) => handleChange(key as keyof FormData, checked)}
                  />
                  <Label className="text-sm">{label}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alterações - Como botão popup */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-card-foreground">
              <Settings2 className="w-5 h-5" />
              Alterações da OF
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AlteracoesPopup formData={formData} setFormData={setFormData} />
          </CardContent>
        </Card>

        {/* Informações Técnicas Completas */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-card-foreground">
              <Settings2 className="w-5 h-5" />
              Informações Técnicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderTechnicalInfoField('Cálculo Estrutural', 'info_calculo_estrutural', formData.info_calculo_estrutural)}
              {renderTechnicalInfoField('Projeto Básico', 'info_projeto_basico', formData.info_projeto_basico)}
              {renderTechnicalInfoField('Detalhamento', 'info_detalhamento', formData.info_detalhamento)}
              {renderTechnicalInfoField('Matéria Prima', 'info_materia_prima', formData.info_materia_prima)}
              {renderTechnicalInfoField('Fabricação', 'info_fabricacao', formData.info_fabricacao)}
              {renderTechnicalInfoField('Grades de Piso', 'info_grades_piso', formData.info_grades_piso)}
              {renderTechnicalInfoField('Jateamento', 'info_jateamento', formData.info_jateamento)}
              {renderTechnicalInfoField('Pintura Base', 'info_pintura_base', formData.info_pintura_base)}
              {renderTechnicalInfoField('Pintura Intermediária', 'info_pintura_inter', formData.info_pintura_inter)}
              {renderTechnicalInfoField('Pintura Acabamento', 'info_pintura_acabamento', formData.info_pintura_acabamento)}
              {renderTechnicalInfoField('Galvanização', 'info_galvanizacao', formData.info_galvanizacao)}
              {renderTechnicalInfoField('Embalagem', 'info_embalagem', formData.info_embalagem)}
              {renderTechnicalInfoField('Transporte', 'info_transporte', formData.info_transporte)}
              {renderTechnicalInfoField('Inspeção', 'info_inspecao', formData.info_inspecao)}
              {renderTechnicalInfoField('Ensaios de Laboratório', 'info_ensaios_lab', formData.info_ensaios_lab)}
              {renderTechnicalInfoField('Databook', 'info_databook', formData.info_databook)}
              {renderTechnicalInfoField('Pré-montagem', 'info_pre_montagem', formData.info_pre_montagem)}
              {renderTechnicalInfoField('Placa Engenetal', 'info_placa_engenetal', formData.info_placa_engenetal)}
              {renderTechnicalInfoField('Parafusos', 'info_parafusos', formData.info_parafusos)}
              {renderTechnicalInfoField('Chumbadores', 'info_chumbadores', formData.info_chumbadores)}
              {renderTechnicalInfoField('Stud Bolt', 'info_stud_bolt', formData.info_stud_bolt)}
              {renderTechnicalInfoField('Fornecimento Telhas', 'info_fornec_telhas', formData.info_fornec_telhas)}
              {renderTechnicalInfoField('Montagem Telhas', 'info_montagem_telhas', formData.info_montagem_telhas)}
              {renderTechnicalInfoField('Fornecimento Calhas', 'info_forn_calhas', formData.info_forn_calhas)}
              {renderTechnicalInfoField('Montagem Calhas', 'info_mont_calhas', formData.info_mont_calhas)}
              {renderTechnicalInfoField('Steel Deck', 'info_steel_deck', formData.info_steel_deck)}
              {renderTechnicalInfoField('Fornecimento Wall', 'info_fornec_wall', formData.info_fornec_wall)}
              {renderTechnicalInfoField('Montagem Wall', 'info_mont_wall', formData.info_mont_wall)}
              {renderTechnicalInfoField('Outros Materiais', 'info_outros_materiais', formData.info_outros_materiais)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Modal */}
      <FichaTecnicaPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        data={formData}
      />
    </div>
  );
};

export default CadastroOF;
