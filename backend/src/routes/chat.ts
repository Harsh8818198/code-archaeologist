import { Router, Request, Response } from 'express';
import { aiRouter } from '../services/ai-router.js';
import { vectorService } from '../services/vector-service.js';
import { supabase } from '../lib/supabase.js';
import { randomUUID } from 'crypto';

const router = Router();

/**
 * POST /api/chat
 * Context-aware chat with vector search integration
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      message, 
      jobId, 
      sessionId: existingSessionId,
      includeVectorSearch = true 
    } = req.body;

    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message is required' 
      });
    }

    console.log(`💬 Chat: "${message.substring(0, 50)}..." ${jobId ? `(job: ${jobId.slice(0, 8)}...)` : ''}`);

    // Get or create session
    let sessionId = existingSessionId;
    if (!sessionId) {
      sessionId = await createChatSession(jobId);
      console.log(`   📝 New session: ${sessionId.slice(0, 8)}...`);
    }

    // Build context from multiple sources
    let context = '';
    const sources: string[] = [];

    // 1. Vector search for relevant code
    if (includeVectorSearch && jobId) {
      try {
        const searchResults = await vectorService.searchSimilar(message, {
          jobId,
          threshold: 0.5,
          limit: 3
        });

        if (searchResults.length > 0) {
          context += '\n## Relevant Code:\n\n';
          searchResults.forEach((r, i) => {
            context += `**File ${i + 1}: ${r.file_path}** (${Math.round(r.similarity * 100)}% match)\n`;
            context += `${r.code_chunk.substring(0, 300)}...\n\n`;
            sources.push(`${r.file_path} (${Math.round(r.similarity * 100)}%)`);
          });
          console.log(`   🔍 Found ${searchResults.length} relevant files`);
        }
      } catch (error: any) {
        console.error('Vector search failed:', error.message);
      }
    }

    // 2. Job excavation data
    if (jobId && supabase) {
      try {
        const { data: job } = await supabase
          .from('jobs')
          .select('repo_url, status, current_step')
          .eq('id', jobId)
          .single();

        if (job) {
          context += `\n## Repository Info:\n`;
          context += `- Repository: ${job.repo_url}\n`;
          context += `- Status: ${job.status}\n\n`;
        }

        // Get summary from artifact
        const { data: artifact } = await supabase
          .from('artifacts')
          .select('data')
          .eq('job_id', jobId)
          .eq('type', 'report')
          .single();

        if (artifact?.data) {
          const report = artifact.data;
          context += `## Project Summary:\n`;
          context += `- Total Files: ${report.stats?.totalFiles || 'N/A'}\n`;
          context += `- Languages: ${Object.keys(report.stats?.languages || {}).join(', ')}\n`;
          if (report.insights?.businessDomains) {
            context += `- Domains: ${report.insights.businessDomains.join(', ')}\n`;
          }
          context += '\n';
        }
      } catch (error: any) {
        console.error('Failed to load job context:', error.message);
      }
    }

    // 3. Previous chat messages
    const chatHistory = await getChatHistory(sessionId, 5);
    if (chatHistory.length > 0) {
      context += `\n## Previous Conversation:\n`;
      chatHistory.reverse().forEach(msg => {
        context += `${msg.role}: ${msg.content.substring(0, 100)}...\n`;
      });
      context += '\n';
    }

    // Route to appropriate AI model
    const aiResponse = await aiRouter.route(message, context);

    // Save messages to database
    await saveChatMessage(sessionId, 'user', message);
    await saveChatMessage(sessionId, 'assistant', aiResponse.content, {
      model: aiResponse.model,
      responseTime: aiResponse.responseTimeMs,
      tokensUsed: aiResponse.tokensUsed
    });

    console.log(`   ✅ Responded with ${aiResponse.model} (${aiResponse.responseTimeMs}ms)`);

    res.json({
      success: true,
      sessionId,
      message: aiResponse.content,
      metadata: {
        model: aiResponse.model,
        responseTimeMs: aiResponse.responseTimeMs,
        confidence: aiResponse.confidence,
        fallback: aiResponse.fallback,
        sourcesFound: sources.length,
        sources: sources
      }
    });

  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/chat/:sessionId/history
 * Get chat history for a session
 */
router.get('/:sessionId/history', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const history = await getChatHistory(sessionId, 50);
    
    res.json({
      success: true,
      sessionId,
      messages: history.map(h => ({
        role: h.role,
        content: h.content,
        timestamp: h.created_at,
        model: h.model_used
      }))
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Helper functions
async function createChatSession(jobId?: string): Promise<string> {
  if (!supabase) return randomUUID();

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      job_id: jobId || null
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

async function getChatHistory(sessionId: string, limit: number = 20): Promise<any[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function saveChatMessage(
  sessionId: string, 
  role: 'user' | 'assistant' | 'system', 
  content: string,
  metadata: any = {}
): Promise<void> {
  if (!supabase) return;

  await supabase.from('chat_messages').insert({
    session_id: sessionId,
    role,
    content,
    model_used: metadata.model || null,
    response_time_ms: metadata.responseTime || null,
    tokens_used: metadata.tokensUsed || null,
    metadata
  });
}

export default router;
