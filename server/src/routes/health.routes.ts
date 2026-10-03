import { Router } from 'express';
import { liveness, readiness } from '../controllers/health.controller.js';

const router = Router();

// GET /api/v1/health
router.get('/', liveness);

// GET /api/v1/health/ready
router.get('/ready', (req, res) => {
  void readiness(req, res);
});

export default router;
