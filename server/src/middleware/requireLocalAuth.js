import passport from 'passport';

const requireLocalAuth = passport.authenticate('local', { session: false });

export default requireLocalAuth;
