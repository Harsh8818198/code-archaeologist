import { Router } from 'express';
import excavateRouter from './excavate.js';

// Jobs route is just an alias to excavate for compatibility
const router = Router();

// Forward all job requests to excavate router
router.use('/', excavateRouter);

export default router;
