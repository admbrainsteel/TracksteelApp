
import { format, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

// Timezone de São Paulo
const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

// Função para obter a data atual no timezone de São Paulo
export const getSystemDate = (): Date => {
  return toZonedTime(new Date(), SAO_PAULO_TIMEZONE);
};

// Função para obter a data atual como string no formato ISO (YYYY-MM-DD) no timezone de São Paulo
export const getSystemDateString = (): string => {
  const saoPauloDate = toZonedTime(new Date(), SAO_PAULO_TIMEZONE);
  return format(saoPauloDate, 'yyyy-MM-dd', { timeZone: SAO_PAULO_TIMEZONE });
};

// Função para obter a data/hora atual como string no formato ISO completo no timezone de São Paulo
export const getSystemDateTime = (): string => {
  const saoPauloDate = toZonedTime(new Date(), SAO_PAULO_TIMEZONE);
  return format(saoPauloDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx", { timeZone: SAO_PAULO_TIMEZONE });
};

// Função para formatar data no padrão brasileiro (para objetos Date)
export const formatBrazilianDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const saoPauloDate = toZonedTime(dateObj, SAO_PAULO_TIMEZONE);
  return format(saoPauloDate, 'dd/MM/yyyy', { locale: ptBR, timeZone: SAO_PAULO_TIMEZONE });
};

// Função específica para formatar strings de data (YYYY-MM-DD) sem problemas de timezone
export const formatBrazilianDateFromString = (dateString: string): string => {
  if (!dateString) return '';
  
  // Dividir a string de data para evitar problemas de timezone
  const [year, month, day] = dateString.split('-');
  
  // Criar uma data local sem conversão de timezone
  const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const saoPauloDate = toZonedTime(localDate, SAO_PAULO_TIMEZONE);
  
  return format(saoPauloDate, 'dd/MM/yyyy', { locale: ptBR, timeZone: SAO_PAULO_TIMEZONE });
};

// Função para formatar data/hora no padrão brasileiro
export const formatBrazilianDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const saoPauloDate = toZonedTime(dateObj, SAO_PAULO_TIMEZONE);
  return format(saoPauloDate, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR, timeZone: SAO_PAULO_TIMEZONE });
};

// Função para formatar apenas a hora
export const formatTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const saoPauloDate = toZonedTime(dateObj, SAO_PAULO_TIMEZONE);
  return format(saoPauloDate, 'HH:mm:ss', { locale: ptBR, timeZone: SAO_PAULO_TIMEZONE });
};

// Função para converter data local para UTC (para enviar ao banco)
export const toUTCDate = (date: Date): string => {
  return fromZonedTime(date, SAO_PAULO_TIMEZONE).toISOString();
};

// Função para converter data UTC do banco para data local de São Paulo
export const fromUTCDate = (utcDate: string): Date => {
  return toZonedTime(new Date(utcDate), SAO_PAULO_TIMEZONE);
};

// Função para obter ontem baseado na data do sistema em São Paulo
export const getYesterdayString = (): string => {
  const saoPauloDate = toZonedTime(new Date(), SAO_PAULO_TIMEZONE);
  saoPauloDate.setDate(saoPauloDate.getDate() - 1);
  return format(saoPauloDate, 'yyyy-MM-dd', { timeZone: SAO_PAULO_TIMEZONE });
};

// Função para obter uma data específica em relação ao sistema
export const getDateOffsetString = (days: number): string => {
  const saoPauloDate = toZonedTime(new Date(), SAO_PAULO_TIMEZONE);
  saoPauloDate.setDate(saoPauloDate.getDate() + days);
  return format(saoPauloDate, 'yyyy-MM-dd', { timeZone: SAO_PAULO_TIMEZONE });
};

// Função para verificar se uma data string é hoje
export const isToday = (dateString: string): boolean => {
  return dateString === getSystemDateString();
};

// Função para verificar se uma data string é ontem
export const isYesterday = (dateString: string): boolean => {
  return dateString === getYesterdayString();
};

// Função para obter a data/hora atual em São Paulo para exibição
export const getCurrentSaoPauloTime = (): Date => {
  return toZonedTime(new Date(), SAO_PAULO_TIMEZONE);
};
