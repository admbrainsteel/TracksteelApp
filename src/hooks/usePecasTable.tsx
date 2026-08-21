
import { useState, useMemo, useEffect } from 'react';
import { Peca } from './usePecas';
import { supabase } from '@/integrations/supabase/client';
import { applyMarcaFilter } from '@/utils/rangeFilter';

export type SortField = 'of_number' | 'etapa_fase' | 'marca' | 'descricao' | 'prioridade' | 'quantidade' | 'peso_unitario' | 'peso_total' | 'perfil_principal' | 'tem_componentes';
export type SortOrder = 'asc' | 'desc';

export const usePecasTable = (pecas: Peca[]) => {
  const [ofFilter, setOfFilter] = useState('');
  const [faseFilter, setFaseFilter] = useState('');
  const [pecaFilter, setPecaFilter] = useState('');
  const [descricaoFilter, setDescricaoFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [semComponentesFilter, setSemComponentesFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('of_number');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedPecas, setSelectedPecas] = useState<Set<string>>(new Set());
  const [pecasWithComponente, setPecasWithComponente] = useState<Set<string>>(new Set());

  // Limpar seleções quando a lista de peças muda (após exclusões)
  useEffect(() => {
    const currentIds = new Set(pecas.map(p => p.id));
    const newSelectedPecas = new Set(
      Array.from(selectedPecas).filter(id => currentIds.has(id))
    );
    
    // Atualizar seleções apenas se houver mudança
    if (newSelectedPecas.size !== selectedPecas.size) {
      setSelectedPecas(newSelectedPecas);
    }
  }, [pecas]);

  const searchPecasByComponent = async (marca: string) => {
    try {
      const { data, error } = await supabase
        .from('pecas')
        .select('id')
        .ilike('descricao', `%${marca}%`);

      if (error) {
        console.error('Erro ao buscar peças por componente:', error);
        throw error;
      }

      if (data) {
        const pecasIds = new Set(data.map(item => item.id));
        setPecasWithComponente(pecasIds);
      } else {
        setPecasWithComponente(new Set());
      }
    } catch (error) {
      console.error('Erro ao buscar peças por componente:', error);
      throw error;
    }
  };

  const filteredAndSortedPecas = useMemo(() => {
    let filtered = pecas;

    // Filtro por OF
    if (ofFilter) {
      const term = ofFilter.toLowerCase();
      filtered = filtered.filter(peca =>
        peca.of_number.toLowerCase().includes(term)
      );
    }

    // Filtro por fase
    if (faseFilter) {
      const term = faseFilter.toLowerCase();
      filtered = filtered.filter(peca =>
        peca.etapa_fase?.toLowerCase().includes(term)
      );
    }

    // Filtro por peça com suporte a range
    if (pecaFilter) {
      filtered = filtered.filter(peca =>
        applyMarcaFilter(peca.marca, pecaFilter)
      );
    }

    // Filtro por descrição
    if (descricaoFilter) {
      const term = descricaoFilter.toLowerCase();
      filtered = filtered.filter(peca =>
        peca.descricao?.toLowerCase().includes(term)
      );
    }

    // Filtro por prioridade
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(peca => peca.prioridade === priorityFilter);
    }

    // Filtro por "Sem Componentes" - usando tem_componentes com lógica invertida
    if (semComponentesFilter !== 'all') {
      if (semComponentesFilter === 'sim') {
        filtered = filtered.filter(peca => peca.tem_componentes === false);
      } else if (semComponentesFilter === 'nao') {
        filtered = filtered.filter(peca => peca.tem_componentes === true);
      }
    }

    // Ordenação
    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      // Tratamento especial para campo booleano tem_componentes
      if (sortField === 'tem_componentes') {
        const aBoolean = aValue === true;
        const bBoolean = bValue === true;
        if (aBoolean === bBoolean) return 0;
        return sortOrder === 'asc' ? 
          (aBoolean ? 1 : -1) : 
          (bBoolean ? 1 : -1);
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

    return sorted;
  }, [pecas, ofFilter, faseFilter, pecaFilter, descricaoFilter, priorityFilter, semComponentesFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPecas(new Set(filteredAndSortedPecas.map(p => p.id)));
    } else {
      setSelectedPecas(new Set());
    }
  };

  const handleSelectPeca = (pecaId: string, checked: boolean) => {
    const newSelected = new Set(selectedPecas);
    if (checked) {
      newSelected.add(pecaId);
    } else {
      newSelected.delete(pecaId);
    }
    setSelectedPecas(newSelected);
  };

  const selectAll = filteredAndSortedPecas.length > 0 && 
    filteredAndSortedPecas.every(p => selectedPecas.has(p.id));

  // Calcular peso total com base nas seleções
  const pesoTotal = useMemo(() => {
    let pecasParaCalcular: Peca[];
    
    if (selectedPecas.size === 0) {
      // Se nenhuma checkbox estiver habilitada, usar todas as peças filtradas
      pecasParaCalcular = filteredAndSortedPecas;
    } else {
      // Se houver checkboxes habilitadas, usar apenas as peças selecionadas
      pecasParaCalcular = filteredAndSortedPecas.filter(p => selectedPecas.has(p.id));
    }
    
    return pecasParaCalcular.reduce((total, peca) => {
      const pTotal = (peca.peso_total && peca.peso_total > 0) 
        ? peca.peso_total 
        : (peca.quantidade || 1) * (peca.peso_unitario || 0);
      return total + pTotal;
    }, 0);
  }, [filteredAndSortedPecas, selectedPecas]);

  return {
    ofFilter,
    setOfFilter,
    faseFilter,
    setFaseFilter,
    pecaFilter,
    setPecaFilter,
    descricaoFilter,
    setDescricaoFilter,
    priorityFilter,
    setPriorityFilter,
    semComponentesFilter,
    setSemComponentesFilter,
    sortField,
    sortOrder,
    handleSort,
    filteredAndSortedPecas,
    selectedPecas,
    selectAll,
    handleSelectAll,
    handleSelectPeca,
    searchPecasByComponent,
    pecasWithComponente,
    pesoTotal
  };
};
