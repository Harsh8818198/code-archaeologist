import { Router, Request, Response } from 'express';
import { vectorService } from '../services/vector-service.js';

const router = Router();

/**
 * POST /api/search
 * Semantic code search across a job's results
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { query, jobId, threshold = 0.6, limit = 10 } = req.body;

    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: 'Query is required' 
      });
    }

    console.log(`🔍 Search query: "${query}" ${jobId ? `(job: ${jobId.slice(0, 8)}...)` : '(all jobs)'}`);

    const results = await vectorService.searchSimilar(query, {
      jobId: jobId || undefined,
      threshold,
      limit
    });

    console.log(`   Found ${results.length} results`);

    res.json({
      success: true,
      query,
      results: results.map(r => ({
        id: r.id,
        jobId: r.job_id,
        filePath: r.file_path,
        similarity: Math.round(r.similarity * 100),
        preview: r.code_chunk.substring(0, 200),
        metadata: r.metadata
      })),
      count: results.length
    });

  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;
