
import React from 'react';
import { Table, TableBody, TableHeader } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { Peca } from '@/hooks/usePecas';
import { usePecasTable } from '@/hooks/usePecasTable';
import { TableFilters } from './table/TableFilters';
import { TableActions } from './table/TableActions';
import { TableHeaderSortable } from './table/TableHeaderSortable';
import { PDFGenerator } from './table/PDFGenerator';
import { BatchEditButton } from './table/BatchEditButton';
import { TableRow as PecaTableRow } from './table/TableRow';
import { EmptyState } from './table/EmptyState';
import { toast } from 'sonner';

interface PecasTableProps {
  pecas: Peca[];
  onOpenComponentPopup: (pecaId: string) => void;
  onDeletePeca?: (pecaId: string) => void;
  onEditPeca?: (peca: Peca) => void;
  onDeleteLastImport?: () => void;
  onBatchUpdatePecas?: (pecaIds: string[], updates: any) => Promise<void>;
  hasRecentImport: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  ofNumber?: string;
}

export function PecasTable({ 
  pecas, 
  onOpenComponentPopup, 
  onDeletePeca, 
  onEditPeca, 
  onDeleteLastImport,
  onBatchUpdatePecas,
  hasRecentImport,
  canEdit = true,
  canDelete = true,
  ofNumber = ''
}: PecasTableProps) {
  const {
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
    pesoTotal
  } = usePecasTable(pecas);

  const handleExportCSV = () => {
    const selectedPecasArray = Array.from(selectedPecas);
    const pecasToExport = pecas.filter(peca => selectedPecasArray.includes(peca.id));

    if (pecasToExport.length === 0) {
      toast.error('Nenhuma peça selecionada para exportar.');
      return;
    }

    const csvContent = "data:text/csv;charset=utf-8," +
      [
        Object.keys(pecasToExport[0]).join(','),
        ...pecasToExport.map(peca => Object.values(peca).join(','))
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "pecas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteSelected = async () => {
    if (!canDelete || !onDeletePeca) {
      toast.error('Você não tem permissão para excluir peças');
      return;
    }
    
    if (window.confirm(`Tem certeza que deseja excluir ${selectedPecas.size} peças?`)) {
      try {
        for (const pecaId of selectedPecas) {
          await onDeletePeca(pecaId);
        }
        toast.success('Peças excluídas com sucesso!');
      } catch (error) {
        toast.error('Erro ao excluir peças.');
      }
    }
  };

  const handleBatchUpdate = async (updates: any) => {
    if (!canEdit || !onBatchUpdatePecas) {
      toast.error('Você não tem permissão para editar peças');
      throw new Error('Sem permissão');
    }

    const selectedPecasArray = Array.from(selectedPecas);
    await onBatchUpdatePecas(selectedPecasArray, updates);
  };

  const handleEditPeca = (peca: Peca) => {
    if (!onEditPeca) {
      return;
    }
    onEditPeca(peca);
  };

  const handleDeletePeca = (pecaId: string) => {
    if (!canDelete || !onDeletePeca) {
      toast.error('Você não tem permissão para excluir peças');
      return;
    }
    onDeletePeca(pecaId);
  };

  const hasActiveFilters = Boolean(ofFilter || faseFilter || pecaFilter || descricaoFilter || priorityFilter !== 'all' || semComponentesFilter !== 'all');

  return (
    <div className="space-y-4">
      <TableFilters 
        ofFilter={ofFilter}
        onOfFilterChange={setOfFilter}
        faseFilter={faseFilter}
        onFaseFilterChange={setFaseFilter}
        pecaFilter={pecaFilter}
        onPecaFilterChange={setPecaFilter}
        descricaoFilter={descricaoFilter}
        onDescricaoFilterChange={setDescricaoFilter}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        semComponentesFilter={semComponentesFilter}
        onSemComponentesFilterChange={setSemComponentesFilter}
        onSearchComponent={searchPecasByComponent}
        pesoTotal={pesoTotal}
      />

      <div className="flex justify-between items-center">
        <TableActions
          selectedPecas={selectedPecas}
          onExportCSV={handleExportCSV}
          onDeleteSelected={handleDeleteSelected}
          hasRecentImport={hasRecentImport}
          onDeleteLastImport={onDeleteLastImport || (() => {})}
        />

        <div className="flex items-center gap-2">
          {canEdit && onBatchUpdatePecas && (
            <BatchEditButton
              selectedPecas={selectedPecas}
              onBatchUpdate={handleBatchUpdate}
              disabled={!canEdit}
            />
          )}
          
          <PDFGenerator
            selectedPecas={selectedPecas}
            allPecas={filteredAndSortedPecas}
            ofNumber={ofNumber}
          />
        </div>
      </div>

      {filteredAndSortedPecas.length === 0 ? (
        <EmptyState hasActiveFilters={hasActiveFilters} />
      ) : (
        <div className="rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableHeaderSortable
                selectAll={selectAll}
                onSelectAll={handleSelectAll}
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
            </TableHeader>
            <TableBody>
              {filteredAndSortedPecas.map((peca) => (
                <PecaTableRow
                  key={peca.id}
                  peca={peca}
                  isSelected={selectedPecas.has(peca.id)}
                  onSelect={(checked) => handleSelectPeca(peca.id, checked)}
                  onEdit={() => handleEditPeca(peca)}
                  onDelete={() => handleDeletePeca(peca.id)}
                  onOpenComponentPopup={() => onOpenComponentPopup(peca.id)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
