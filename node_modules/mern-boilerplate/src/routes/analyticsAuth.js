import { Router } from 'express';
import requireJwtAuth from '../middleware/authMiddleware.js';

const router = Router();

// Protected route - only authenticated users can access
router.get('/analytics', requireJwtAuth, (req, res) => {
  res.json({
    message: 'Analytics data',
    user: req.user
  });
});

export default router;