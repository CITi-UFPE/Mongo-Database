import { Router } from 'express';
import usersRoutes from './users';
import messagesRoutes from './messages';
import spreadsheetRoutes from './spreadsheet';
import analyticsRoutes from './analytics';
const router = Router();

router.use('/users', usersRoutes);
router.use('/messages', messagesRoutes);
router.use('/spreadsheet', spreadsheetRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
