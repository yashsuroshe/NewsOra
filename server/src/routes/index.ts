import { Router } from 'express';
import healthRoutes from './health.routes.js';

const router = Router();

router.use('/health', healthRoutes);

// TODO — routes added in subsequent parts:
// router.use('/auth', authRoutes);
// router.use('/preferences', preferenceRoutes);
// router.use('/briefings', briefingRoutes);
// router.use('/chat', chatRoutes);
// router.use('/alerts', alertRoutes);
// router.use('/articles', articleRoutes);

export default router;
