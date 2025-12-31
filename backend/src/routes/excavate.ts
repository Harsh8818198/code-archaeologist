import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { ExcavatorAgent } from '../agents/excavator.js';
import path from 'path';
import fs from 'fs';
import simpleGit from 'simple-git';

const router = Router();

// In-memory job storage
const jobs = new Map<string, any>();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { repoUrl, repoPath, options } = req.body;
    const inputPath = repoUrl || repoPath;

    if (!inputPath) {
      return res.status(400).json({
        success: false,
        error: 'repoUrl or repoPath is required'
      });
    }

    const jobId = `job_${Date.now()}_${randomUUID().slice(0, 6)}`;

    jobs.set(jobId, {
      id: jobId,
      repoPath: inputPath,
      status: 'processing',
      progress: 0,
      currentStep: 'Initializing...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    processExcavation(jobId, inputPath, options || {}).catch(error => {
      console.error('Excavation error:', error);
      jobs.set(jobId, {
        ...jobs.get(jobId),
        status: 'failed',
        error: error.message,
        updatedAt: new Date().toISOString()
      });
    });

    res.json({
      success: true,
      jobId,
      message: 'Excavation started'
    });

  } catch (error: any) {
    console.error('Error in excavate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get job status
router.get('/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // Return job directly (frontend handles both formats)
    res.json(job);
  } catch (error: any) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get job report - FIXED: return data instead of report
router.get('/:jobId/report', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Job not completed yet',
        status: job.status
      });
    }

    // FIXED: Frontend expects reportData.data, not reportData.report
    res.json({
      success: true,
      data: job.result
    });
  } catch (error: any) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

async function processExcavation(jobId: string, inputPath: string, options: any) {
  const updateJob = (updates: any) => {
    jobs.set(jobId, {
      ...jobs.get(jobId),
      ...updates,
      updatedAt: new Date().toISOString()
    });
  };

  try {
    let localPath = inputPath;

    const isGitUrl = inputPath.startsWith('http://') ||
                     inputPath.startsWith('https://') ||
                     inputPath.startsWith('git@');

    if (isGitUrl) {
      updateJob({
        status: 'processing',
        progress: 5,
        currentStep: 'Cloning repository...'
      });

      const tempDir = path.join(process.cwd(), 'temp', `repo-${Date.now()}`);
      await fs.promises.mkdir(tempDir, { recursive: true });

      console.log(`Cloning ${inputPath} to ${tempDir}`);
      const git = simpleGit();
      await git.clone(inputPath, tempDir);

      localPath = tempDir;
    } else {
      if (!fs.existsSync(inputPath)) {
        throw new Error(`Directory does not exist: ${inputPath}`);
      }
      localPath = path.resolve(inputPath);
    }

    updateJob({
      status: 'processing',
      progress: 10,
      currentStep: 'Analyzing repository...'
    });

    const excavator = new ExcavatorAgent(localPath, {
      maxFiles: options.maxFiles || 10,
      skipAnalysis: options.skipAnalysis || false,
      verbose: false,
      interactive: false
    });

    updateJob({
      progress: 20,
      currentStep: 'Running deep analysis...'
    });

    const report = await excavator.excavate();

    if (isGitUrl && localPath.includes('/temp/')) {
      try {
        await fs.promises.rm(localPath, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }

    updateJob({
      status: 'completed',
      progress: 100,
      currentStep: 'Complete',
      hasReport: true,
      result: report
    });

  } catch (error: any) {
    console.error('Processing error:', error);
    updateJob({
      status: 'failed',
      error: error.message,
      currentStep: 'Failed'
    });
  }
}

export default router;
