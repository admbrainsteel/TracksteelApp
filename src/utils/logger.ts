
// Logger utilitário para produção — centraliza todos os logs do sistema
const isDevelopment = import.meta.env.DEV;

type LogData = Record<string, unknown> | string | number | boolean | null | undefined;

export const logger = {
  debug: (message: string, data?: LogData) => {
    if (isDevelopment) {
      console.log(`🐛 ${message}`, data ?? '');
    }
  },

  info: (message: string, data?: LogData) => {
    if (isDevelopment) {
      console.log(`🔍 ${message}`, data ?? '');
    }
  },
  
  error: (message: string, error?: unknown) => {
    if (isDevelopment) {
      console.error(`❌ ${message}`, error ?? '');
    }
    // Em produção, poderia enviar para serviço de logging externo
  },
  
  warn: (message: string, data?: LogData) => {
    if (isDevelopment) {
      console.warn(`⚠️ ${message}`, data ?? '');
    }
  },
  
  success: (message: string, data?: LogData) => {
    if (isDevelopment) {
      console.log(`✅ ${message}`, data ?? '');
    }
  }
};
