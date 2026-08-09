/**
 * Sistema de Monitoramento de Performance
 * Rastreia métricas de performance e operações do sistema
 */

import React from 'react';
import { OptimizedCache } from './OptimizedCache';

export interface PerformanceMetrics {
  operation: string;
  duration_ms: number;
  cache_hit: boolean;
  items_count: number;
  query_count: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PerformanceTracker {
  startTime: number;
  operation: string;
  metadata: Record<string, any>;
}

export interface SystemHealth {
  cache_status: 'healthy' | 'degraded' | 'failed';
  database_status: 'healthy' | 'slow' | 'failed';
  average_response_time: number;
  cache_hit_rate: number;
  active_users: number;
  timestamp: Date;
}

export class PerformanceMonitor {
  private static trackers = new Map<string, PerformanceTracker>();
  private static metrics: PerformanceMetrics[] = [];
  private static readonly MAX_METRICS = 1000;
  
  /**
   * Inicia o rastreamento de uma operação
   */
  static start(operation: string, metadata: Record<string, any> = {}): string {
    const trackerId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.trackers.set(trackerId, {
      startTime: performance.now(),
      operation,
      metadata
    });
    return trackerId;
  }
  
  /**
   * Finaliza o rastreamento e retorna as métricas
   */
  static end(trackerId: string): PerformanceMetrics | null {
    const tracker = this.trackers.get(trackerId);
    if (!tracker) {
      console.warn(`Tracker não encontrado: ${trackerId}`);
      return null;
    }
    
    const duration = performance.now() - tracker.startTime;
    this.trackers.delete(trackerId);
    
    const metrics: PerformanceMetrics = {
      operation: tracker.operation,
      duration_ms: Math.round(duration * 100) / 100, // 2 casas decimais
      cache_hit: tracker.metadata.cache_hit || false,
      items_count: tracker.metadata.items_count || 0,
      query_count: tracker.metadata.query_count || 1,
      timestamp: new Date(),
      metadata: tracker.metadata
    };
    
    // Armazenar métricas
    this.addMetrics(metrics);
    
    // Log para desenvolvimento
    if (import.meta.env.DEV) {
      this.logMetrics(metrics);
    }
    
    // Alertas para performance ruim
    this.checkPerformanceAlerts(metrics);
    
    return metrics;
  }
  
  /**
   * Adiciona métricas ao histórico
   */
  private static addMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    
    // Manter apenas as últimas métricas
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.splice(0, this.metrics.length - this.MAX_METRICS);
    }
    
