
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface DatabaseInfo {
  database_size: string;
  table_count: number;
}

export const useDatabaseUsage = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['database-usage'],
    queryFn: async () => {
      try {
        logger.info('Fetching database usage info');
        
        const { data, error } = await supabase
          .rpc('get_database_info');
        
        if (error) {
          logger.error('Database usage fetch error', error);
          throw error;
        }
        
        if (!data || data.length === 0) {
          logger.warn('No database info returned');
          return null;
        }
        
        logger.success('Database usage fetched successfully');
        return data[0] as DatabaseInfo;
      } catch (err) {
        logger.error('Database usage query failed', err);
        throw err;
      }
    },
    refetchInterval: 300000, // 5 minutos
    staleTime: 240000, // 4 minutos
    gcTime: 600000, // 10 minutos
    retry: 2,
  });

  return {
    databaseInfo: data,
    loading: isLoading,
    error
  };
};
