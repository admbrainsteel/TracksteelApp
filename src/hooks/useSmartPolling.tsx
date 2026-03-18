
import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface SmartPollingOptions {
  queryKey: string[];
  interval: number;
  enabled?: boolean;
  maxRetries?: number;
  onError?: (error: Error) => void;
}

export const useSmartPolling = ({
  queryKey,
  interval,
  enabled = true,
  maxRetries = 3,
  onError
}: SmartPollingOptions) => {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const isActiveRef = useRef(true);

  const startPolling = useCallback(() => {
    if (!enabled || !isActiveRef.current) return;

    intervalRef.current = setInterval(async () => {
      try {
        if (!document.hidden && isActiveRef.current) {
          await queryClient.invalidateQueries({ queryKey });
          retryCountRef.current = 0; // Reset retry count on success
        }
      } catch (error) {
        retryCountRef.current++;
        
        if (retryCountRef.current >= maxRetries) {
          stopPolling();
          onError?.(error as Error);
        }
      }
    }, interval);
  }, [queryKey, interval, enabled, maxRetries, onError, queryClient]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Pausar quando a aba não está ativa
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else if (enabled && isActiveRef.current) {
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [startPolling, stopPolling, enabled]);

  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return stopPolling;
  }, [enabled, startPolling, stopPolling]);

  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  return { startPolling, stopPolling };
};
