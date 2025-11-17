import { Router } from 'express';
import healthRoutes from './health';
import statsRoutes from './stats';
import triggerAICorrectionRoutes from './trigger-ai-correction';
import questionAICorrectionRoutes from './question-ai-correction';

const router = Router();

// Health check routes
router.use(healthRoutes);

// Stats routes (example of accessing persistent data)
router.use(statsRoutes);

// AI Correction routes
router.use(triggerAICorrectionRoutes);
router.use(questionAICorrectionRoutes);

export default router;

