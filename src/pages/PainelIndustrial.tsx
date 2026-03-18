
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { OFCardOptimized } from '@/components/painel-industrial/OFCardOptimized';
import { PainelHeader } from '@/components/painel-industrial/PainelHeader';

interface OFData {
  num_of: string;
  descritivo?: string;
  peso_total?: number;
  data_prazo?: string;
}

const PainelIndustrial: React.FC = () => {
  const navigate = useNavigate();
  const [ofsAtivas, setOfsAtivas] = useState<OFData[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [loading, setLoading] = useState(true);

  const ofsPerPage = 4;
  const totalPages = Math.ceil(ofsAtivas.length / ofsPerPage);
  const currentOFs = ofsAtivas.slice(currentPage * ofsPerPage, (currentPage + 1) * ofsPerPage);

  // Buscar OFs ativas
  const fetchOfsAtivas = async () => {
    try {
      const { data, error } = await supabase
        .from('ordens_fabricacao')
        .select('num_of, descritivo, peso_total, data_prazo')
        .eq('status', 'ativa')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOfsAtivas(data || []);
    } catch (error) {
      console.error('Erro ao buscar OFs ativas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-rotação das páginas
  useEffect(() => {
    if (!autoRotate || totalPages <= 1) return;

    const interval = setInterval(() => {
      setCurrentPage(prev => (prev + 1) % totalPages);
    }, 15000);

    return () => clearInterval(interval);
  }, [autoRotate, totalPages]);

  // Atualização automática dos dados
  useEffect(() => {
    fetchOfsAtivas();
    const interval = setInterval(fetchOfsAtivas, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleClose = () => {
    navigate('/dashboard');
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => prev > 0 ? prev - 1 : totalPages - 1);
  };

  const handleNextPage = () => {
    setCurrentPage(prev => (prev + 1) % totalPages);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-2xl font-semibold text-foreground">Carregando painel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <PainelHeader 
        totalPages={totalPages}
        currentPage={currentPage}
        autoRotate={autoRotate}
        onToggleAutoRotate={() => setAutoRotate(!autoRotate)}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
        onClose={handleClose}
      />

      {/* Grid de OFs - Layout Responsivo Melhorado */}
      <div className="
        grid 
        grid-cols-1 
        sm:grid-cols-1 
        md:grid-cols-2 
        xl:grid-cols-2 
        2xl:grid-cols-4 
        gap-4 sm:gap-6 lg:gap-8 
        mt-6 sm:mt-8
        auto-rows-max
      ">
        {currentOFs.map((of) => (
          <OFCardOptimized key={of.num_of} ofData={of} />
        ))}
      </div>

      {ofsAtivas.length === 0 && (
        <div className="text-center py-20">
          <p className="text-xl sm:text-2xl text-muted-foreground">Nenhuma OF ativa encontrada</p>
        </div>
      )}
    </div>
  );
};

export default PainelIndustrial;
