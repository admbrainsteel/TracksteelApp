
import { useState, useEffect } from 'react';

interface FilterMemory {
  selectedOF: string;
  selectedFase: string;
}

const FILTER_MEMORY_KEY = 'prioridades-fabricacao-filters';

export const useFilterMemory = () => {
  const [filters, setFilters] = useState<FilterMemory>({
    selectedOF: '',
    selectedFase: ''
  });

  // Carregar filtros salvos na inicialização
  useEffect(() => {
    const savedFilters = localStorage.getItem(FILTER_MEMORY_KEY);
    if (savedFilters) {
      try {
        const parsedFilters = JSON.parse(savedFilters);
        setFilters(parsedFilters);
      } catch (error) {
        console.log('Erro ao carregar filtros salvos:', error);
      }
    }
  }, []);

  // Salvar filtros sempre que mudarem
  const updateFilters = (newFilters: Partial<FilterMemory>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    localStorage.setItem(FILTER_MEMORY_KEY, JSON.stringify(updatedFilters));
  };

  return {
    filters,
    updateFilters
  };
};
