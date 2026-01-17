import { Router, Request, Response } from 'express';
import { ExcavatorAgent } from '../agents/excavator.js';
import { jobService } from '../services/job-service.js';
import { getKestraClient } from '../lib/kestra-client.js';
import path from 'path';
import fs from 'fs';
import simpleGit from 'simple-git';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { repoUrl, repoPath, options = {} } = req.body;
    const inputPath = repoUrl || repoPath;

    if (!inputPath) {
      return res.status(400).json({ success: false, error: 'repoUrl or repoPath required' });
    }

    const job = await jobService.createJob(inputPath, options);
    console.log(`📦 Job created: ${job.id}`);

    const kestraClient = getKestraClient();
    const kestraAvailable = await kestraClient.isAvailable();
    const useKestra = kestraAvailable && (options.maxFiles || 10) > 20;

    if (useKestra) {
      console.log(`🎛️  Routing to Kestra (large job)`);
      const result = await kestraClient.triggerExcavation(job.id, inputPath, options.maxFiles);
      
      if (result.success) {
        return res.json({
          success: true,
          jobId: job.id,
          message: 'Excavation started via Kestra',
          orchestrator: 'kestra'
        });
      }
      console.warn(`Kestra failed, using direct execution`);
    }

    console.log(`⚡ Direct execution`);
    processExcavation(job.id, inputPath, options).catch(error => {
      jobService.updateJob(job.id, {
        status: 'failed',
        errorMessage: error.message
      });
    });

    res.json({
      success: true,
      jobId: job.id,
      message: 'Excavation started',
      orchestrator: kestraAvailable ? 'direct (kestra available)' : 'direct (kestra unavailable)'
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:jobId', async (req: Request, res: Response) => {
  try {
    const job = await jobService.getJob(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    res.json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      currentStep: job.current_step,
      repoUrl: job.repo_url,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      hasReport: job.status === 'completed',
      error: job.error_message
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:jobId/report', async (req: Request, res: Response) => {
  try {
    const job = await jobService.getJob(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    if (job.status !== 'completed') {
      return res.status(400).json({ success: false, error: 'Job not completed' });
    }
    res.json({ success: true, data: job.result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/internal', async (req: Request, res: Response) => {
  try {
    const { jobId, repoPath, options = {} } = req.body;
    if (!repoPath) return res.status(400).json({ success: false, error: 'repoPath required' });

    if (jobId) {
      await jobService.updateJob(jobId, {
        status: 'processing',
        progress: 30,
        currentStep: 'Analyzing via Kestra...'
      });
    }

    const excavator = new ExcavatorAgent(repoPath, {
      maxFiles: options.maxFiles || 10,
      skipAnalysis: options.skipAnalysis || false,
      verbose: false,
      interactive: false
    });

    const report = await excavator.excavate();
    res.json({ success: true, data: report });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

async function processExcavation(jobId: string, inputPath: string, options: any) {
  try {
    let localPath = inputPath;
    const isGitUrl = inputPath.startsWith('http') || inputPath.startsWith('git@');

    if (isGitUrl) {
      await jobService.updateJob(jobId, { status: 'processing', progress: 5, currentStep: 'Cloning...' });
      const tempDir = path.join(process.cwd(), 'temp', `repo-${Date.now()}`);
      await fs.promises.mkdir(tempDir, { recursive: true });
      await simpleGit().clone(inputPath, tempDir, ['--depth', '50']);
      localPath = tempDir;
    } else {
      if (!fs.existsSync(inputPath)) throw new Error(`Directory not found: ${inputPath}`);
      localPath = path.resolve(inputPath);
    }

    await jobService.updateJob(jobId, { status: 'processing', progress: 20, currentStep: 'Analyzing...' });

    const excavator = new ExcavatorAgent(localPath, {
      maxFiles: options.maxFiles || 10,
      skipAnalysis: options.skipAnalysis || false,
      verbose: false,
      interactive: false
    });

    const report = await excavator.excavate();

    if (isGitUrl && localPath.includes('/temp/')) {
      await fs.promises.rm(localPath, { recursive: true, force: true }).catch(() => {});
    }

    await jobService.updateJob(jobId, {
      status: 'completed',
      progress: 100,
      currentStep: 'Complete',
      result: report
    });

    console.log(`✅ Job ${jobId.slice(-6)} completed`);

  } catch (error: any) {
    await jobService.updateJob(jobId, {
      status: 'failed',
      errorMessage: error.message,
      currentStep: 'Failed'
    });
  }
}

export default router;
