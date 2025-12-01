import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';

import User from '../models/User';

const isProduction = process.env.NODE_ENV === 'production';
const secretOrKey = isProduction ? process.env.JWT_SECRET_PROD : process.env.JWT_SECRET_DEV;

// Support both standard Authorization: Bearer and legacy x-auth-token headers
const jwtFromRequest = ExtractJwt.fromExtractors([
  ExtractJwt.fromAuthHeaderAsBearerToken(), // Standard: Authorization: Bearer <token>
  ExtractJwt.fromHeader('x-auth-token'),     // Legacy: x-auth-token: <token>
]);

// JWT strategy
const jwtLogin = new JwtStrategy(
  {
    jwtFromRequest,
    secretOrKey,
  },
  async (payload, done) => {
    try {
      // For Google OAuth users, payload contains: { id, email, name, picture }
      // For local users, payload contains: { id }
      const user = await User.findById(payload.id);

      if (user) {
        done(null, user);
      } else {
        // If user not found in DB, create a virtual user from JWT payload
        // This handles Google OAuth users who aren't in the User collection
        if (payload.email) {
          done(null, {
            id: payload.id,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            provider: 'google',
          });
        } else {
          done(null, false);
        }
      }
    } catch (err) {
      done(err, false);
    }
  },
);

passport.use(jwtLogin);
