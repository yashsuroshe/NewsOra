import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';
import { registerSchema, loginSchema } from '../validators/auth.schema.js';

const router = Router();

// Public — rate limited
router.post('/register', authLimiter, validate(registerSchema), (req, res, next) => {
  void authController.register(req, res, next);
});

router.post('/login', authLimiter, validate(loginSchema), (req, res, next) => {
  void authController.login(req, res, next);
});

router.post('/refresh', (req, res, next) => {
  void authController.refresh(req, res, next);
});

// Authenticated
router.post('/logout', authenticate, (req, res, next) => {
  void authController.logout(req, res, next);
});

router.get('/me', authenticate, (req, res, next) => {
  void authController.getMe(req, res, next);
});

export default router;
