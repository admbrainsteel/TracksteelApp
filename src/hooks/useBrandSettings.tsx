
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BrandSettings {
  company_name: string;
  logo_url: string | null;
  font_family: string;
}

export const useBrandSettings = () => {
  const [brandSettings, setBrandSettings] = useState<BrandSettings>({
    company_name: 'TrackSteel',
    logo_url: null,
    font_family: 'Arial'
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadBrandSettings = async () => {
    try {
      console.log('Loading brand settings...');
      const { data, error } = await supabase
        .from('brand_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading brand settings:', error);
        return;
      }

      if (data) {
        console.log('Brand settings loaded:', data);
        setBrandSettings({
          company_name: data.company_name || 'TrackSteel',
          logo_url: data.logo_url,
          font_family: data.font_family || 'Arial'
        });
      }
    } catch (error) {
      console.error('Error loading brand settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveBrandSettings = async (settings: BrandSettings) => {
    try {
      console.log('Saving brand settings:', settings);
      
      // First, check if there's already a record
      const { data: existingData } = await supabase
        .from('brand_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      let result;
      if (existingData) {
        // Update existing record
        result = await supabase
          .from('brand_settings')
          .update({
            company_name: settings.company_name,
            logo_url: settings.logo_url,
            font_family: settings.font_family,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData.id)
          .select()
          .single();
      } else {
        // Insert new record
        result = await supabase
          .from('brand_settings')
          .insert({
            company_name: settings.company_name,
            logo_url: settings.logo_url,
            font_family: settings.font_family
          })
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error saving brand settings:', result.error);
        toast.error('Erro ao salvar configurações: ' + result.error.message);
        return { error: result.error };
      }

      console.log('Brand settings saved successfully:', result.data);
      setBrandSettings(settings);
      toast.success('Configurações salvas com sucesso!');
      return { data: result.data };
    } catch (error) {
      console.error('Error saving brand settings:', error);
      toast.error('Erro ao salvar configurações');
      return { error };
    }
  };

  const uploadLogo = async (file: File) => {
    try {
      console.log('Uploading logo file:', file.name);
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('brand-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('Error uploading logo:', error);
        toast.error('Erro ao fazer upload do logo: ' + error.message);
        return { error };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('brand-assets')
        .getPublicUrl(fileName);

      console.log('Logo uploaded successfully. Public URL:', publicUrl);
      return { data: { publicUrl, path: data.path } };
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Erro ao fazer upload do logo');
      return { error };
    }
  };

  useEffect(() => {
    loadBrandSettings();
  }, []);

  return {
    brandSettings,
    setBrandSettings,
    loadBrandSettings,
    saveBrandSettings,
    uploadLogo,
    isLoading
  };
};
