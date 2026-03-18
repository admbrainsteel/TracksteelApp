/**
 * Sistema de Cache Inteligente para Otimização de Performance
 * Implementa cache em memória e localStorage com TTL e versionamento
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  version: string;
}

interface PerformanceMetrics {
  operation: string;
  duration_ms: number;
  cache_hit: boolean;
  items_count: number;
  query_count: number;
  timestamp: Date;
}

export class OptimizedCache {
  private static readonly CACHE_VERSIONS = {
    HISTORICO: '1.0',
    ITENS_DISPONIVEIS: '1.1',
    COMPONENTES: '1.0',
    PECAS: '1.0',
    PROCESSOS: '1.0'
  } as const;
  
  public static readonly TTL_CONFIG = {
    HISTORICO_OF: 5 * 60 * 1000,      // 5 minutos
    ITENS_DISPONIVEIS: 2 * 60 * 1000,  // 2 minutos
    COMPONENTES: 10 * 60 * 1000,       // 10 minutos
    PECAS: 10 * 60 * 1000,             // 10 minutos
    PROCESSOS: 15 * 60 * 1000          // 15 minutos
  } as const;
  
  private static memoryCache = new Map<string, { data: any; timestamp: number }>();
  private static readonly MEMORY_TTL = 30 * 1000; // 30 segundos
  
  /**
   * Recupera dados do cache (memória primeiro, depois localStorage)
   */
  static async get<T>(key: string, type: keyof typeof OptimizedCache.TTL_CONFIG): Promise<T | null> {
    const startTime = performance.now();
    
    // Verificar memória primeiro
    const memoryKey = `mem_${key}`;
    if (this.memoryCache.has(memoryKey)) {
      const entry = this.memoryCache.get(memoryKey)!;
      if (Date.now() - entry.timestamp < this.MEMORY_TTL) {
        this.trackPerformance({
          operation: `cache_get_${type}`,
          duration_ms: Math.round(performance.now() - startTime),
          cache_hit: true,
          items_count: Array.isArray(entry.data) ? entry.data.length : 1,
          query_count: 0,
          timestamp: new Date()
        });
        return entry.data;
      } else {
        this.memoryCache.delete(memoryKey);
      }
    }
    
    // Verificar localStorage
    const storageKey = `cache_${key}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const entry: CacheEntry = JSON.parse(stored);
        const ttl = this.TTL_CONFIG[type];
        const versionKey = type.split('_')[0] as keyof typeof this.CACHE_VERSIONS;
        
        if (Date.now() - entry.timestamp < ttl && 
            entry.version === this.CACHE_VERSIONS[versionKey]) {
          // Armazenar em memória para próximas consultas
          this.memoryCache.set(memoryKey, {
            data: entry.data,
            timestamp: Date.now()
          });
          
          this.trackPerformance({
            operation: `cache_get_${type}`,
            duration_ms: Math.round(performance.now() - startTime),
            cache_hit: true,
            items_count: Array.isArray(entry.data) ? entry.data.length : 1,
            query_count: 0,
            timestamp: new Date()
          });
          
          return entry.data;
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch (error) {
        console.warn('Erro ao recuperar cache:', error);
        localStorage.removeItem(storageKey);
      }
    }
    
    this.trackPerformance({
      operation: `cache_get_${type}`,
      duration_ms: Math.round(performance.now() - startTime),
      cache_hit: false,
      items_count: 0,
      query_count: 0,
      timestamp: new Date()
    });
    
    return null;
  }
  
  /**
   * Armazena dados no cache (memória e localStorage)
   */
  static set<T>(key: string, data: T, type: keyof typeof OptimizedCache.TTL_CONFIG): void {
    const versionKey = type.split('_')[0] as keyof typeof this.CACHE_VERSIONS;
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: this.TTL_CONFIG[type],
      version: this.CACHE_VERSIONS[versionKey] || '1.0'
    };
    
    // Armazenar em ambos os caches
    this.memoryCache.set(`mem_${key}`, {
      data,
      timestamp: Date.now()
    });
    
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Erro ao armazenar cache no localStorage:', error);
      // Se localStorage estiver cheio, limpar caches antigos
      this.cleanupOldCache();
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
      } catch (retryError) {
        console.error('Falha ao armazenar cache após limpeza:', retryError);
      }
    }
  }
  
  /**
   * Invalida cache por padrão de chave
   */
  static invalidatePattern(pattern: string): void {
    // Limpar memória
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }
    
    // Limpar localStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.includes(pattern)) {
        localStorage.removeItem(key);
      }
    }
  }
  
  /**
   * Remove entrada específica do cache
   */
  static remove(key: string): void {
    this.memoryCache.delete(`mem_${key}`);
    localStorage.removeItem(`cache_${key}`);
  }
  
  /**
   * Limpa caches antigos para liberar espaço
   */
  private static cleanupOldCache(): void {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cache_')) {
        try {
          const entry: CacheEntry = JSON.parse(localStorage.getItem(key)!);
          if (now - entry.timestamp > entry.ttl) {
            keysToRemove.push(key);
          }
        } catch (error) {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`Cache cleanup: removidas ${keysToRemove.length} entradas antigas`);
  }
  
  /**
   * Obtém estatísticas do cache
   */
  static getStats(): {
    memoryEntries: number;
    localStorageEntries: number;
    totalSize: number;
  } {
    let localStorageEntries = 0;
    let totalSize = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cache_')) {
        localStorageEntries++;
        totalSize += localStorage.getItem(key)!.length;
      }
    }
    
    return {
      memoryEntries: this.memoryCache.size,
      localStorageEntries,
      totalSize
    };
  }
  
  /**
   * Limpa todo o cache
   */
  static clear(): void {
    this.memoryCache.clear();
    
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cache_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
  
  /**
   * Registra métricas de performance
   */
  private static trackPerformance(metrics: PerformanceMetrics): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 Cache Performance:', metrics);
    }
    
    // Armazenar métricas para análise posterior
    const metricsKey = 'cache_performance_metrics';
    const existingMetrics = JSON.parse(localStorage.getItem(metricsKey) || '[]');
    existingMetrics.push(metrics);
    
    // Manter apenas as últimas 100 métricas
    if (existingMetrics.length > 100) {
      existingMetrics.splice(0, existingMetrics.length - 100);
    }
    
    try {
      localStorage.setItem(metricsKey, JSON.stringify(existingMetrics));
    } catch (error) {
      // Se não conseguir armazenar métricas, não é crítico
    }
  }
  
  /**
   * Obtém métricas de performance
   */
  static getPerformanceMetrics(): PerformanceMetrics[] {
    const metricsKey = 'cache_performance_metrics';
    return JSON.parse(localStorage.getItem(metricsKey) || '[]');
  }
}

/**
 * Hook para cache inteligente com React Query/SWR style
 */
export const useSmartCache = <T>(
  key: string,
  fetcher: () => Promise<T>,
  type: keyof typeof OptimizedCache.TTL_CONFIG,
  options: {
    enabled?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
) => {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  
  React.useEffect(() => {
    if (options.enabled === false) return;
    
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Tentar cache primeiro
        const cached = await OptimizedCache.get<T>(key, type);
        if (cached) {
          setData(cached);
          setLoading(false);
          options.onSuccess?.(cached);
          return;
        }
        
        // Buscar dados frescos
        const freshData = await fetcher();
        OptimizedCache.set(key, freshData, type);
        setData(freshData);
        options.onSuccess?.(freshData);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Erro desconhecido');
        setError(error);
        options.onError?.(error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [key, type, options.enabled]);
  
  const invalidate = () => {
    OptimizedCache.remove(key);
  };
  
  const refetch = async () => {
    OptimizedCache.remove(key);
    setLoading(true);
    setError(null);
    
    try {
      const freshData = await fetcher();
      OptimizedCache.set(key, freshData, type);
      setData(freshData);
      options.onSuccess?.(freshData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido');
      setError(error);
      options.onError?.(error);
    } finally {
      setLoading(false);
    }
  };
  
  return {
    data,
    loading,
    error,
    invalidate,
    refetch
  };
};

// Importar React para o hook
import React from 'react';

export default OptimizedCache;