import { Router } from 'express';
import healthRoutes from './health';
import statsRoutes from './stats';

const router = Router();

// Health check routes
router.use(healthRoutes);

// Stats routes (example of accessing persistent data)
router.use(statsRoutes);

export default router;

