
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ScrollableTableProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
}

export const ScrollableTable: React.FC<ScrollableTableProps> = ({ 
  children, 
  className = "",
  maxHeight = "400px" 
}) => {
  // Função para processar cabeçalhos
  const processHeaders = (children: React.ReactNode): React.ReactNode => {
    return React.Children.map(children, child => {
      if (React.isValidElement(child) && child.type) {
        const childType = child.type as any;
        if (childType.displayName === 'TableHeader' || childType === TableHeader) {
          return child;
        }
      }
      return null;
    });
  };

  // Função para processar corpo da tabela
  const processBody = (children: React.ReactNode): React.ReactNode => {
    return React.Children.map(children, child => {
      if (React.isValidElement(child) && child.type) {
        const childType = child.type as any;
        if (childType.displayName === 'TableBody' || childType === TableBody) {
          return child;
        }
      }
      return null;
    });
  };

  const headers = processHeaders(children);
  const body = processBody(children);

  return (
    <div className={`border rounded-md ${className}`}>
      <div className="relative w-full">
        {/* Cabeçalho fixo */}
        <div className="sticky top-0 z-10 bg-background border-b">
          <Table>
            {headers}
          </Table>
        </div>
        
        {/* Corpo rolável */}
        <div className="overflow-auto" style={{ maxHeight }}>
          <Table>
            {body}
          </Table>
        </div>
      </div>
    </div>
  );
};
