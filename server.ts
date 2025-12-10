import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ExcavatorAgent } from './src/agents/excavator';
import type { ExcavationOptions } from './src/agents/excavator';

const app = express();
const PORT = process.env.PORT || 3001;

interface Job {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  repoPath: string;
  options: ExcavationOptions;
  createdAt: Date;
  completedAt?: Date;
  report?: any;
  error?: string;
}

const jobs = new Map<string, Job>();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/excavate', async (req, res) => {
  try {
    const { repoPath, options = {} } = req.body;

    if (!repoPath) {
      return res.status(400).json({
        success: false,
        error: 'repoPath is required'
      });
    }

    let resolvedPath = repoPath;
    let shouldCleanup = false;

    // ✅ Handle GitHub URLs FIRST
    if (repoPath.includes('github.com') || repoPath.startsWith('http')) {
      console.log('🌐 Cloning GitHub repository...');
      
      const tempDir = path.join(os.tmpdir(), `excavate-${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });
      
      try {
        const simpleGit = (await import('simple-git')).default;
        const git = simpleGit();
        await git.clone(repoPath, tempDir, ['--depth', '1']);
        resolvedPath = tempDir;
        shouldCleanup = true;
        console.log('✅ Cloned to:', tempDir);
      } catch (error) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        return res.status(400).json({
          success: false,
          error: `Failed to clone: ${error instanceof Error ? error.message : 'Unknown'}`
        });
      }
    } else {
      // Local path validation
      resolvedPath = path.resolve(repoPath);
      
      if (!fs.existsSync(resolvedPath)) {
        return res.status(400).json({
          success: false,
          error: `Directory does not exist: ${resolvedPath}`
        });
      }

      if (!fs.existsSync(path.join(resolvedPath, '.git'))) {
        return res.status(400).json({
          success: false,
          error: `Not a git repository: ${resolvedPath}`
        });
      }
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const job: Job = {
      id: jobId,
      status: 'queued',
      repoPath: resolvedPath,
      options,
      createdAt: new Date()
    };

    jobs.set(jobId, job);

    setImmediate(async () => {
      try {
        job.status = 'running';
        
        const excavator = new ExcavatorAgent(resolvedPath, {
          ...options,
          verbose: false,
          interactive: false
        });

        const report = await excavator.excavate();

        job.status = 'completed';
        job.completedAt = new Date();
        job.report = report;

        if (shouldCleanup) {
          fs.rmSync(resolvedPath, { recursive: true, force: true });
        }
      } catch (error) {
        job.status = 'failed';
        job.completedAt = new Date();
        job.error = error instanceof Error ? error.message : 'Unknown error';

        if (shouldCleanup) {
          fs.rmSync(resolvedPath, { recursive: true, force: true });
        }
      }
    });

    res.json({
      success: true,
      data: { jobId, status: job.status, message: 'Excavation started' }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal error'
    });
  }
});

app.get('/api/jobs', (req, res) => {
  const jobList = Array.from(jobs.values()).map(j => ({
    id: j.id,
    status: j.status,
    repoPath: j.repoPath,
    createdAt: j.createdAt,
    completedAt: j.completedAt
  }));
  res.json({ success: true, data: jobList });
});

app.get('/api/jobs/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }
  res.json({ success: true, data: job });
});

app.get('/api/jobs/:jobId/report', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }
  if (job.status !== 'completed') {
    return res.status(400).json({ success: false, error: `Job is ${job.status}` });
  }
  res.json({ success: true, data: job.report });
});

app.listen(PORT, () => {
  console.log('🏛️  Code Archaeologist API Server');
  console.log(`✅ Running on http://localhost:${PORT}`);
});

export default app;
