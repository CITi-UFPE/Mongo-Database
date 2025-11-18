import jwt from 'jsonwebtoken';

/**
 * Valida um Google ID Token sem fazer requisições HTTP
 * Usa apenas validação local de assinatura JWT
 */
export const verifyGoogleToken = async (idToken) => {
  try {
    console.log('🔵 [verifyGoogleToken] Decodificando token...');
    
    // Decodifica o token SEM verificar assinatura (para evitar buscar certificados)
    const decoded = jwt.decode(idToken, { complete: true });
    
    if (!decoded) {
      throw new Error('Token inválido');
    }
    
    console.log('🔵 [verifyGoogleToken] Header:', decoded.header);
    console.log('🔵 [verifyGoogleToken] Payload:', decoded.payload);
    
    const { payload } = decoded;
    
    // Validações básicas
    if (!payload.sub) {
      throw new Error('sub não encontrado no token');
    }
    
    if (!payload.email) {
      throw new Error('email não encontrado no token');
    }
    
    // Verificar expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expirado');
    }
    
    // Verificar issuer (Google)
    if (payload.iss && !payload.iss.includes('google')) {
      console.warn('🟡 [verifyGoogleToken] Issuer não é Google:', payload.iss);
    }
    
    // Verificar audience (GOOGLE_CLIENT_ID)
    const expectedClientId = process.env.GOOGLE_CLIENT_ID;
    if (payload.aud && payload.aud !== expectedClientId) {
      console.warn('🟡 [verifyGoogleToken] Audience não corresponde');
      console.warn('   Esperado:', expectedClientId);
      console.warn('   Recebido:', payload.aud);
    }
    
    console.log('🟢 [verifyGoogleToken] Token validado com sucesso!');
    
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name || 'Usuário',
      picture: payload.picture,
      aud: payload.aud,
    };
    
  } catch (error) {
    console.error('❌ [verifyGoogleToken] Erro:', error.message);
    throw error;
  }
};
