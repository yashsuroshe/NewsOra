import { Router } from 'express';
import * as alertController from '../controllers/alert.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/', (req, res, next) => { void alertController.getAlerts(req, res, next); });
router.patch('/:id/read', (req, res, next) => { void alertController.markRead(req, res, next); });
router.patch('/read-all', (req, res, next) => { void alertController.markAllRead(req, res, next); });

export default router;
