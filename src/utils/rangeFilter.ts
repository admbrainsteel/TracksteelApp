
/**
 * Utilitário para filtros de range usando o símbolo @
 * Exemplo: "32@47" filtra peças de 32 a 47
 */

/**
 * Verifica se um valor de filtro contém um range (simbolo @)
 */
export const isRangeFilter = (filterValue: string): boolean => {
  return filterValue.includes('@');
};

/**
 * Extrai os valores inicial e final de um filtro de range
 */
export const parseRangeFilter = (filterValue: string): { start: number; end: number } | null => {
  if (!isRangeFilter(filterValue)) return null;
  
  const parts = filterValue.split('@');
  if (parts.length !== 2) return null;
  
  const start = parseInt(parts[0].trim());
  const end = parseInt(parts[1].trim());
  
  if (isNaN(start) || isNaN(end)) return null;
  
  return { start: Math.min(start, end), end: Math.max(start, end) };
};

/**
 * Extrai o número da marca de uma peça
 * Assume que a marca pode ter formato como "123", "P123", "PECA-123", etc.
 */
export const extractNumberFromMarca = (marca: string): number | null => {
  // Remove espaços e converte para maiúsculo
  const cleanMarca = marca.trim().toUpperCase();
  
  // Tenta extrair números da marca usando regex
  const numberMatch = cleanMarca.match(/(\d+)/);
  
  if (!numberMatch) return null;
  
  return parseInt(numberMatch[1]);
};

/**
 * Verifica se uma marca está dentro do range especificado
 */
export const isInRange = (marca: string, range: { start: number; end: number }): boolean => {
  const marcaNumber = extractNumberFromMarca(marca);
  
  if (marcaNumber === null) return false;
  
  return marcaNumber >= range.start && marcaNumber <= range.end;
};

/**
 * Aplica filtro de marca com suporte a range
 * Retorna true se o item deve ser incluído no resultado
 */
export const applyMarcaFilter = (marca: string, filterValue: string): boolean => {
  if (!filterValue.trim()) return true;
  
  // Se for um filtro de range
  if (isRangeFilter(filterValue)) {
    const range = parseRangeFilter(filterValue);
    if (!range) return false;
    
    return isInRange(marca, range);
  }
  
  // Filtro normal por substring (case-insensitive)
  return marca.toLowerCase().includes(filterValue.toLowerCase());
};
