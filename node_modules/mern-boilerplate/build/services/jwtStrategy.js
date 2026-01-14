"use strict";

var _passport = _interopRequireDefault(require("passport"));
var _passportJwt = require("passport-jwt");
var _User = _interopRequireDefault(require("../models/User"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const isProduction = process.env.NODE_ENV === 'production';
const secretOrKey = isProduction ? process.env.JWT_SECRET_PROD : process.env.JWT_SECRET_DEV;

// Support both standard Authorization: Bearer and legacy x-auth-token headers
const jwtFromRequest = _passportJwt.ExtractJwt.fromExtractors([_passportJwt.ExtractJwt.fromAuthHeaderAsBearerToken(),
// Standard: Authorization: Bearer <token>
_passportJwt.ExtractJwt.fromHeader('x-auth-token') // Legacy: x-auth-token: <token>
]);

// JWT strategy
const jwtLogin = new _passportJwt.Strategy({
  jwtFromRequest,
  secretOrKey
}, async (payload, done) => {
  try {
    // For Google OAuth users, payload contains: { id, email, name, picture }
    // For local users, payload contains: { id }
    const user = await _User.default.findById(payload.id);
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
          provider: 'google'
        });
      } else {
        done(null, false);
      }
    }
  } catch (err) {
    done(err, false);
  }
});
_passport.default.use(jwtLogin);