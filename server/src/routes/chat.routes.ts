import { Router } from 'express';
import * as chatController from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { aiLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();
router.use(authenticate);

router.post('/conversations', (req, res, next) => {
  void chatController.createConversation(req, res, next);
});

router.get('/conversations', (req, res, next) => {
  void chatController.getConversations(req, res, next);
});

router.get('/conversations/:id/messages', (req, res, next) => {
  void chatController.getMessages(req, res, next);
});

router.delete('/conversations/:id', (req, res, next) => {
  void chatController.deleteConversation(req, res, next);
});

// SSE streaming endpoint — rate limited to 10/min per user
router.post('/conversations/:id/stream', aiLimiter, (req, res, next) => {
  void chatController.streamChat(req, res, next);
});

export default router;
