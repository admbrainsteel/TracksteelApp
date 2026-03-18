import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface CSVRow {
  // Campos da peça principal
  of_number: string;
  etapa_fase: string;
  marca: string;
  descricao: string;
  quantidade: string;
  peso_unitario: string;
  peso_total: string;
  tratamento_superficial: string;
  material: string;
  perfil_principal: string;
  tem_componentes: string;
  // Campos do componente
  marca_componente: string;
  descricao_componente: string;
  perfil_componente: string;
  peso_unitario_componente: string;
  quantidade_por_peca: string;
}

interface ProcessedPeca {
  of_number: string;
  etapa_fase: string;
  marca: string;
  descricao: string;
  quantidade: number;
  peso_unitario: number;
  peso_total: number;
  tratamento_superficial: string;
  material: string;
  perfil_principal: string;
  tem_componentes: boolean;
  user_id: string;
  componentes: {
    marca_componente: string;
    descricao: string;
    perfil: string;
    peso_unitario: number;
    quantidade_por_peca: number;
  }[];
}

export function usePecasCSVImport() {
  const { user } = useAuth();
  const [importLoading, setImportLoading] = useState(false);

  const exportCompleteTemplateCSV = () => {
    const headers = [
      'of_number',
      'etapa_fase', 
      'marca',
      'descricao',
      'quantidade',
      'peso_unitario',
      'peso_total',
      'tratamento_superficial',
      'material',
      'perfil_principal',
      'tem_componentes',
      'marca_componente',
      'descricao_componente',
      'perfil_componente',
      'peso_unitario_componente',
      'quantidade_por_peca'
    ];

    // Exemplo com dados para orientação
    const exampleData = [
      '12345,Montagem,P001,Viga Principal,5,150.5,752.5,Galvanizado,Aço,IPE200,true,C001,Parafuso M16,M16x50,0.2,8',
      '12345,Montagem,P001,Viga Principal,5,150.5,752.5,Galvanizado,Aço,IPE200,true,C002,Porca M16,M16,0.1,8',
      '12346,Soldagem,P002,Coluna,3,200.0,600.0,Pintado,Aço,HEA300,false,,,,0,0'
    ];

    const csvContent = [
      headers.join(','),
      ...exampleData
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_pecas_completo.csv';
    link.click();

    toast.success('Modelo CSV completo baixado com sucesso!');
  };

  const exportExampleDataCSV = async () => {
    try {
      // Buscar peças do banco de dados
      const { data: pecas, error: pecasError } = await supabase
        .from('pecas')
        .select('*')
        .limit(5);

      if (pecasError) throw pecasError;

      if (!pecas || pecas.length === 0) {
        toast.error('Nenhuma peça encontrada no banco de dados');
        return;
      }

      const headers = [
        'of_number',
        'etapa_fase',
        'marca',
        'descricao',
        'quantidade',
        'peso_unitario',
        'peso_total',
        'tratamento_superficial',
        'material',
        'perfil_principal',
        'tem_componentes',
        'marca_componente',
        'descricao_componente',
        'perfil_componente',
        'peso_unitario_componente',
        'quantidade_por_peca'
      ];

      const csvRows: string[] = [headers.join(',')];

      for (const peca of pecas) {
        // Buscar componentes da peça
        const { data: componentes } = await supabase
          .from('componentes_peca')
          .select('*')
          .eq('peca_id', peca.id);

        if (componentes && componentes.length > 0) {
          // Para cada componente, criar uma linha
          componentes.forEach(comp => {
            const row = [
              peca.of_number || '',
              peca.etapa_fase || '',
              peca.marca || '',
              peca.descricao || '',
              peca.quantidade || 0,
              peca.peso_unitario || 0,
              peca.peso_total || 0,
              peca.tratamento_superficial || '',
              peca.material || '',
              peca.perfil_principal || '',
              peca.tem_componentes ? 'true' : 'false',
              comp.marca_componente || '',
              comp.descricao || '',
              comp.perfil || '',
              comp.peso_unitario || 0,
              comp.quantidade_por_peca || 1
            ];
            csvRows.push(row.map(field => `"${field}"`).join(','));
          });
        } else {
          // Peça sem componentes
          const row = [
            peca.of_number || '',
            peca.etapa_fase || '',
            peca.marca || '',
            peca.descricao || '',
            peca.quantidade || 0,
            peca.peso_unitario || 0,
            peca.peso_total || 0,
            peca.tratamento_superficial || '',
            peca.material || '',
            peca.perfil_principal || '',
            peca.tem_componentes ? 'true' : 'false',
            '',
            '',
            '',
            0,
            0
          ];
          csvRows.push(row.map(field => `"${field}"`).join(','));
        }
      }

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `exemplo_dados_reais_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast.success('Arquivo de exemplo com dados reais exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar dados de exemplo:', error);
      toast.error('Erro ao gerar arquivo de exemplo');
    }
  };

  const checkExistingPieces = async (pecas: ProcessedPeca[]) => {
    console.log('🔍 Verificando peças existentes:', pecas);
    const duplicates: string[] = [];
    const existingPiecesForComponents: { [key: string]: string } = {};

    for (const peca of pecas) {
      console.log(`🔍 Verificando peça: OF=${peca.of_number}, Fase=${peca.etapa_fase}, Marca=${peca.marca}`);
      
      const { data: existingPecas, error } = await supabase
        .from('pecas')
        .select('id, marca, of_number, etapa_fase')
        .eq('of_number', peca.of_number)
        .eq('etapa_fase', peca.etapa_fase)
        .eq('marca', peca.marca);

      if (error) {
        console.error('❌ Erro ao verificar peça existente:', error);
        continue;
      }

      console.log('📋 Peças encontradas no banco:', existingPecas);

      if (existingPecas && existingPecas.length > 0) {
        const existingPeca = existingPecas[0];
        console.log(`⚠️ Peça já existe: ${existingPeca.marca} (${existingPeca.of_number}/${existingPeca.etapa_fase})`);
        
        if (peca.componentes.length > 0) {
          let hasNewComponents = false;
          
          for (const componente of peca.componentes) {
            const { data: existingComponent } = await supabase
              .from('componentes_peca')
              .select('id, marca_componente')
              .eq('peca_id', existingPeca.id)
              .eq('marca_componente', componente.marca_componente.trim());

            if (!existingComponent || existingComponent.length === 0) {
              console.log(`🆕 Componente ${componente.marca_componente} é NOVO para a peça ${existingPeca.marca}`);
              hasNewComponents = true;
            }
          }

          if (hasNewComponents) {
            existingPiecesForComponents[`${peca.of_number}-${peca.etapa_fase}-${peca.marca}`] = existingPeca.id;
          } else {
            duplicates.push(`Peça ${peca.marca} (OF: ${peca.of_number}, Fase: ${peca.etapa_fase}) já está cadastrada`);
          }
        } else {
          duplicates.push(`Peça ${peca.marca} (OF: ${peca.of_number}, Fase: ${peca.etapa_fase}) já está cadastrada`);
        }
      }
    }

    console.log('❌ Duplicatas encontradas:', duplicates);
    console.log('🔄 Peças existentes para adicionar componentes:', existingPiecesForComponents);

    return { duplicates, existingPiecesForComponents };
  };

  const importCompleteCSV = async (file: File, onSuccess: () => void) => {
    console.log('🚀 Iniciando importação CSV:', file.name);
    
    if (!file || !file.name.endsWith('.csv')) {
      toast.error('Selecione um arquivo CSV válido');
      return;
    }

    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    setImportLoading(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      console.log('📄 Total de linhas no arquivo:', lines.length);
      
      if (lines.length < 2) {
        toast.error('Arquivo CSV deve conter pelo menos uma linha de dados');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const expectedHeaders = [
        'of_number', 'etapa_fase', 'marca', 'descricao', 'quantidade', 
        'peso_unitario', 'peso_total', 'tratamento_superficial', 'material', 
        'perfil_principal', 'tem_componentes', 'marca_componente', 
        'descricao_componente', 'perfil_componente', 'peso_unitario_componente', 
        'quantidade_por_peca'
      ];
      
      console.log('📋 Headers encontrados:', headers);
      console.log('📋 Headers esperados:', expectedHeaders);
      
      const hasRequiredHeaders = expectedHeaders.every(header => headers.includes(header));
      if (!hasRequiredHeaders) {
        const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
        console.error('❌ Headers faltando:', missingHeaders);
        toast.error('Arquivo CSV deve conter todas as colunas necessárias. Faltam: ' + missingHeaders.join(', '));
        return;
      }

      // Processar linhas do CSV
      const csvRows: CSVRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        
        if (values.length !== headers.length) {
          console.warn(`⚠️ Linha ${i + 1} tem ${values.length} valores, esperado ${headers.length}`);
          continue;
        }

        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        csvRows.push(row as CSVRow);
      }

      console.log('📊 Dados do CSV processados:', csvRows.length, 'linhas');

      // Agrupar por peça principal
      const pecasMap = new Map<string, ProcessedPeca>();

      csvRows.forEach(row => {
        const pecaKey = `${row.of_number.trim()}-${row.etapa_fase.trim()}-${row.marca.trim()}`;
        
        if (!pecasMap.has(pecaKey)) {
          // Criar nova peça
          const temComponentes = ['true', '1', 'sim', 'yes'].includes(row.tem_componentes.toLowerCase().trim());
          
          pecasMap.set(pecaKey, {
            of_number: row.of_number.trim(),
            etapa_fase: row.etapa_fase.trim(),
            marca: row.marca.trim(),
            descricao: row.descricao.trim(),
            quantidade: parseInt(row.quantidade) || 0,
            peso_unitario: parseFloat(row.peso_unitario) || 0,
            peso_total: parseFloat(row.peso_total) || 0,
            tratamento_superficial: row.tratamento_superficial.trim(),
            material: row.material.trim(),
            perfil_principal: row.perfil_principal.trim(),
            tem_componentes: temComponentes,
            user_id: user.id,
            componentes: []
          });
        }

        // Adicionar componente se existir
        if (row.marca_componente && row.marca_componente.trim()) {
          const peca = pecasMap.get(pecaKey)!;
          peca.componentes.push({
            marca_componente: row.marca_componente.trim(),
            descricao: row.descricao_componente?.trim() || '',
            perfil: row.perfil_componente?.trim() || '',
            peso_unitario: parseFloat(row.peso_unitario_componente) || 0,
            quantidade_por_peca: parseInt(row.quantidade_por_peca) || 1
          });
        }
      });

      const pecas = Array.from(pecasMap.values());
      console.log('🔢 Peças processadas:', pecas.length);

      if (pecas.length === 0) {
        toast.error('Nenhuma peça válida encontrada no arquivo');
        return;
      }

      // Verificar duplicatas
      const { duplicates, existingPiecesForComponents } = await checkExistingPieces(pecas);

      // Separar peças novas das que só precisam de componentes adicionais
      const newPecas = pecas.filter(peca => 
        !existingPiecesForComponents[`${peca.of_number}-${peca.etapa_fase}-${peca.marca}`]
      );

      console.log('✨ Peças novas para inserir:', newPecas.length);
      console.log('🔄 Peças existentes para adicionar componentes:', Object.keys(existingPiecesForComponents).length);

      let totalPecasInseridas = 0;
      let totalComponentesInseridos = 0;

      // Inserir peças principais novas
      if (newPecas.length > 0) {
        console.log('💾 Inserindo peças principais...');
        
        const pecasData = newPecas.map(peca => ({
          of_number: peca.of_number,
          etapa_fase: peca.etapa_fase,
          marca: peca.marca,
          descricao: peca.descricao,
          quantidade: peca.quantidade,
          peso_unitario: peca.peso_unitario,
          peso_total: peca.peso_total,
          tratamento_superficial: peca.tratamento_superficial,
          material: peca.material,
          perfil_principal: peca.perfil_principal,
          tem_componentes: peca.tem_componentes,
          user_id: peca.user_id
        }));

        const { data: pecasInseridas, error: pecasError } = await supabase
          .from('pecas')
          .insert(pecasData)
          .select('id, marca, of_number, etapa_fase');

        if (pecasError) {
          console.error('❌ Erro ao inserir peças:', pecasError);
          throw new Error(`Erro ao inserir peças: ${pecasError.message}`);
        }

        totalPecasInseridas = pecasInseridas?.length || 0;
        console.log('✅ Peças inseridas:', totalPecasInseridas);

        // Inserir componentes das peças novas
        for (const peca of newPecas) {
          if (peca.componentes.length > 0) {
            const pecaInserida = pecasInseridas?.find(p => 
              p.marca === peca.marca && 
              p.of_number === peca.of_number && 
              p.etapa_fase === peca.etapa_fase
            );
            
            if (pecaInserida) {
              const componentesData = peca.componentes.map(comp => ({
                peca_id: pecaInserida.id,
                marca_componente: comp.marca_componente,
                descricao: comp.descricao,
                perfil: comp.perfil,
                peso_unitario: comp.peso_unitario,
                quantidade_por_peca: comp.quantidade_por_peca,
                user_id: user.id
              }));

              console.log(`🔧 Inserindo ${componentesData.length} componentes para peça ${peca.marca}...`);

              const { error: componentesError } = await supabase
                .from('componentes_peca')
                .insert(componentesData);

              if (componentesError) {
                console.error('❌ Erro ao inserir componentes:', componentesError);
                throw new Error(`Erro ao inserir componentes: ${componentesError.message}`);
              }
              
              totalComponentesInseridos += componentesData.length;
            }
          }
        }
      }

      // Inserir componentes adicionais em peças existentes
      for (const [pecaKey, pecaId] of Object.entries(existingPiecesForComponents)) {
        const peca = pecas.find(p => `${p.of_number}-${p.etapa_fase}-${p.marca}` === pecaKey);
        if (peca && peca.componentes.length > 0) {
          // Filtrar apenas os componentes que ainda não existem
          const componentsToFilter = [];
          
          for (const componente of peca.componentes) {
            const { data: existingComponent } = await supabase
              .from('componentes_peca')
              .select('id')
              .eq('peca_id', pecaId)
              .eq('marca_componente', componente.marca_componente.trim());

            if (!existingComponent || existingComponent.length === 0) {
              componentsToFilter.push(componente);
            }
          }

          if (componentsToFilter.length > 0) {
            const componentesData = componentsToFilter.map(comp => ({
              peca_id: pecaId,
              marca_componente: comp.marca_componente,
              descricao: comp.descricao,
              perfil: comp.perfil,
              peso_unitario: comp.peso_unitario,
              quantidade_por_peca: comp.quantidade_por_peca,
              user_id: user.id
            }));

            console.log(`🔧 Inserindo ${componentesData.length} componentes adicionais...`);

            const { error: componentesError } = await supabase
              .from('componentes_peca')
              .insert(componentesData);

            if (componentesError) {
              console.error('❌ Erro ao inserir componentes adicionais:', componentesError);
              throw new Error(`Erro ao inserir componentes adicionais: ${componentesError.message}`);
            }
            
            totalComponentesInseridos += componentesData.length;
          }
        }
      }

      let successMessage = '';
      if (totalPecasInseridas > 0 && totalComponentesInseridos > 0) {
        successMessage = `✅ ${totalPecasInseridas} peça(s) e ${totalComponentesInseridos} componente(s) importados com sucesso!`;
      } else if (totalPecasInseridas > 0) {
        successMessage = `✅ ${totalPecasInseridas} peça(s) importada(s) com sucesso!`;
      } else if (totalComponentesInseridos > 0) {
        successMessage = `✅ ${totalComponentesInseridos} componente(s) adicionado(s) a peças existentes com sucesso!`;
      } else {
        successMessage = 'ℹ️ Nenhuma peça nova foi importada. Todas as peças já existem no sistema.';
      }

      console.log('🎉 Importação concluída:', successMessage);
      toast.success(successMessage);
      onSuccess();
      
    } catch (error) {
      console.error('❌ Erro ao importar CSV completo:', error);
      toast.error(`Erro ao importar arquivo CSV: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setImportLoading(false);
    }
  };

  return {
    importLoading,
    exportCompleteTemplateCSV,
    exportExampleDataCSV,
    importCompleteCSV
  };
}
