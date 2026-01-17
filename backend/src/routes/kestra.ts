import { Router, Request, Response } from 'express';
import { jobService } from '../services/job-service.js';

const router = Router();

router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { jobId, status, result, error, progress, step } = req.body;

    if (!jobId) {
      return res.status(400).json({ success: false, error: 'jobId required' });
    }

    console.log(`📥 Kestra callback: ${jobId} - ${status || 'progress'}`);

    if (status === 'completed' && result) {
      await jobService.updateJob(jobId, {
        status: 'completed',
        progress: 100,
        currentStep: 'Complete',
        result: result.data || result
      });
    } else if (status === 'failed') {
      await jobService.updateJob(jobId, {
        status: 'failed',
        errorMessage: error || 'Workflow failed',
        currentStep: 'Failed'
      });
    } else if (progress !== undefined) {
      await jobService.updateJob(jobId, {
        status: 'processing',
        progress,
        currentStep: step || 'Processing'
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Callback error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/progress', async (req: Request, res: Response) => {
  try {
    const { jobId, progress, step } = req.body;
    if (!jobId) return res.status(400).json({ success: false });

    await jobService.updateJob(jobId, {
      status: 'processing',
      progress: progress || 50,
      currentStep: step || 'Processing'
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Kestra callback ready' });
});

export default router;
