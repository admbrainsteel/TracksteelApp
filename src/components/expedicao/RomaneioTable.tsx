
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Eye, Trash2, Printer } from 'lucide-react';
import { RomaneioExpedicao } from '@/hooks/useRomaneios';
import { formatBrazilianDateFromString } from '@/utils/dateTimeUtils';
import { RomaneioReportModal } from './RomaneioReportModal';


interface RomaneioTableProps {
  romaneios: RomaneioExpedicao[];
  onEdit: (romaneio: RomaneioExpedicao) => void;
  onView: (romaneio: RomaneioExpedicao) => void;
  onDelete: (id: string) => void;
  onPrint: (romaneio: RomaneioExpedicao) => void;
  loading?: boolean;
}

export const RomaneioTable: React.FC<RomaneioTableProps> = ({
  romaneios,
  onEdit,
  onView,
  onDelete,
  onPrint,
  loading = false
}) => {
  const [selectedRomaneioForReport, setSelectedRomaneioForReport] = useState<RomaneioExpedicao | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const handlePrintReport = (romaneio: RomaneioExpedicao) => {
    setSelectedRomaneioForReport(romaneio);
    setShowReportModal(true);
  };

  const handleCloseReportModal = () => {
    setShowReportModal(false);
    setSelectedRomaneioForReport(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Em planejamento':
        return 'bg-orange-100 text-orange-800';
      case 'Confirmado':
        return 'bg-blue-100 text-blue-800';
      case 'Entregue':
        return 'bg-blue-100 text-blue-800';
      case 'Conferido em Obra':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (prioridade: string) => {
    switch (prioridade) {
      case 'Urgente':
        return 'bg-red-100 text-red-800';
      case 'Normal':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-full"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded w-full"></div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="w-full overflow-x-auto">
        <Table disableOverflow>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Número</TableHead>
              <TableHead className="w-[100px]">OF</TableHead>
              <TableHead className="w-[110px]">Data Romaneio</TableHead>
              <TableHead className="w-[110px]">Data Entrega</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Prioridade</TableHead>
              <TableHead className="w-[120px]">Transporte</TableHead>
              <TableHead className="w-[100px] text-right">Peso Total</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {romaneios.map((romaneio) => (
              <TableRow key={romaneio.id}>
                <TableCell className="font-medium">
                  {romaneio.numero_romaneio}
                </TableCell>
                <TableCell>{romaneio.of_number}</TableCell>
                <TableCell>
                  {formatBrazilianDateFromString(romaneio.data_romaneio)}
                </TableCell>
                <TableCell>
                  {romaneio.data_prevista_entrega 
                    ? formatBrazilianDateFromString(romaneio.data_prevista_entrega)
                    : 'N/A'
                  }
                </TableCell>
                <TableCell>
                  <Badge className={`text-xs ${getStatusColor(romaneio.status)}`}>
                    {romaneio.status === 'Confirmado' ? 'Entregue' : romaneio.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={`text-xs ${getPriorityColor(romaneio.prioridade)}`}>
                    {romaneio.prioridade}
                  </Badge>
                </TableCell>
                <TableCell>
                  {romaneio.tipo_transporte || 'N/A'}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {romaneio.peso_total_romaneio?.toFixed(2) || '0.00'} kg
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(romaneio)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(romaneio)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePrintReport(romaneio)}
                      className="h-8 w-8 p-0"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(romaneio.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Relatório */}
      {selectedRomaneioForReport && (
        <RomaneioReportModal
          isOpen={showReportModal}
          onClose={handleCloseReportModal}
          romaneio={selectedRomaneioForReport}
        />
      )}
    </>
  );
};
