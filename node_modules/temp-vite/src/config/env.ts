// Configuração de variáveis de ambiente
// Todas as variáveis vêm do build time (Vite)

export const config = {
  // Google Client ID vem do build time
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
};

// Validação para desenvolvimento
if (import.meta.env.DEV) {
  if (!config.googleClientId) {
    console.warn('⚠️ VITE_GOOGLE_CLIENT_ID não está configurada');
  }
}

