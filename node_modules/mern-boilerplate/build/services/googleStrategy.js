"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.loginWithGoogle = void 0;
var _googleAuthLibrary = require("google-auth-library");
var _User = _interopRequireDefault(require("../models/User.js"));
var _jsonwebtoken = _interopRequireDefault(require("jsonwebtoken"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const client = new _googleAuthLibrary.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const loginWithGoogle = async (req, res) => {
  try {
    const {
      credential
    } = req.body;
    if (!credential) {
      return res.status(400).json({
        error: "Missing Google credential"
      });
    }

    // Validar token enviado pelo frontend
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const email = payload.email;
    const googleId = payload.sub;
    const name = payload.name;
    const avatar = payload.picture;

    // Verificar se usuário já existe
    let user = await _User.default.findOne({
      email
    });
    if (!user) {
      user = await _User.default.create({
        provider: "google",
        googleId,
        email,
        name,
        avatar,
        username: `user_${googleId}`
      });
    }

    // Criar JWT da aplicação
    const token = _jsonwebtoken.default.sign({
      id: user._id,
      email: user.email
    }, process.env.JWT_SECRET_DEV || process.env.JWT_SECRET_PROD, {
      expiresIn: "7d"
    });
    return res.json({
      user,
      token
    });
  } catch (error) {
    console.error("❌ Google login error:", error);
    return res.status(401).json({
      error: "Token inválido ou expirado",
      details: error.message
    });
  }
};
exports.loginWithGoogle = loginWithGoogle;