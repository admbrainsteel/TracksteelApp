
// Logger utilitário para produção
const isDevelopment = import.meta.env.DEV;

export const logger = {
  info: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(`🔍 ${message}`, data || '');
    }
  },
  
  error: (message: string, error?: any) => {
    if (isDevelopment) {
      console.error(`❌ ${message}`, error || '');
    }
    // Em produção, poderia enviar para serviço de logging
  },
  
  warn: (message: string, data?: any) => {
    if (isDevelopment) {
      console.warn(`⚠️ ${message}`, data || '');
    }
  },
  
  success: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(`✅ ${message}`, data || '');
    }
  }
};
