import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useBrandSettings } from '@/hooks/useBrandSettings';
import { useIconStyle } from '@/hooks/useIconStyle';
import { MenuBuilder } from '@/components/menu-builder/MenuBuilder';
import { PrioridadesConfig } from '@/components/configuracoes/PrioridadesConfig';
import { NomenclaturasConfig } from '@/components/configuracoes/NomenclaturasConfig';

const FONT_OPTIONS = [{
  value: 'Arial',
  label: 'Arial - Padrão clássico'
}, {
  value: 'Helvetica',
  label: 'Helvetica - Moderna e limpa'
}, {
  value: 'SF Pro Display',
  label: 'SF Pro - Fonte do sistema Apple'
}, {
  value: 'system-ui',
  label: 'Fonte do Sistema Operacional'
}];

const Configuracoes = () => {
  const {
    user
  } = useAuth();
  const {
    isAdmin
  } = useUserRole();
  const {
    brandSettings,
    setBrandSettings,
    saveBrandSettings,
    uploadLogo,
    isLoading: brandLoading
  } = useBrandSettings();
  const { iconStyle, setIconStyle } = useIconStyle();
  const [isLoading, setIsLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (brandSettings.logo_url) {
      setLogoPreview(brandSettings.logo_url);
    }
  }, [brandSettings.logo_url]);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast.error('Arquivo muito grande. Máximo 5MB.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione um arquivo de imagem.');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = e => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
    if (!isAdmin) {
      toast.error('Acesso negado. Apenas administradores podem alterar essas configurações.');
      return;
    }
    setIsLoading(true);
    try {
      let logoUrl = brandSettings.logo_url;

      // Upload logo if a new file was selected
      if (logoFile) {
        const uploadResult = await uploadLogo(logoFile);
        if (uploadResult.error) {
          setIsLoading(false);
          return;
        }
        logoUrl = uploadResult.data?.publicUrl || null;
      }

      // Save brand settings
      const settingsToSave = {
        ...brandSettings,
        logo_url: logoUrl
      };
      const result = await saveBrandSettings(settingsToSave);
      if (result.error) {
        setIsLoading(false);
        return;
      }

      // Apply font globally
      const fontFamily = brandSettings.font_family === 'system-ui' ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif' : brandSettings.font_family;
      document.documentElement.style.setProperty('--font-family', fontFamily);
      document.body.style.fontFamily = fontFamily;

      // Clear file selection
      setLogoFile(null);
    } catch (error) {
      console.error('Error saving brand settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFontChange = (value: string) => {
    setBrandSettings(prev => ({
      ...prev,
      font_family: value
    }));

    // Preview da fonte
    const fontFamily = value === 'system-ui' ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif' : value;
    document.documentElement.style.setProperty('--font-family', fontFamily);
    document.body.style.fontFamily = fontFamily;
  };

  if (!isAdmin) {
    return <div className="space-y-6 p-4 sm:p-6 bg-background min-h-screen">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Configurações</h1>
          <p className="text-muted-foreground">Configurações gerais do sistema</p>
        </div>

        <Card className="bg-white border-slate-300 shadow-sm dark:bg-slate-800/50 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-foreground">Acesso Restrito</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Apenas administradores podem acessar as configurações avançadas do sistema.
            </p>
          </CardContent>
        </Card>
      </div>;
  }

  return <div className="space-y-6 p-4 sm:p-6 bg-background min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Configurações Gerais</h1>
        <p className="text-muted-foreground">Configurações gerais do sistema</p>
      </div>

      {/* Personalização de Marca */}
      <Card className="bg-white border-slate-300 shadow-sm dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-foreground">Personalização de Marca</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Nome da Empresa */}
          <div className="space-y-2">
            <Label htmlFor="company-name" className="text-foreground">
              Nome da Empresa
            </Label>
            <Input
              id="company-name"
              value={brandSettings.company_name}
              onChange={e => setBrandSettings(prev => ({
                ...prev,
                company_name: e.target.value
              }))}
              placeholder="Digite o nome da empresa"
              className="bg-white border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Logotipo da Empresa</Label>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-background border-border text-foreground hover:bg-accent dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Selecionar Logo
                </Button>
                <span className="text-muted-foreground text-sm">
                  JPG, PNG ou SVG. Máximo 5MB.
                </span>
              </div>
              <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              
              {logoPreview && <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
                  <p className="text-muted-foreground text-sm mb-2 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Pré-visualização
                  </p>
                  <img src={logoPreview} alt="Logo preview" className="max-w-32 max-h-16 object-contain" />
                </div>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Estilo de Fonte</Label>
            <Select value={brandSettings.font_family} onValueChange={handleFontChange}>
              <SelectTrigger className="bg-white border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                <SelectValue placeholder="Selecione uma fonte" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-300 dark:bg-slate-800 dark:border-slate-700">
                {FONT_OPTIONS.map(font => <SelectItem key={font.value} value={font.value} className="text-foreground dark:text-white">
                    <span style={{
                  fontFamily: font.value === 'system-ui' ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : font.value
                }}>
                      {font.label}
                    </span>
                  </SelectItem>)}
              </SelectContent>
            </Select>
            
            <div className="mt-3 p-3 rounded border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
              <p className="text-muted-foreground text-sm mb-2">Pré-visualização da fonte:</p>
              <p
                style={{
                  fontFamily: brandSettings.font_family === 'system-ui'
                    ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif'
                    : brandSettings.font_family
                }}
                className="text-foreground"
              >
                Este é um exemplo de como o texto aparecerá com a fonte selecionada.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <Button
              onClick={handleSaveSettings}
              disabled={isLoading || brandLoading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLoading ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Personalização de Interface */}
      <Card className="bg-white border-slate-300 shadow-sm dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-foreground">Personalização de Interface</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Estilo dos Ícones */}
          <div className="space-y-2">
            <Label className="text-foreground">Estilo dos Ícones do Menu</Label>
            <Select value={iconStyle} onValueChange={setIconStyle}>
              <SelectTrigger className="bg-white border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                <SelectValue placeholder="Selecione o estilo dos ícones" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-300 dark:bg-slate-800 dark:border-slate-700">
                <SelectItem value="colorful" className="text-foreground dark:text-white">
                  Coloridos (Cores Originais)
                </SelectItem>
                <SelectItem value="themed" className="text-foreground dark:text-white">
                  Temáticos (Cor Principal do Tema)
                </SelectItem>
                <SelectItem value="white" className="text-foreground dark:text-white">
                  Brancos (Monocromático)
                </SelectItem>
              </SelectContent>
            </Select>
            
            <div className="mt-3 p-3 rounded border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
              <p className="text-muted-foreground text-sm mb-2">Configuração atual:</p>
              <p className="text-foreground">
                {iconStyle === 'colorful' && 'Ícones coloridos (cores originais dos ícones)'}
                {iconStyle === 'themed' && 'Ícones temáticos (seguem a cor principal do tema)'}
                {iconStyle === 'white' && 'Ícones brancos (estilo monocromático)'}
              </p>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Configuração de Nomenclaturas e Identificação da Fábrica */}
      <NomenclaturasConfig />

      {/* Configuração de Prioridades */}
      <PrioridadesConfig />

      {/* Menu Builder */}
      <MenuBuilder />
    </div>;
};

export default Configuracoes;
