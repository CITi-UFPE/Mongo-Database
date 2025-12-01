import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Valida um Google ID Token de forma segura usando as chaves públicas
 * do Google automaticamente (via google-auth-library).
 */
export const verifyGoogleToken = async (idToken) => {
  try {
    console.log("🔵 [verifyGoogleToken] Validando token via Google...");

    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new Error("GOOGLE_CLIENT_ID não foi configurado.");
    }

    // Validação oficial
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    console.log("🟢 [verifyGoogleToken] Token validado com sucesso!");
    console.log("Payload:", payload);

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      aud: payload.aud,
      iss: payload.iss,
      exp: payload.exp,
    };

  } catch (error) {
    console.error("❌ [verifyGoogleToken] Erro ao validar:", error.message);
    throw new Error("Token de autenticação inválido");
  }
};
