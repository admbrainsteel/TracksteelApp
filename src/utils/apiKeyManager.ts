
import { supabase } from '@/integrations/supabase/client';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  is_primary: boolean;
}

class ApiKeyManager {
  private static instance: ApiKeyManager;
  private apiKeys: ApiKey[] = [];
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  private constructor() {}

  static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }

  private async fetchApiKeys(): Promise<void> {
    const now = Date.now();
    if (now - this.lastFetch < this.CACHE_DURATION && this.apiKeys.length > 0) {
      return; // Usar cache
    }

    try {
      const { data, error } = await (supabase as any)
        .from('api_keys')
        .select('*')
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      this.apiKeys = data || [];
      this.lastFetch = now;
    } catch (error) {
      console.error('Erro ao buscar chaves API:', error);
      throw error;
    }
  }

  async getApiKeyWithFallback(): Promise<string | null> {
    await this.fetchApiKeys();
    
    if (this.apiKeys.length === 0) {
      console.warn('Nenhuma chave API configurada');
      return null;
    }

    // Retorna a chave principal primeiro, depois as secundárias
    const primaryKey = this.apiKeys.find(key => key.is_primary);
    if (primaryKey) {
      return primaryKey.key;
    }

    // Se não há chave principal, retorna a primeira disponível
    return this.apiKeys[0]?.key || null;
  }

  async getAllApiKeys(): Promise<string[]> {
    await this.fetchApiKeys();
    return this.apiKeys.map(key => key.key);
  }

  // Método para fazer requests com fallback automático
  async makeRequestWithFallback<T>(
    requestFn: (apiKey: string) => Promise<T>,
    options: {
      retries?: number;
      timeout?: number;
    } = {}
  ): Promise<T> {
    const { retries = 1, timeout = 30000 } = options;
    await this.fetchApiKeys();

    if (this.apiKeys.length === 0) {
      throw new Error('Nenhuma chave API configurada');
    }

    const keys = [...this.apiKeys].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return 0;
    });

    let lastError: Error | null = null;

    for (const apiKeyObj of keys) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          console.log(`Tentando chave: ${apiKeyObj.name} (tentativa ${attempt + 1})`);
          
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout na requisição')), timeout)
          );

          const result = await Promise.race([
            requestFn(apiKeyObj.key),
            timeoutPromise
          ]);

          console.log(`Sucesso com chave: ${apiKeyObj.name}`);
          return result;

        } catch (error: any) {
          lastError = error;
          const isAuthError = error?.status === 401 || error?.status === 403;
          const isNetworkError = error?.message?.includes('Timeout') || 
                                 error?.message?.includes('network') ||
                                 error?.code === 'ECONNREFUSED';

          console.warn(`Falha com chave ${apiKeyObj.name}:`, error?.message);

          // Se é erro de autenticação, não tentar novamente com a mesma chave
          if (isAuthError) {
            console.log(`Chave ${apiKeyObj.name} inválida, tentando próxima...`);
            break;
          }

          // Se é erro de rede e ainda há tentativas, aguarda um pouco
          if (isNetworkError && attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
      }
    }

    throw new Error(
      `Todas as chaves API falharam. Último erro: ${lastError?.message || 'Erro desconhecido'}`
    );
  }

  // Limpar cache (útil após atualizações nas chaves)
  clearCache(): void {
    this.apiKeys = [];
    this.lastFetch = 0;
  }
}

export const apiKeyManager = ApiKeyManager.getInstance();
