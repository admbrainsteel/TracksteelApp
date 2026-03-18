
import { useState, useEffect, useMemo } from 'react';
import { useComponentesPeca } from '@/hooks/useComponentesPeca';
import { useDebounce } from '@/hooks/useDebounce';

export interface ComponenteAgrupado {
  marca_componente: string;
  descricao: string;
  perfil: string;
  peso_unitario: number;
  quantidade_total: number;
  peca_pai_info: string;
  componente_ids: string[];
  peca_ids: string[];
}

// Cache local para evitar buscas repetitivas
const componentesCache = new Map<string, ComponenteAgrupado[]>();
const CACHE_DURATION = 30000; // 30 segundos

export const useComponentesAgrupados = (ofNumber: string, fase: string, pecasData: any[] = []) => {
  const [componentesAgrupados, setComponentesAgrupados] = useState<ComponenteAgrupado[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Debounce para evitar chamadas em sequência rápida
  const debouncedOfNumber = useDebounce(ofNumber, 300);
  const debouncedFase = useDebounce(fase, 300);

  // Buscar peças da OF/fase que têm componentes usando os dados passados como parâmetro
  const pecasComComponentes = useMemo(() => {
    if (!pecasData || !Array.isArray(pecasData) || !debouncedOfNumber || !debouncedFase) {
      return [];
    }
    
    return pecasData.filter(peca => 
      peca && 
      peca.of_number === debouncedOfNumber && 
      peca.etapa_fase === debouncedFase &&
      peca.tem_componentes === true // Apenas peças com componentes
    );
  }, [pecasData, debouncedOfNumber, debouncedFase]);

  // Gerar chave única para cache
  const cacheKey = useMemo(() => {
    if (!debouncedOfNumber || !debouncedFase || pecasComComponentes.length === 0) {
      return '';
    }
    const pecaIds = pecasComComponentes.map(p => p.id).sort().join(',');
    return `${debouncedOfNumber}_${debouncedFase}_${pecaIds}`;
  }, [debouncedOfNumber, debouncedFase, pecasComComponentes]);

  const pecaIds = pecasComComponentes.map(peca => peca.id);
  
  // Só buscar componentes se há peças com componentes
  const shouldFetchComponents = pecaIds.length > 0 && cacheKey;
  
  const { componentes, loading: componentesLoading } = useComponentesPeca(
    shouldFetchComponents ? pecaIds : []
  );

  // Verificar cache primeiro
  useEffect(() => {
    if (!cacheKey) {
      setComponentesAgrupados([]);
      setLoading(false);
      return;
    }

    const cached = componentesCache.get(cacheKey);
    if (cached && Date.now() - (cached as any).timestamp < CACHE_DURATION) {
      console.log('📦 Cache HIT para componentes agrupados:', cacheKey);
      setComponentesAgrupados(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
  }, [cacheKey]);

  // Processar componentes quando disponíveis
  useEffect(() => {
    if (!cacheKey || componentesLoading || !componentes || componentes.length === 0) {
      if (!componentesLoading && cacheKey && componentes.length === 0) {
        // Não há componentes para essas peças, salvar cache vazio
        const emptyResult: ComponenteAgrupado[] = [];
        (emptyResult as any).timestamp = Date.now();
        componentesCache.set(cacheKey, emptyResult);
        setComponentesAgrupados(emptyResult);
        setLoading(false);
      }
      return;
    }

    console.log('🔄 Processando componentes agrupados para cache:', cacheKey);
    
    const grupos = new Map<string, ComponenteAgrupado>();

    componentes.forEach(comp => {
      const marca = comp.marca_componente;
      const pecaPai = pecasComComponentes.find(p => p.id === comp.peca_id);
      
      if (!pecaPai) return;

      if (grupos.has(marca)) {
        const grupo = grupos.get(marca)!;
        grupo.quantidade_total += comp.quantidade_por_peca * (pecaPai.quantidade || 0);
        grupo.peca_pai_info += `, ${pecaPai.marca}`;
        grupo.componente_ids.push(comp.id);
        grupo.peca_ids.push(comp.peca_id);
      } else {
        grupos.set(marca, {
          marca_componente: marca,
          descricao: comp.descricao || '',
          perfil: comp.perfil || '',
          peso_unitario: comp.peso_unitario,
          quantidade_total: comp.quantidade_por_peca * (pecaPai.quantidade || 0),
          peca_pai_info: pecaPai.marca,
          componente_ids: [comp.id],
          peca_ids: [comp.peca_id]
        });
      }
    });

    const resultado = Array.from(grupos.values());
    
    // Salvar no cache
    (resultado as any).timestamp = Date.now();
    componentesCache.set(cacheKey, resultado);
    
    setComponentesAgrupados(resultado);
    setLoading(false);
  }, [componentes, componentesLoading, pecasComComponentes, cacheKey]);

  return {
    componentesAgrupados,
    loading: loading || componentesLoading
  };
};
