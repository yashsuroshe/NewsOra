import { Router } from 'express';
import passport from 'passport';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';
import { registerSchema, loginSchema } from '../validators/auth.schema.js';

const router = Router();

// ── Email / Password ──────────────────────────────────────────────────────────

router.post('/register', authLimiter, validate(registerSchema), (req, res, next) => {
  void authController.register(req, res, next);
});

router.post('/login', authLimiter, validate(loginSchema), (req, res, next) => {
  void authController.login(req, res, next);
});

router.post('/refresh', (req, res, next) => {
  void authController.refresh(req, res, next);
});

router.post('/logout', authenticate, (req, res, next) => {
  void authController.logout(req, res, next);
});

router.get('/me', authenticate, (req, res, next) => {
  void authController.getMe(req, res, next);
});

// ── Google OAuth ──────────────────────────────────────────────────────────────

/**
 * Initiates Google OAuth flow.
 * Redirects user to Google's consent screen.
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  }),
);

/**
 * Google OAuth callback.
 * Passport verifies the code, finds/creates the user, then calls googleCallback.
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/auth/error?code=OAUTH_FAILED',
    session: false,
  }),
  (req, res, next) => {
    void authController.googleCallback(req, res, next);
  },
);

export default router;
