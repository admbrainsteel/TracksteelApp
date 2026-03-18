
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ComponentePeca } from './useComponentesPeca';

export function useComponentesTableActions() {
  const [importLoading, setImportLoading] = useState(false);

  const exportTemplateCSV = () => {
    const headers = [
      'marca_componente',
      'descricao',
      'perfil',
      'peso_unitario',
      'quantidade_por_peca'
    ];

    const csvContent = headers.join(',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_componentes.csv';
    link.click();

    toast.success('Template CSV de componentes baixado com sucesso!');
  };

  const exportComponentesCSV = (componentes: ComponentePeca[], pecaMarca: string) => {
    if (componentes.length === 0) {
      toast.error('Nenhum componente para exportar');
      return;
    }

    const headers = [
      'marca_componente',
      'descricao',
      'perfil',
      'peso_unitario',
      'quantidade_por_peca'
    ];

    const csvData = componentes.map(comp => [
      comp.marca_componente,
      comp.descricao || '',
      comp.perfil || '',
      comp.peso_unitario,
      comp.quantidade_por_peca
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `componentes_${pecaMarca}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success(`${componentes.length} componentes exportados com sucesso!`);
  };

  const importComponentesCSV = async (file: File, pecaId: string, userId: string, onSuccess: () => void) => {
    if (!file || !file.name.endsWith('.csv')) {
      toast.error('Selecione um arquivo CSV válido');
      return;
    }

    setImportLoading(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('Arquivo CSV deve conter pelo menos uma linha de dados');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const expectedHeaders = ['marca_componente', 'descricao', 'perfil', 'peso_unitario', 'quantidade_por_peca'];
      
      const hasRequiredHeaders = expectedHeaders.every(header => headers.includes(header));
      if (!hasRequiredHeaders) {
        toast.error('Arquivo CSV deve conter as colunas: ' + expectedHeaders.join(', '));
        return;
      }

      const componentes = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        
        if (values.length !== headers.length) continue;

        const componenteData: any = {
          peca_id: pecaId,
          user_id: userId
        };

        headers.forEach((header, index) => {
          let value = values[index];
          
          if (header === 'peso_unitario') {
            componenteData[header] = parseFloat(value) || 0;
          } else if (header === 'quantidade_por_peca') {
            componenteData[header] = parseInt(value) || 1;
          } else {
            componenteData[header] = value || null;
          }
        });

        if (!componenteData.marca_componente) continue;
        
        componentes.push(componenteData);
      }

      if (componentes.length === 0) {
        toast.error('Nenhum componente válido encontrado no arquivo');
        return;
      }

      const { error } = await supabase
        .from('componentes_peca')
        .insert(componentes);

      if (error) throw error;

      toast.success(`${componentes.length} componente(s) importado(s) com sucesso!`);
      onSuccess();
      
    } catch (error) {
      console.error('Erro ao importar componentes:', error);
      toast.error('Erro ao importar componentes do CSV');
    } finally {
      setImportLoading(false);
    }
  };

  return {
    importLoading,
    exportTemplateCSV,
    exportComponentesCSV,
    importComponentesCSV
  };
}
