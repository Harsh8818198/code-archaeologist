import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

/**
 * GET /api/analytics
 * Get AI usage statistics
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      return res.json({ 
        success: false, 
        error: 'Analytics not available (Supabase required)' 
      });
    }

    // Get last 7 days of data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from('ai_usage')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (error) throw error;

    // Aggregate statistics
    const stats = {
      totalQueries: data.length,
      byModel: {} as Record<string, number>,
      byComplexity: {} as Record<string, number>,
      avgResponseTime: 0,
      totalCost: 0,
      fallbackRate: 0
    };

    let totalResponseTime = 0;
    let fallbackCount = 0;

    data.forEach(item => {
      // By model
      stats.byModel[item.model_used] = (stats.byModel[item.model_used] || 0) + 1;
      
      // By complexity
      stats.byComplexity[item.complexity] = (stats.byComplexity[item.complexity] || 0) + 1;
      
      // Response time
      totalResponseTime += item.response_time_ms || 0;
      
      // Cost
      stats.totalCost += parseFloat(item.cost_estimate || 0);
      
      // Fallback
      if (item.metadata?.fallback) fallbackCount++;
    });

    stats.avgResponseTime = data.length > 0 ? Math.round(totalResponseTime / data.length) : 0;
    stats.fallbackRate = data.length > 0 ? Math.round((fallbackCount / data.length) * 100) : 0;

    res.json({
      success: true,
      period: '7 days',
      stats,
      recentQueries: data.slice(-10).reverse().map(q => ({
        query: q.query_text.substring(0, 50) + '...',
        model: q.model_used,
        complexity: q.complexity,
        responseTime: q.response_time_ms,
        timestamp: q.created_at
      }))
    });

  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;
