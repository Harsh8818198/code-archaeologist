import { queryAnalyzer, QueryAnalysis, AIModel } from '../lib/query-analyzer.js';
import { getGeminiEngine } from '../lib/gemini-client.js';
import { supabase } from '../lib/supabase.js';

export interface AIResponse {
  content: string;
  model: AIModel;
  responseTimeMs: number;
  tokensUsed?: number;
  confidence: number;
  fallback: boolean;
}

export class AIRouter {
  
  /**
   * Route query to appropriate AI model with fallback chain
   */
  async route(query: string, context?: string): Promise<AIResponse> {
    const startTime = Date.now();
    
    // Analyze query
    const analysis = queryAnalyzer.analyze(query, context);
    console.log(`📊 Query Analysis: ${analysis.complexity} (${analysis.category}) → ${analysis.suggestedModel}`);
    
    let response: AIResponse;
    let fallback = false;
    
    try {
      // Try suggested model first
      if (analysis.suggestedModel === 'oumi') {
        response = await this.tryOumi(query, context);
        
        // If Oumi is uncertain, escalate to Gemini
        if (response.confidence < 0.6) {
          console.log(`⚠️  Oumi confidence low (${response.confidence}), escalating to Gemini`);
          fallback = true;
          response = await this.tryGemini(query, context);
        }
      } else {
        // Use Gemini for medium/complex queries
        response = await this.tryGemini(query, context);
      }
      
    } catch (error: any) {
      console.error(`❌ ${analysis.suggestedModel} failed:`, error.message);
      fallback = true;
      
      // Fallback chain: Oumi → Gemini → Error
      if (analysis.suggestedModel === 'oumi') {
        response = await this.tryGemini(query, context);
      } else {
        throw error;
      }
    }
    
    const responseTimeMs = Date.now() - startTime;
    
    // Log usage for analytics
    this.logUsage(query, analysis, response, responseTimeMs, fallback);
    
    return {
      ...response,
      responseTimeMs,
      fallback
    };
  }
  
  /**
   * Try Oumi model (fast pattern matching)
   */
  private async tryOumi(query: string, context?: string): Promise<Omit<AIResponse, 'responseTimeMs' | 'fallback'>> {
    // Simple pattern matching based on Oumi training
    const patterns = {
      'bug fix': { response: 'This appears to be a bug fix addressing a production issue', confidence: 0.9 },
      'feature': { response: 'New feature implementation', confidence: 0.85 },
      'refactor': { response: 'Code refactoring for improved maintainability', confidence: 0.85 },
      'update': { response: 'Dependency or configuration update', confidence: 0.8 },
      'fix': { response: 'Fix for an identified issue', confidence: 0.85 },
      'add': { response: 'Addition of new functionality or component', confidence: 0.8 },
      'remove': { response: 'Removal of deprecated or unused code', confidence: 0.8 }
    };
    
    const queryLower = query.toLowerCase();
    
    for (const [pattern, result] of Object.entries(patterns)) {
      if (queryLower.includes(pattern)) {
        return {
          content: result.response,
          model: 'oumi',
          confidence: result.confidence,
          tokensUsed: query.length // Approximate
        };
      }
    }
    
    // Low confidence if no pattern matched
    return {
      content: 'Unable to determine with confidence',
      model: 'oumi',
      confidence: 0.4,
      tokensUsed: query.length
    };
  }
  
  /**
   * Try Gemini model (deep reasoning)
   */
  private async tryGemini(query: string, context?: string): Promise<Omit<AIResponse, 'responseTimeMs' | 'fallback'>> {
    const gemini = getGeminiEngine();
    
    const prompt = context 
      ? `Context:\n${context}\n\nQuestion: ${query}\n\nProvide a clear, concise answer.`
      : query;
    
    const response = await gemini.generate(prompt);
    
    return {
      content: response,
      model: 'gemini',
      confidence: 0.85, // Gemini generally high confidence
      tokensUsed: prompt.length + response.length // Approximate
    };
  }
  
  /**
   * Log usage to database for analytics
   */
  private async logUsage(
    query: string, 
    analysis: QueryAnalysis, 
    response: Omit<AIResponse, 'responseTimeMs' | 'fallback'>,
    responseTimeMs: number,
    fallback: boolean
  ): Promise<void> {
    if (!supabase) return;
    
    try {
      await supabase.from('ai_usage').insert({
        query_text: query.substring(0, 500),
        query_category: analysis.category,
        complexity: analysis.complexity,
        model_used: response.model,
        response_time_ms: responseTimeMs,
        tokens_used: response.tokensUsed,
        cost_estimate: this.estimateCost(response.model, response.tokensUsed || 0),
        metadata: {
          suggested_model: analysis.suggestedModel,
          fallback,
          confidence: response.confidence
        }
      });
    } catch (error: any) {
      console.error('Failed to log usage:', error.message);
    }
  }
  
  private estimateCost(model: AIModel, tokens: number): number {
    const costPer1kTokens = {
      oumi: 0,       // Free (local)
      gemini: 0,     // Free tier
      gpt4: 0.03     // $0.03 per 1K tokens (if implemented)
    };
    
    return (tokens / 1000) * (costPer1kTokens[model] || 0);
  }
}

// Singleton
export const aiRouter = new AIRouter();
