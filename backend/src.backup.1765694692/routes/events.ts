import { Router, Request, Response } from 'express';
import { redisStore } from '../services/redis';

const router = Router();

// Get recent events
router.get('/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const events = await redisStore.getRecentEvents(limit);
    res.json({ success: true, events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch events' });
  }
});

export default router;
