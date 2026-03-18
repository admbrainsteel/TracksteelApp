
import { supabase } from '@/integrations/supabase/client';

export const seedTiposMateriaPrima = async () => {
  const tiposMateriaPrima = [
    {
      nome: 'Perfis Estruturais',
      descricao: 'Perfis laminados e soldados para estruturas metálicas',
      caracteristicas: {
        resistencia: 'Alta',
        soldabilidade: 'Excelente',
        conformacao: 'Boa'
      },
      controles: {
        certificado: true,
        rastreabilidade: true,
        teste_qualidade: true
      }
    },
    {
      nome: 'Chapas e Bobinas',
      descricao: 'Chapas laminadas a quente e a frio',
      caracteristicas: {
        espessura: 'Variável',
        acabamento: 'Laminado',
        planicidade: 'Controlada'
      },
      controles: {
        dimensoes: true,
        planicidade: true,
        acabamento_superficial: true
      }
    },
    {
      nome: 'Parafusos e Fixadores',
      descricao: 'Elementos de fixação diversos',
      caracteristicas: {
        resistencia: 'Especificada',
        acabamento: 'Galvanizado/Pintado',
        rosca: 'Métrica/Whitworth'
      },
      controles: {
        resistencia_mecanica: true,
        dimensoes: true,
        acabamento: true
      }
    },
    {
      nome: 'Eletrodos e Consumíveis',
      descricao: 'Materiais para soldagem',
      caracteristicas: {
        classificacao: 'AWS/ASME',
        diametro: 'Variável',
        revestimento: 'Específico'
      },
      controles: {
        umidade: true,
        validade: true,
        armazenamento: true
      }
    },
    {
      nome: 'Tintas e Revestimentos',
      descricao: 'Materiais para proteção anticorrosiva',
      caracteristicas: {
        tipo: 'Primer/Acabamento',
        base: 'Solvente/Água',
        cor: 'Especificada'
      },
      controles: {
        viscosidade: true,
        validade: true,
        armazenamento: true
      }
    }
  ];

  try {
    const { data, error } = await supabase
      .from('tipos_materia_prima')
      .insert(tiposMateriaPrima)
      .select();

    if (error) throw error;
    
    console.log('Tipos de matéria-prima inseridos:', data);
    return data;
  } catch (error) {
    console.error('Erro ao inserir tipos de matéria-prima:', error);
    throw error;
  }
};
