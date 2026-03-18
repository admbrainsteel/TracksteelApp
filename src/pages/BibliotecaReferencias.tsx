
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bookmark, Plus } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

const BibliotecaReferencias = () => {
  const { isAdmin } = useUserRole();

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Referências</h1>
          <p className="text-sm md:text-base text-muted-foreground">Material de referência e documentação técnica</p>
        </div>
        
        {isAdmin && (
          <Button
            className="mobile-full-width bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            <span className="text-sm md:text-base">Nova Referência</span>
          </Button>
        )}
      </div>

      <Card className="card-mobile">
        <CardHeader className="card-header-mobile">
          <CardTitle className="text-lg md:text-xl flex items-center gap-2">
            <Bookmark className="w-4 h-4 md:w-5 md:h-5" />
            Referências Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent className="card-content-mobile">
          <div className="text-center py-6 md:py-8 text-muted-foreground">
            <Bookmark className="mx-auto h-8 w-8 md:h-12 md:w-12 mb-4 opacity-50" />
            <p className="text-sm md:text-base">Nenhuma referência cadastrada ainda</p>
            <p className="text-xs md:text-sm mt-2">As referências técnicas serão listadas aqui quando adicionadas</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BibliotecaReferencias;
