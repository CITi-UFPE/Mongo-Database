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
    console.log('JWT Strategy called');
    console.log('Payload:', JSON.stringify(payload));
    console.log('isProduction:', isProduction);
    console.log('Using secret:', secretOrKey ? '***' : 'MISSING');
    
    try {
      // For Google OAuth users, payload contains: { id, email, name, picture }
      // For local users, payload contains: { id }
      
      let user = null;
      // Only check DB if the ID looks like a MongoDB ObjectId
      if (payload.id && /^[0-9a-fA-F]{24}$/.test(payload.id)) {
        user = await User.findById(payload.id);
        console.log('User found in DB:', !!user);
      } else {
        console.log('Payload ID is not a MongoDB ObjectId, skipping DB lookup');
      }

      if (user) {
        done(null, user);
      } else {
        // If user not found in DB, create a virtual user from JWT payload
        // This handles Google OAuth users who aren't in the User collection
        if (payload.email) {
          console.log('Creating virtual user from payload');
          done(null, {
            id: payload.id,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            provider: 'google',
          });
        } else {
          console.log('No user found and no email in payload');
          done(null, false);
        }
      }
    } catch (err) {
      console.error('JWT Strategy Error:', err);
      done(err, false);
    }
  },
);

passport.use(jwtLogin);
