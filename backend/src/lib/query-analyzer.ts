/**
 * Query Analyzer - Determines query complexity and best model
 */

export type QueryComplexity = 'simple' | 'medium' | 'complex';
export type QueryCategory = 'pattern' | 'explanation' | 'design' | 'search';
export type AIModel = 'oumi' | 'gemini' | 'gpt4';

export interface QueryAnalysis {
  complexity: QueryComplexity;
  category: QueryCategory;
  suggestedModel: AIModel;
  confidence: number;
  reasoning: string;
}

export class QueryAnalyzer {
  
  /**
   * Analyze a query and determine optimal routing
   */
  analyze(query: string, context?: any): QueryAnalysis {
    const normalized = query.toLowerCase().trim();
    const wordCount = normalized.split(/\s+/).length;
    
    // Category detection
    const category = this.detectCategory(normalized);
    
    // Complexity scoring
    let complexityScore = 0;
    
    // Length-based complexity
    if (wordCount <= 5) complexityScore += 1;
    else if (wordCount <= 15) complexityScore += 2;
    else complexityScore += 3;
    
    // Pattern indicators (simple)
    const simplePatterns = [
      /^(bug fix|feature|refactor|update|add|remove|delete|create)/i,
      /^(what is|find|search|show|list)/i,
      /\b(bug|fix|error|issue)\b/i
    ];
    if (simplePatterns.some(p => p.test(normalized))) {
      complexityScore -= 1;
    }
    
    // Complex indicators
    const complexPatterns = [
      /\b(why|how|explain|architecture|design|refactor|optimize)\b/i,
      /\b(should|could|would|recommend|suggest|best practice)\b/i,
      /\b(security|performance|scalability|maintainability)\b/i,
      /\b(trade-?off|alternative|comparison)\b/i
    ];
    if (complexPatterns.some(p => p.test(normalized))) {
      complexityScore += 2;
    }
    
    // Code-specific complexity
    if (normalized.match(/\bclass\b|\bfunction\b|\bmethod\b|\bapi\b/i)) {
      complexityScore += 1;
    }
    
    // Determine final complexity
    let complexity: QueryComplexity;
    if (complexityScore <= 2) complexity = 'simple';
    else if (complexityScore <= 4) complexity = 'medium';
    else complexity = 'complex';
    
    // Model suggestion
    const suggestedModel = this.suggestModel(complexity, category);
    
    // Confidence calculation
    const confidence = this.calculateConfidence(normalized, complexity, category);
    
    return {
      complexity,
      category,
      suggestedModel,
      confidence,
      reasoning: this.generateReasoning(complexity, category, suggestedModel)
    };
  }
  
  private detectCategory(query: string): QueryCategory {
    // Pattern matching queries
    if (query.match(/^(bug|fix|feature|refactor|update|add|remove)/i)) {
      return 'pattern';
    }
    
    // Design/architecture queries
    if (query.match(/\b(architecture|design|structure|pattern|organize)\b/i)) {
      return 'design';
    }
    
    // Search queries
    if (query.match(/^(find|search|show|list|get|where)/i)) {
      return 'search';
    }
    
    // Default to explanation
    return 'explanation';
  }
  
  private suggestModel(complexity: QueryComplexity, category: QueryCategory): AIModel {
    // Pattern recognition → Oumi (fast, trained on commit patterns)
    if (category === 'pattern' && complexity === 'simple') {
      return 'oumi';
    }
    
    // Simple search or explanations → Oumi
    if (complexity === 'simple') {
      return 'oumi';
    }
    
    // Design/architecture → GPT-4 (most capable, but we'll use Gemini for now)
    if (category === 'design' || complexity === 'complex') {
      return 'gemini'; // Could be 'gpt4' if implemented
    }
    
    // Default: Gemini (medium complexity)
    return 'gemini';
  }
  
  private calculateConfidence(query: string, complexity: QueryComplexity, category: QueryCategory): number {
    let confidence = 0.7; // Base confidence
    
    // High confidence for clear patterns
    if (query.match(/^(bug fix|feature|refactor|add|remove)/i)) {
      confidence = 0.95;
    }
    
    // Lower confidence for ambiguous queries
    if (query.split(/\s+/).length > 20) {
      confidence -= 0.1;
    }
    
    // Adjust based on category clarity
    if (category === 'pattern') confidence += 0.1;
    if (category === 'design') confidence -= 0.05;
    
    return Math.max(0.5, Math.min(0.99, confidence));
  }
  
  private generateReasoning(complexity: QueryComplexity, category: QueryCategory, model: AIModel): string {
    const reasons = [];
    
    if (complexity === 'simple') {
      reasons.push('Query is straightforward');
    } else if (complexity === 'complex') {
      reasons.push('Query requires deep analysis');
    }
    
    if (category === 'pattern') {
      reasons.push('Pattern matching task');
    } else if (category === 'design') {
      reasons.push('Architecture/design question');
    }
    
    if (model === 'oumi') {
      reasons.push('Oumi can handle efficiently');
    } else if (model === 'gemini') {
      reasons.push('Gemini needed for reasoning');
    }
    
    return reasons.join(', ');
  }
}

// Singleton
export const queryAnalyzer = new QueryAnalyzer();
