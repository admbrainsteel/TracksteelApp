import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AppLabelsConfig {
  empresaNome: string;
  ofLabel: string;
  ofPlural: string;
  faseLabel: string;
  fasePlural: string;
  temFases: boolean;
  pecaLabel: string;
  pecaPlural: string;
  componenteLabel: string;
  componentePlural: string;
  marcaFormato: 'of_fase_peca' | 'fase_peca' | 'peca_direto' | 'personalizado';
  faixaComponenteMin: number;
  formatoPrefixoComponente?: string;
}

export interface EmpresaPreset {
  id: string;
  nome: string;
  descricao: string;
  isPadrao?: boolean;
  config: AppLabelsConfig;
}

export const PRESETS_EMPRESAS: EmpresaPreset[] = [
  {
    id: 'baldon_engemetal',
    nome: 'Baldon Engemetal',
    descricao: 'Padrão industrial da Baldon: OF + Fase + Peça (ex: B134-13-1) e Componentes 1000-9999',
    isPadrao: true,
    config: {
      empresaNome: 'Baldon Engemetal',
      ofLabel: 'OF',
      ofPlural: 'OFs',
      faseLabel: 'Fase',
      fasePlural: 'Fases',
      temFases: true,
      pecaLabel: 'Peça',
      pecaPlural: 'Peças',
      componenteLabel: 'Componente',
      componentePlural: 'Componentes',
      marcaFormato: 'of_fase_peca',
      faixaComponenteMin: 1000
    }
  },
  {
    id: 'padrao_oc_etapa',
    nome: 'Padrão OC & Etapas',
    descricao: 'Modelo com Ordem de Compra/Corte (OC) e Etapas de Fabricação',
    config: {
      empresaNome: 'Indústria Metálica (Modelo OC)',
      ofLabel: 'OC',
      ofPlural: 'OCs',
      faseLabel: 'Etapa',
      fasePlural: 'Etapas',
      temFases: true,
      pecaLabel: 'Marca',
      pecaPlural: 'Marcas',
      componenteLabel: 'Acessório',
      componentePlural: 'Acessórios',
      marcaFormato: 'of_fase_peca',
      faixaComponenteMin: 1000
    }
  },
  {
    id: 'padrao_contrato_lote',
    nome: 'Padrão Contrato & Lotes',
    descricao: 'Modelo por Número de Contrato e Lote de Montagem',
    config: {
      empresaNome: 'Fabricante de Galpões (Contrato)',
      ofLabel: 'Contrato',
      ofPlural: 'Contratos',
      faseLabel: 'Lote',
      fasePlural: 'Lotes',
      temFases: true,
      pecaLabel: 'Conjunto',
      pecaPlural: 'Conjuntos',
      componenteLabel: 'Subcomponente',
      componentePlural: 'Subcomponentes',
      marcaFormato: 'of_fase_peca',
      faixaComponenteMin: 1000
    }
  },
  {
    id: 'padrao_direto_peca',
    nome: 'Padrão Direto por Marca',
    descricao: 'Modelo simplificado sem fases ou prefixos na tag da peça',
    config: {
      empresaNome: 'Serralheria / Estruturas Leves',
      ofLabel: 'Pedido',
      ofPlural: 'Pedidos',
      faseLabel: 'Fase',
      fasePlural: 'Fases',
      temFases: false,
      pecaLabel: 'Peça',
      pecaPlural: 'Peças',
      componenteLabel: 'Componente',
      componentePlural: 'Componentes',
      marcaFormato: 'peca_direto',
      faixaComponenteMin: 1000
    }
  }
];

export const DEFAULT_APP_LABELS: AppLabelsConfig = PRESETS_EMPRESAS[0].config;

const STORAGE_KEY = 'tracksteel_app_labels_config';

interface AppLabelsContextData {
  labels: AppLabelsConfig;
  updateLabels: (newConfig: Partial<AppLabelsConfig>) => void;
  resetLabels: () => void;
  formatTag: (of: string, fase: string, peca: string) => string;
  isComponente: (marca: string | number) => boolean;
}

const AppLabelsContext = createContext<AppLabelsContextData | undefined>(undefined);

export const AppLabelsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [labels, setLabels] = useState<AppLabelsConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_APP_LABELS, ...JSON.parse(saved) };
      }
    } catch (err) {
      console.warn('Erro ao carregar configurações de labels:', err);
    }
    return DEFAULT_APP_LABELS;
  });

  const updateLabels = (newConfig: Partial<AppLabelsConfig>) => {
    setLabels((prev) => {
      const updated = { ...prev, ...newConfig };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Erro ao salvar labels no localStorage:', err);
      }
      return updated;
    });
  };

  const resetLabels = () => {
    setLabels(DEFAULT_APP_LABELS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('Erro ao resetar labels:', err);
    }
  };

  const formatTag = (of: string, fase: string, peca: string): string => {
    switch (labels.marcaFormato) {
      case 'fase_peca':
        return fase ? `${fase}-${peca}` : peca;
      case 'peca_direto':
        return peca;
      case 'of_fase_peca':
      default:
        return of ? (fase ? `${of}-${fase}-${peca}` : `${of}-${peca}`) : peca;
    }
  };

  const isComponente = (marca: string | number): boolean => {
    const num = typeof marca === 'number' ? marca : parseInt(String(marca).replace(/\D/g, ''), 10);
    if (!isNaN(num) && num >= labels.faixaComponenteMin) {
      return true;
    }
    const str = String(marca).toUpperCase();
    return str.startsWith('PL') || str.startsWith('CH') || str.startsWith('G-') || str.startsWith('COMP-');
  };

  return (
    <AppLabelsContext.Provider
      value={{
        labels,
        updateLabels,
        resetLabels,
        formatTag,
        isComponente
      }}
    >
      {children}
    </AppLabelsContext.Provider>
  );
};

export const useAppLabels = () => {
  const context = useContext(AppLabelsContext);
  if (!context) {
    return {
      labels: DEFAULT_APP_LABELS,
      updateLabels: () => {},
      resetLabels: () => {},
      formatTag: (of: string, fase: string, peca: string) => (of ? `${of}-${fase}-${peca}` : peca),
      isComponente: (marca: string | number) => {
        const num = typeof marca === 'number' ? marca : parseInt(String(marca).replace(/\D/g, ''), 10);
        return !isNaN(num) && num >= 1000;
      }
    };
  }
  return context;
};
