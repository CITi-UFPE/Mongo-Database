import { Router } from 'express';
import localAuthRoutes from './localAuth';
import googleAuthRoutes from './googleAuth';
import facebookAuthRoutes from './facebookAuth';
import apiRoutes from './api';
import analyticsAuthRoutes from './analyticsAuth.js';
const router = Router();

// rota raiz
router.get('/', (req, res) => {
  res.json({ message: 'Server is running', version: '1.0.0' });
});

router.use('/auth', localAuthRoutes);
router.use('/auth', googleAuthRoutes);
router.use('/auth', facebookAuthRoutes);
router.use('/api', apiRoutes);
router.use('/api', analyticsAuthRoutes);
// fallback 404
router.use('/api', (req, res) => res.status(404).json('No route for this path'));

export default router;

/*
routes:

GET /auth/google
GET /auth/google/callback

GET /auth/facebook
GET /auth/facebook/callback

POST /auth/login
POST /auth/register
GET /auth/logout

GET api/users/me
GET /api/users/feature

*/
