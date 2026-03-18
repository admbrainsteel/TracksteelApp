import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TiposMateriaModal } from './TiposMateriaModal';
import { UnidadesMedidaModal } from './UnidadesMedidaModal';
import { LocalizacaoModal } from './LocalizacaoModal';
import { QualidadeAcoModal } from './QualidadeAcoModal';

export const CrudModalsManager: React.FC = () => {
  const [tiposModalOpen, setTiposModalOpen] = useState(false);
  const [unidadesModalOpen, setUnidadesModalOpen] = useState(false);
  const [localizacaoModalOpen, setLocalizacaoModalOpen] = useState(false);
  const [qualidadeModalOpen, setQualidadeModalOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Gerenciar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTiposModalOpen(true)}>
            Tipos de Material
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setUnidadesModalOpen(true)}>
            Unidades de Medida
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLocalizacaoModalOpen(true)}>
            Localizações
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setQualidadeModalOpen(true)}>
            Qualidade do Aço
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TiposMateriaModal
        isOpen={tiposModalOpen}
        onClose={() => setTiposModalOpen(false)}
      />

      <UnidadesMedidaModal
        isOpen={unidadesModalOpen}
        onClose={() => setUnidadesModalOpen(false)}
      />

      <LocalizacaoModal
        isOpen={localizacaoModalOpen}
        onClose={() => setLocalizacaoModalOpen(false)}
      />

      <QualidadeAcoModal
        isOpen={qualidadeModalOpen}
        onClose={() => setQualidadeModalOpen(false)}
      />
    </>
  );
};