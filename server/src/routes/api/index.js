import { Router } from 'express';
import usersRoutes from './users';
import messagesRoutes from './messages';
import spreadsheetRoutes from './spreadsheet';
const router = Router();

router.use('/users', usersRoutes);
router.use('/messages', messagesRoutes);
router.use('/spreadsheet', spreadsheetRoutes);

export default router;
