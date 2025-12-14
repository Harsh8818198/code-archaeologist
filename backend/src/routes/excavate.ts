import { Router, Request, Response } from 'express';
import { redisStore } from '../services/redis';
import { randomUUID } from 'crypto';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { repoUrl } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ success: false, error: 'repoUrl is required' });
    }

    const jobId = randomUUID();

    await redisStore.storeJob(jobId, {
      id: jobId,
      repoUrl,
      status: 'processing',
      createdAt: new Date().toISOString()
    });

    await redisStore.addEvent({
      type: 'excavation_started',
      repoUrl,
      commitHash: 'latest',
      message: `Started analyzing ${repoUrl}`,
      timestamp: new Date()
    });

    res.json({
      success: true,
      jobId,
      message: 'Excavation started'
    });

  } catch (error) {
    console.error('Error in excavate:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = await redisStore.getJob(jobId);

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({ success: true, job });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
