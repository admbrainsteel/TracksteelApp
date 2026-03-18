
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Catalogo {
  id: string;
  titulo: string;
  categoria: string;
  disciplina: string;
  palavras_chave: string[];
  conteudo: string;
  numero_paginas: number | null;
  arquivo_urls?: string[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export function useCatalogos() {
  const [catalogos, setCatalogos] = useState<Catalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [disciplinaFilter, setDisciplinaFilter] = useState('');

  const fetchCatalogos = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('catalogos')
        .select('*')
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (searchTerm) {
        query = query.or(`titulo.ilike.%${searchTerm}%,conteudo.ilike.%${searchTerm}%,disciplina.ilike.%${searchTerm}%`);
      }

      if (categoriaFilter && categoriaFilter !== 'all') {
        query = query.eq('categoria', categoriaFilter);
      }

      if (disciplinaFilter && disciplinaFilter !== 'all') {
        query = query.eq('disciplina', disciplinaFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCatalogos(data || []);
    } catch (error) {
      console.error('Erro ao buscar catálogos:', error);
      toast.error('Erro ao carregar catálogos');
    } finally {
      setLoading(false);
    }
  };

  const createCatalogo = async (catalogoData: Omit<Catalogo, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    try {
      const { data, error } = await supabase
        .from('catalogos')
        .insert([{
          ...catalogoData,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      
      setCatalogos(prev => [data, ...prev]);
      toast.success('Catálogo criado com sucesso!');
      return data;
    } catch (error) {
      console.error('Erro ao criar catálogo:', error);
      toast.error('Erro ao criar catálogo');
      throw error;
    }
  };

  const updateCatalogo = async (id: string, catalogoData: Partial<Catalogo>) => {
    try {
      const { data, error } = await supabase
        .from('catalogos')
        .update(catalogoData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setCatalogos(prev => prev.map(cat => cat.id === id ? data : cat));
      toast.success('Catálogo atualizado com sucesso!');
      return data;
    } catch (error) {
      console.error('Erro ao atualizar catálogo:', error);
      toast.error('Erro ao atualizar catálogo');
      throw error;
    }
  };

  const deleteCatalogo = async (id: string) => {
    try {
      // Buscar o catálogo para obter os URLs dos arquivos
      const { data: catalogo } = await supabase
        .from('catalogos')
        .select('arquivo_urls')
        .eq('id', id)
        .single();

      // Deletar arquivos do storage se existirem
      if (catalogo?.arquivo_urls && catalogo.arquivo_urls.length > 0) {
        const fileNames = catalogo.arquivo_urls.map(url => {
          const parts = url.split('/');
          return parts[parts.length - 1];
        });

        await supabase.storage
          .from('catalogo-documents')
          .remove(fileNames);
      }

      const { error } = await supabase
        .from('catalogos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCatalogos(prev => prev.filter(cat => cat.id !== id));
      toast.success('Catálogo excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir catálogo:', error);
      toast.error('Erro ao excluir catálogo');
      throw error;
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoriaFilter('');
    setDisciplinaFilter('');
  };

  useEffect(() => {
    fetchCatalogos();
  }, [searchTerm, categoriaFilter, disciplinaFilter]);

  return {
    catalogos,
    loading,
    searchTerm,
    setSearchTerm,
    categoriaFilter,
    setCategoriaFilter,
    disciplinaFilter,
    setDisciplinaFilter,
    createCatalogo,
    updateCatalogo,
    deleteCatalogo,
    clearFilters
  };
}
