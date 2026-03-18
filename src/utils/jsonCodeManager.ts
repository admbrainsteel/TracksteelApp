
import { supabase } from '@/integrations/supabase/client';

interface JsonCodeData {
  id: string;
  name: string;
  description?: string;
  json_code: any;
  is_active: boolean;
}

class JsonCodeManager {
  private static instance: JsonCodeManager;
  private jsonCodes: JsonCodeData[] = [];
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  private constructor() {}

  static getInstance(): JsonCodeManager {
    if (!JsonCodeManager.instance) {
      JsonCodeManager.instance = new JsonCodeManager();
    }
    return JsonCodeManager.instance;
  }

  private async fetchJsonCodes(): Promise<void> {
    const now = Date.now();
    if (now - this.lastFetch < this.CACHE_DURATION && this.jsonCodes.length > 0) {
      return; // Usar cache
    }

    try {
      const { data, error } = await (supabase as any)
        .from('json_codes')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      this.jsonCodes = data || [];
      this.lastFetch = now;
    } catch (error) {
      console.error('Erro ao buscar códigos JSON:', error);
      throw error;
    }
  }

  async getJsonCodeByName(name: string): Promise<any | null> {
    await this.fetchJsonCodes();
    
    const code = this.jsonCodes.find(code => code.name === name);
    
    if (!code) {
      console.warn(`Código JSON com nome '${name}' não encontrado`);
      return null;
    }

    return code.json_code;
  }

  async getAllJsonCodes(): Promise<JsonCodeData[]> {
    await this.fetchJsonCodes();
    return this.jsonCodes;
  }

  async getActiveJsonCodes(): Promise<JsonCodeData[]> {
    await this.fetchJsonCodes();
    return this.jsonCodes.filter(code => code.is_active);
  }

  async getJsonCodeById(id: string): Promise<any | null> {
    await this.fetchJsonCodes();
    
    const code = this.jsonCodes.find(code => code.id === id);
    
    if (!code) {
      console.warn(`Código JSON com ID '${id}' não encontrado`);
      return null;
    }

    return code.json_code;
  }

  // Limpar cache (útil após atualizações nos códigos)
  clearCache(): void {
    this.jsonCodes = [];
    this.lastFetch = 0;
  }
}

export const jsonCodeManager = JsonCodeManager.getInstance();

// Exemplo de uso:
export async function exemploUsoJsonCode() {
  try {
    // Buscar código por nome
    const meuConfig = await jsonCodeManager.getJsonCodeByName('configuracao_sistema');
    
    if (meuConfig) {
      console.log('Configuração encontrada:', meuConfig);
      // Usar o código JSON conforme necessário
      return meuConfig;
    }
    
    // Buscar todos os códigos ativos
    const codigosAtivos = await jsonCodeManager.getActiveJsonCodes();
    console.log('Códigos ativos:', codigosAtivos);
    
  } catch (error) {
    console.error('Erro ao buscar código JSON:', error);
    throw error;
  }
}