    // Persistir no localStorage para análise
    try {
      const persistedMetrics = this.metrics.slice(-100); // Últimas 100
      localStorage.setItem('performance_metrics', JSON.stringify(persistedMetrics));
    } catch (error) {
      // Falha ao persistir não é crítica
    }
  }
  
  /**
   * Log formatado das métricas
   */
  private static logMetrics(metrics: PerformanceMetrics): void {
    const emoji = metrics.cache_hit ? '⚡' : '🔍';
    const color = metrics.duration_ms > 1000 ? 'color: red' : 
                 metrics.duration_ms > 500 ? 'color: orange' : 'color: green';
    
    console.log(
      `%c${emoji} ${metrics.operation}`,
      color,
      `${metrics.duration_ms}ms`,
      metrics.cache_hit ? '(cache)' : '(fresh)',
      metrics.items_count > 0 ? `${metrics.items_count} items` : ''
    );
  }
  
  /**
   * Verifica alertas de performance
   */
  private static checkPerformanceAlerts(metrics: PerformanceMetrics): void {
    // Alerta para operações muito lentas
    if (metrics.duration_ms > 2000) {
      console.warn(`⚠️ Operação lenta detectada: ${metrics.operation} (${metrics.duration_ms}ms)`);
    }
    
    // Alerta para baixa taxa de cache hit
    const recentMetrics = this.metrics.slice(-20);
    const cacheHitRate = recentMetrics.filter(m => m.cache_hit).length / recentMetrics.length;
    if (recentMetrics.length >= 10 && cacheHitRate < 0.3) {
      console.warn(`⚠️ Taxa de cache hit baixa: ${Math.round(cacheHitRate * 100)}%`);
    }
  }
  
  /**
   * Obtém estatísticas de performance
   */
  static getStats(): {
    totalOperations: number;
    averageResponseTime: number;
    cacheHitRate: number;
    slowOperations: number;
    operationsByType: Record<string, number>;
  } {
    if (this.metrics.length === 0) {
      return {
        totalOperations: 0,
        averageResponseTime: 0,
        cacheHitRate: 0,
        slowOperations: 0,
        operationsByType: {}
      };
    }
    
    const totalOperations = this.metrics.length;
    const averageResponseTime = this.metrics.reduce((sum, m) => sum + m.duration_ms, 0) / totalOperations;
    const cacheHitRate = this.metrics.filter(m => m.cache_hit).length / totalOperations;
    const slowOperations = this.metrics.filter(m => m.duration_ms > 1000).length;
    
    const operationsByType = this.metrics.reduce((acc, m) => {
      acc[m.operation] = (acc[m.operation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalOperations,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      slowOperations,
      operationsByType
    };
  }
  
  /**
   * Obtém métricas recentes
   */
  static getRecentMetrics(limit: number = 50): PerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }
  
  /**
   * Limpa todas as métricas
   */
  static clearMetrics(): void {
    this.metrics = [];
    this.trackers.clear();
    localStorage.removeItem('performance_metrics');
  }
  
  /**
   * Carrega métricas persistidas
   */
  static loadPersistedMetrics(): void {
    try {
      const stored = localStorage.getItem('performance_metrics');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.metrics = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Erro ao carregar métricas persistidas:', error);
    }
  }
}

/**
 * Hook para monitoramento automático de performance
 */
export const usePerformanceTracking = (
  operation: string,
  dependencies: any[] = [],
  metadata: Record<string, any> = {}
) => {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics | null>(null);
  const trackerRef = React.useRef<string | null>(null);
  
  React.useEffect(() => {
    // Iniciar rastreamento
    trackerRef.current = PerformanceMonitor.start(operation, metadata);
    
    return () => {
      // Finalizar rastreamento
      if (trackerRef.current) {
        const result = PerformanceMonitor.end(trackerRef.current);
        setMetrics(result);
        trackerRef.current = null;
      }
    };
  }, dependencies);
  
  return metrics;
};

/**
 * Hook para monitoramento de saúde do sistema
 */
export const useSystemHealth = () => {
  const [health, setHealth] = React.useState<SystemHealth | null>(null);
  const [loading, setLoading] = React.useState(false);
  
  const checkHealth = React.useCallback(async (): Promise<SystemHealth> => {
    const startTime = performance.now();
    
    try {
      // Simular verificação de conectividade (adaptar conforme necessário)
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      }).catch(() => null);
      
      const dbResponseTime = performance.now() - startTime;
      
      // Verificar status do cache
      const cacheStats = OptimizedCache.getStats();
      const cacheStatus = cacheStats.localStorageEntries > 0 ? 'healthy' : 'degraded';
      
      // Calcular taxa de cache hit
      const performanceStats = PerformanceMonitor.getStats();
      
      const health: SystemHealth = {
        cache_status: cacheStatus,
        database_status: !response ? 'failed' : 
                        dbResponseTime > 2000 ? 'slow' : 'healthy',
        average_response_time: Math.round(dbResponseTime),
        cache_hit_rate: performanceStats.cacheHitRate,
        active_users: 1, // Implementar contagem real se necessário
        timestamp: new Date()
      };
      
      return health;
    } catch (error) {
      return {
        cache_status: 'failed',
        database_status: 'failed',
        average_response_time: -1,
        cache_hit_rate: 0,
        active_users: 0,
        timestamp: new Date()
      };
    }
  }, []);
  
  React.useEffect(() => {
    const performCheck = async () => {
      setLoading(true);
      try {
        const healthData = await checkHealth();
        setHealth(healthData);
      } catch (error) {
        console.error('Erro ao verificar saúde do sistema:', error);
      } finally {
        setLoading(false);
      }
    };
    
    performCheck();
    
    // Verificar a cada 30 segundos
    const interval = setInterval(performCheck, 30000);
    
    return () => clearInterval(interval);
  }, [checkHealth]);
  
  return { health, loading, refetch: checkHealth };
};

// Inicializar métricas persistidas ao carregar o módulo
PerformanceMonitor.loadPersistedMetrics();

export default PerformanceMonitor;