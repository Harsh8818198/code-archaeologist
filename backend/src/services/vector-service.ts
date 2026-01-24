import { supabase } from '../lib/supabase.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export class VectorService {
  
  /**
   * Generate embedding for text using Gemini (768 dimensions, FREE!)
   */
  async embedText(text: string): Promise<number[]> {
    try {
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      
      const result = await model.embedContent(text.substring(0, 10000));
      
      return result.embedding.values;
    } catch (error: any) {
      console.error('Embedding error:', error.message);
      throw error;
    }
  }

  /**
   * Store code embedding in Supabase
   */
  async storeEmbedding(
    jobId: string,
    filePath: string,
    codeChunk: string,
    embedding: number[],
    metadata: any = {}
  ): Promise<void> {
    if (!supabase) {
      console.warn('Supabase not available, skipping embedding storage');
      return;
    }

    const { error } = await supabase
      .from('code_embeddings')
      .upsert({
        job_id: jobId,
        file_path: filePath,
        code_chunk: codeChunk,
        chunk_index: 0,
        embedding: `[${embedding.join(',')}]`,
        metadata,
      }, {
        onConflict: 'job_id,file_path'
      });

    if (error) {
      console.error('Failed to store embedding:', error);
      throw error;
    }
  }

  /**
   * Embed and store a code file
   */
  async embedCodeFile(
    jobId: string,
    filePath: string,
    code: string,
    metadata: any = {}
  ): Promise<void> {
    const embedding = await this.embedText(code);
    await this.storeEmbedding(jobId, filePath, code, embedding, metadata);
  }

  /**
   * Search for similar code using semantic search
   */
  async searchSimilar(
    query: string,
    options: {
      jobId?: string;
      threshold?: number;
      limit?: number;
    } = {}
  ): Promise<Array<{
    id: string;
    job_id: string;
    file_path: string;
    code_chunk: string;
    similarity: number;
    metadata: any;
  }>> {
    if (!supabase) {
      console.warn('Supabase not available');
      return [];
    }

    // Generate query embedding
    const queryEmbedding = await this.embedText(query);

    // Search using Supabase RPC
    const { data, error } = await supabase.rpc('search_similar_code', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      match_threshold: options.threshold || 0.7,
      match_count: options.limit || 10,
      filter_job_id: options.jobId || null
    });

    if (error) {
      console.error('Search error:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Embed all files from an excavation job
   */
  async embedJobResults(jobId: string): Promise<void> {
    if (!supabase) {
      console.warn('Supabase not available');
      return;
    }

    console.log(`\n📊 Embedding job results: ${jobId}`);

    // Get job data
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    // Get artifact (excavation report)
    const { data: artifact, error: artifactError } = await supabase
      .from('artifacts')
      .select('data')
      .eq('job_id', jobId)
      .eq('type', 'report')
      .single();

    if (artifactError || !artifact) {
      throw new Error('No report artifact found');
    }

    const report = artifact.data;

    // Embed each analyzed file
    if (report.files && Array.isArray(report.files)) {
      console.log(`   Embedding ${report.files.length} files...`);
      
      for (const file of report.files) {
        try {
          // Create embedding from file analysis
          const text = `
File: ${file.path}
Language: ${file.language}
Lines: ${file.metrics?.lines || 0}
Complexity: ${file.metrics?.complexity || 0}

Definitions: ${file.metrics?.definitions?.join(', ') || 'none'}
Imports: ${file.metrics?.imports?.join(', ') || 'none'}

Analysis: ${file.analysis?.description || 'No analysis'}
          `.trim();

          await this.embedCodeFile(jobId, file.path, text, {
            language: file.language,
            lines: file.metrics?.lines,
            complexity: file.metrics?.complexity
          });

          console.log(`  ✅ Embedded: ${file.path}`);

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error: any) {
          console.error(`  ❌ Failed to embed ${file.path}:`, error.message);
        }
      }
      
      console.log(`✅ Embedding complete for job ${jobId}\n`);
    }
  }
}

// Singleton instance
export const vectorService = new VectorService();
