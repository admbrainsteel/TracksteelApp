
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { useMobileResponsive, getTableResponsiveClasses } from '@/hooks/useMobileResponsive';

interface ResponsiveTableProps {
  headers: string[];
  data: any[];
  renderRow: (item: any, index: number) => React.ReactNode;
  renderMobileCard?: (item: any, index: number) => React.ReactNode;
  emptyMessage?: string;
  loading?: boolean;
}

export function ResponsiveTable({ 
  headers, 
  data, 
  renderRow, 
  renderMobileCard, 
  emptyMessage = "Nenhum item encontrado",
  loading = false 
}: ResponsiveTableProps) {
  const { isMobile } = useMobileResponsive();
  const tableClasses = getTableResponsiveClasses(isMobile);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  // Mobile card view
  if (isMobile && renderMobileCard) {
    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <Card key={index} className="mobile-card">
            <CardContent className="p-4">
              {renderMobileCard(item, index)}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop/Tablet table view
  return (
    <div className={tableClasses.container}>
      <Table className={tableClasses.table}>
        <TableHeader>
          <TableRow>
            {headers.map((header, index) => (
              <TableHead key={index} className={tableClasses.header}>
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index}>
              {renderRow(item, index)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
