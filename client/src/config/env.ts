// Configuração de variáveis de ambiente
// Todas as variáveis vêm do build time (Vite)

export const config = {
  // Google Client ID e Gemini API Key vêm do build time
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
};

// Validação para desenvolvimento
if (import.meta.env.DEV) {
  if (!config.googleClientId) {
    console.warn('⚠️ VITE_GOOGLE_CLIENT_ID não está configurada');
  }
  if (!config.geminiApiKey) {
    console.warn('⚠️ VITE_GEMINI_API_KEY não está configurada');
  }
}

// Validação para desenvolvimento
if (import.meta.env.DEV) {
  if (!config.googleClientId) {
    console.warn('⚠️ VITE_GOOGLE_CLIENT_ID não está configurada');
  }
  if (!config.geminiApiKey) {
    console.warn('⚠️ VITE_GEMINI_API_KEY não está configurada');
  }
}
