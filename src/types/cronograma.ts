
export interface ProcessoCronograma {
  id?: string;
  nome_processo: string;
  data_inicio: string;
  data_fim: string;
  ordem: number;
}

export interface CronogramaOf {
  id?: string;
  of_id: string;
  gestor_id: string;
  revisao: number;
  defasagem_solda?: number;
  processos: ProcessoCronograma[];
  peso_total?: number;
  ordem_fabricacao?: {
    num_of: string;
    descritivo: string;
    peso_total?: number;
  };
  gestor_profile?: {
    full_name: string;
    email: string;
  };
}
