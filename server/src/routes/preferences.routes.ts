import { Router } from 'express';
import { z } from 'zod';
import * as preferencesController from '../controllers/preferences.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { updatePreferencesSchema } from '../validators/preferences.schema.js';

const router = Router();

// All preferences routes require authentication
router.use(authenticate);

// GET /api/v1/preferences
router.get('/', (req, res, next) => {
  void preferencesController.getPreferences(req, res, next);
});

// PUT /api/v1/preferences  (full preferences update)
router.put('/', validate(updatePreferencesSchema), (req, res, next) => {
  void preferencesController.updatePreferences(req, res, next);
});

// POST /api/v1/preferences/topics  (add a single topic)
router.post(
  '/topics',
  validate(z.object({ topic: z.string().min(1).max(50) })),
  (req, res, next) => {
    void preferencesController.addTopic(req, res, next);
  },
);

// DELETE /api/v1/preferences/topics/:topic  (remove a single topic)
router.delete('/topics/:topic', (req, res, next) => {
  void preferencesController.removeTopic(req, res, next);
});

export default router;
