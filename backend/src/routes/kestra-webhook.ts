import { Router, Request, Response } from 'express';

const router = Router();

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { executionId, status, jobId, results } = req.body;

    console.log('📥 Kestra callback received:', {
      executionId,
      status,
      jobId
    });

    // TODO: Update job status in jobs Map
    // Example: jobs.set(jobId, { ...jobs.get(jobId), kestraStatus: status });

    res.json({
      success: true,
      message: 'Webhook processed'
    });

  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
