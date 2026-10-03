import { Router } from 'express';
import * as briefingController from '../controllers/briefing.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { briefingLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();
router.use(authenticate);

router.post('/generate', briefingLimiter, (req, res, next) => {
  void briefingController.generateBriefing(req, res, next);
});
router.get('/', (req, res, next) => {
  void briefingController.getBriefings(req, res, next);
});
router.get('/:id', (req, res, next) => {
  void briefingController.getBriefing(req, res, next);
});

export default router;
