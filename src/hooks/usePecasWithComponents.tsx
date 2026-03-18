
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function usePecasWithComponents() {
  const [pecasWithComponents, setPecasWithComponents] = useState<Set<string>>(new Set());

  const loadPecasWithComponents = async () => {
    try {
      const { data, error } = await supabase
        .from('componentes_peca')
        .select('peca_id');

      if (error) throw error;

      const pecaIds = new Set<string>(data?.map(item => item.peca_id) || []);
      setPecasWithComponents(pecaIds);
    } catch (error) {
      console.error('Erro ao carregar peças com componentes:', error);
    }
  };

  useEffect(() => {
    loadPecasWithComponents();
  }, []);

  return {
    pecasWithComponents,
    loadPecasWithComponents,
    hasComponents: (pecaId: string) => pecasWithComponents.has(pecaId)
  };
}
