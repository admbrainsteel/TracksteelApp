
/**
 * Função para ordenação numérica natural de strings
 * Resolve o problema de ordenação alfanumérica onde "10" vem antes de "2"
 */
export const naturalSort = (a: string, b: string): number => {
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base'
  });
  return collator.compare(a, b);
};

/**
 * Função para ordenar array de objetos por uma propriedade com ordenação natural
 */
export const sortByProperty = <T>(array: T[], property: keyof T): T[] => {
  return [...array].sort((a, b) => naturalSort(String(a[property]), String(b[property])));
};

/**
 * Função para ordenar array de objetos por múltiplas propriedades com ordenação natural
 */
export const sortByMultipleProperties = <T>(array: T[], properties: (keyof T)[]): T[] => {
  return [...array].sort((a, b) => {
    for (const property of properties) {
      const comparison = naturalSort(String(a[property]), String(b[property]));
      if (comparison !== 0) return comparison;
    }
    return 0;
  });
};
