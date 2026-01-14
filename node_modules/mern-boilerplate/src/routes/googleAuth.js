import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { verifyGoogleToken } from '../services/googleTokenValidator.js';

const router = Router();

router.post('/google', async (req, res) => {
  try {
    // Validate environment variables first
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const jwtSecret = process.env.JWT_SECRET_DEV || process.env.JWT_SECRET_PROD || process.env.JWT_SECRET;

    if (!googleClientId) {
      console.error('❌ [GoogleAuth Backend] GOOGLE_CLIENT_ID não configurado');
      return res.status(500).json({
        error: 'Configuração do servidor incompleta',
        details: 'GOOGLE_CLIENT_ID não configurado'
      });
    }

    if (!jwtSecret) {
      console.error('❌ [GoogleAuth Backend] JWT_SECRET não configurado');
      return res.status(500).json({
        error: 'Configuração do servidor incompleta',
        details: 'JWT_SECRET não configurado'
      });
    }

    const { id_token, token } = req.body;
    const idToken = id_token || token;

    console.log('🔵 [GoogleAuth Backend] 1. Recebido ID Token:', idToken?.substring(0, 30));

    if (!idToken) {
      console.error('❌ [GoogleAuth Backend] ID Token não fornecido');
      return res.status(400).json({ error: 'ID Token não fornecido' });
    }

    console.log('🔵 [GoogleAuth Backend] 2. Verificando token com validador local...');
    const payload = await verifyGoogleToken(idToken);

    console.log('🔵 [GoogleAuth Backend] 3. Token validado! Email:', payload.email);

    // Gerar JWT com os dados do usuário
    console.log('🔵 [GoogleAuth Backend] 4. Gerando JWT...');

    const jwtToken = jwt.sign(
      {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    console.log('🟢 [GoogleAuth Backend] 5. JWT gerado:', jwtToken.substring(0, 50));
    console.log('🟢 [GoogleAuth Backend] 6. Respondendo com sucesso');

    res.json({
      token: jwtToken,
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      }
    });

  } catch (error) {
    console.error('❌ [GoogleAuth Backend] Erro completo:', error);
    console.error('❌ [GoogleAuth Backend] Mensagem:', error.message);
    console.error('❌ [GoogleAuth Backend] Stack:', error.stack);

    res.status(401).json({
      error: error.message,
      details: error.message
    });
  }
});

export default router;