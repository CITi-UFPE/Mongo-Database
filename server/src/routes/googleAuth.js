import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

const router = Router();

router.post('/google', async (req, res) => {
  try {
    const { id_token, token } = req.body;
    const idToken = id_token || token;
    
    if (!idToken) {
      return res.status(400).json({ error: 'ID Token não fornecido' });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(400).json({ error: 'GOOGLE_CLIENT_ID não configurado' });
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    
    // Gerar JWT com os dados do usuário
    const jwtToken = jwt.sign(
      {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
      },
      process.env.JWT_SECRET || 'sua_chave_secreta',
      { expiresIn: '7d' }
    );
    
    console.log('✅ JWT gerado:', jwtToken.substring(0, 50));
    
    res.json({ token: jwtToken, user: payload });
  } catch (error) {
    console.error('❌ Erro:', error.message);
    res.status(401).json({ error: error.message });
  }
});

export default router;