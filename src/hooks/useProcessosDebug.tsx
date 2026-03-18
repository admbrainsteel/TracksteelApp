
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useProcessosDebug = () => {
  const [processos, setProcessos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verificarProcessos = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 DEBUG: Verificando processos na tabela...');
      
      // Verificar se a tabela existe e tem dados
      const { data: allProcessos, error: allError, count } = await supabase
        .from('processos_fabricacao')
        .select('*', { count: 'exact' });

      if (allError) {
        console.error('❌ DEBUG: Erro ao buscar todos os processos:', allError);
        setError(allError.message);
        return;
      }

      console.log(`📊 DEBUG: Total de processos na tabela: ${count}`);
      console.log('📋 DEBUG: Todos os processos:', allProcessos);

      // Verificar processos ativos
      const { data: processosAtivos, error: ativosError } = await supabase
        .from('processos_fabricacao')
        .select('*')
        .eq('ativo', true)
        .order('ordem');

      if (ativosError) {
        console.error('❌ DEBUG: Erro ao buscar processos ativos:', ativosError);
        setError(ativosError.message);
        return;
      }

      console.log(`✅ DEBUG: Processos ativos encontrados: ${processosAtivos?.length || 0}`);
      console.log('📋 DEBUG: Processos ativos:', processosAtivos);

      setProcessos(processosAtivos || []);
      
    } catch (err) {
      console.error('❌ DEBUG: Erro inesperado:', err);
      setError('Erro inesperado ao verificar processos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verificarProcessos();
  }, []);

  return {
    processos,
    loading,
    error,
    verificarProcessos
  };
};
