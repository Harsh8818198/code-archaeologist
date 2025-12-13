import "dotenv/config";
// backend/src/server.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { jobStore, activityStore, clarificationStore, ExcavationResult } from './lib/redis';
import { excavateRepository } from './excavator';

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://temporal-archaeologist.vercel.app',
    'https://code-archaeologist-frontend-avtff7ced-harsh8818198s-projects.vercel.app',
    'https://code-archaeologist-frontend.vercel.app',
    process.env.FRONTEND_URL || '',
  ].filter(Boolean),
  credentials: true,
}));

app.use(express.json());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ==================== EXCAVATION ENDPOINTS ====================

// Start new excavation
app.post('/api/excavate', async (req: Request, res: Response) => {
  try {
    const { repoUrl, options = {} } = req.body;
    
    if (!repoUrl) {
      return res.status(400).json({ error: 'repoUrl is required' });
    }

    // Validate GitHub URL
    const githubUrlRegex = /^https?:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/;
    if (!githubUrlRegex.test(repoUrl)) {
      return res.status(400).json({ error: 'Invalid GitHub repository URL' });
    }

    // Create job
    const job = await jobStore.create(repoUrl);
    
    // Log activity
    await activityStore.add({
      type: 'excavation-started',
      repoUrl,
      message: `Started excavation of ${repoUrl}`,
    });

    // Start excavation in background
    processExcavation(job.id, repoUrl, options).catch(console.error);

    res.status(202).json({
      jobId: job.id,
      status: job.status,
      message: 'Excavation started',
      pollUrl: `/api/excavate/${job.id}`,
    });
  } catch (error) {
    console.error('Error starting excavation:', error);
    res.status(500).json({ error: 'Failed to start excavation' });
  }
});

// Get excavation status
app.get('/api/excavate/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = await jobStore.get(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Error getting job:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

// Get recent excavations
app.get('/api/excavations/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const jobs = await jobStore.getRecent(limit);
    res.json(jobs);
  } catch (error) {
    console.error('Error getting recent excavations:', error);
    res.status(500).json({ error: 'Failed to get recent excavations' });
  }
});

// ==================== ACTIVITY FEED ENDPOINTS ====================

app.get('/api/activity/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const activities = await activityStore.getRecent(limit);
    res.json(activities);
  } catch (error) {
    console.error('Error getting activity feed:', error);
    res.status(500).json({ error: 'Failed to get activity feed' });
  }
});

// ==================== GRAPH ENDPOINTS ====================

app.get('/api/graph/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const graph = await jobStore.getGraph(jobId);
    
    if (!graph) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    res.json(graph);
  } catch (error) {
    console.error('Error getting graph:', error);
    res.status(500).json({ error: 'Failed to get graph' });
  }
});

// ==================== CLARIFICATION ENDPOINTS (Human-in-the-Loop) ====================

app.get('/api/clarify/:clarificationId', async (req: Request, res: Response) => {
  try {
    const { clarificationId } = req.params;
    const clarification = await clarificationStore.get(clarificationId);
    
    if (!clarification) {
      return res.status(404).json({ error: 'Clarification not found' });
    }

    res.json(clarification);
  } catch (error) {
    console.error('Error getting clarification:', error);
    res.status(500).json({ error: 'Failed to get clarification' });
  }
});

app.post('/api/clarify/:clarificationId', async (req: Request, res: Response) => {
  try {
    const { clarificationId } = req.params;
    const { response } = req.body;
    
    if (!response) {
      return res.status(400).json({ error: 'response is required' });
    }

    await clarificationStore.respond(clarificationId, response);
    
    res.json({ 
      success: true, 
      message: 'Clarification received. Thank you for providing context!' 
    });
  } catch (error) {
    console.error('Error responding to clarification:', error);
    res.status(500).json({ error: 'Failed to submit clarification' });
  }
});

app.get('/api/clarifications/pending', async (req: Request, res: Response) => {
  try {
    const clarifications = await clarificationStore.getPending();
    res.json(clarifications);
  } catch (error) {
    console.error('Error getting pending clarifications:', error);
    res.status(500).json({ error: 'Failed to get pending clarifications' });
  }
});

// ==================== WEBHOOK ENDPOINTS ====================

// GitHub webhook endpoint
app.post('/api/webhook/github', async (req: Request, res: Response) => {
  try {
    const event = req.headers['x-github-event'];
    const payload = req.body;
    
    console.log(`Received GitHub webhook: ${event}`);
    
    if (event === 'push') {
      const repoUrl = payload.repository?.html_url;
      const commits = payload.commits || [];
      
      await activityStore.add({
        type: 'webhook-received',
        repoUrl,
        message: `Received push event with ${commits.length} commits`,
        metadata: {
          branch: payload.ref,
          pusher: payload.pusher?.name,
          commits: commits.map((c: any) => ({
            id: c.id,
            message: c.message,
            author: c.author?.name,
          })),
        },
      });

      // Optionally trigger excavation
      if (process.env.AUTO_EXCAVATE_ON_PUSH === 'true') {
        const job = await jobStore.create(repoUrl);
        processExcavation(job.id, repoUrl, { incremental: true }).catch(console.error);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// Kestra callback webhook
app.post('/api/webhook/kestra', async (req: Request, res: Response) => {
  try {
    const { jobId, status, result, error } = req.body;
    
    if (status === 'completed' && result) {
      await jobStore.setResult(jobId, result);
      
      await activityStore.add({
        type: 'excavation-completed',
        repoUrl: result.repoUrl,
        message: `Excavation completed for ${result.repoUrl}`,
        metadata: {
          totalCommits: result.totalCommits,
          patternsFound: result.fossilizedPatterns?.length || 0,
        },
      });
    } else if (status === 'failed') {
      await jobStore.update(jobId, {
        status: 'failed',
        error: error || 'Unknown error',
      });
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing Kestra webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// ==================== BACKGROUND PROCESSING ====================

async function processExcavation(
  jobId: string, 
  repoUrl: string, 
  options: Record<string, any>
): Promise<void> {
  try {
    // Update status to processing
    await jobStore.update(jobId, {
      status: 'processing',
      progress: 5,
      currentStep: 'Cloning repository...',
    });

    // Step 1: Clone/fetch repository info
    await jobStore.update(jobId, {
      progress: 10,
      currentStep: 'Fetching repository metadata...',
    });

    // Step 2: Analyze commits
    await jobStore.update(jobId, {
      progress: 20,
      currentStep: 'Analyzing commit history...',
    });

    // Step 3: Run excavation
    await jobStore.update(jobId, {
      progress: 40,
      currentStep: 'Running AI-powered code archaeology...',
    });

    const result = await excavateRepository(repoUrl, {
      ...options,
      onProgress: async (progress: number, step: string) => {
        await jobStore.update(jobId, {
          progress: 40 + (progress * 0.5), // 40-90%
          currentStep: step,
        });
      },
    });

    // Step 4: Generate graph
    await jobStore.update(jobId, {
      progress: 90,
      currentStep: 'Generating knowledge graph...',
    });

    // Step 5: Complete
    await jobStore.setResult(jobId, result);

    await activityStore.add({
      type: 'excavation-completed',
      repoUrl,
      message: `Completed excavation of ${repoUrl}`,
      metadata: {
        totalCommits: result.totalCommits,
        patternsFound: result.fossilizedPatterns.length,
        gapsFound: result.knowledgeGaps.length,
      },
    });
  } catch (error) {
    console.error('Excavation failed:', error);
    await jobStore.update(jobId, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ==================== ERROR HANDLING ====================

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Code Archaeologist API running on port ${PORT}`);
});

export default app;
