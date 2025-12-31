import { Router, Request, Response } from 'express';

const router = Router();

// In-memory events storage
const events: any[] = [];

router.get('/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const recentEvents = events.slice(-limit).reverse();
    
    res.json({
      success: true,
      events: recentEvents
    });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const event = {
      ...req.body,
      timestamp: new Date().toISOString()
    };
    
    events.push(event);
    
    // Keep only last 100 events
    if (events.length > 100) {
      events.shift();
    }
    
    res.json({
      success: true,
      event
    });
  } catch (error: any) {
    console.error('Error creating event:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

export default router;
