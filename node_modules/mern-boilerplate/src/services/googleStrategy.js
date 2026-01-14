import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const loginWithGoogle = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: "Missing Google credential" });
    }

    // Validar token enviado pelo frontend
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const email = payload.email;
    const googleId = payload.sub;
    const name = payload.name;
    const avatar = payload.picture;

    // Verificar se usuário já existe
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        provider: "google",
        googleId,
        email,
        name,
        avatar,
        username: `user_${googleId}`,
      });
    }

    // Criar JWT da aplicação
    const isProduction = process.env.NODE_ENV === 'production';
    const secret = isProduction ? process.env.JWT_SECRET_PROD : process.env.JWT_SECRET_DEV;

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      secret,
      { expiresIn: "7d" }
    );

    return res.json({
      user,
      token,
    });

  } catch (error) {
    console.error("❌ Google login error:", error);
    return res.status(401).json({
      error: "Token inválido ou expirado",
      details: error.message,
    });
  }
};
