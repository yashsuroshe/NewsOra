import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import preferencesRoutes from './preferences.routes.js';
import articleRoutes from './article.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/preferences', preferencesRoutes);
router.use('/articles', articleRoutes);
// router.use('/briefings', briefingRoutes);
// router.use('/chat', chatRoutes);
// router.use('/alerts', alertRoutes);
// router.use('/articles', articleRoutes);

export default router;
