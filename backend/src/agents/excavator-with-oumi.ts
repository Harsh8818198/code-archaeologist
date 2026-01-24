/**
 * THREE-TIER ANALYSIS INTEGRATION
 * 
 * Tier 1: Oumi (pattern-based, fast) - for simple cases
 * Tier 2: Gemini (AI-powered, deep) - for complex analysis
 * Tier 3: Fallback (basic metrics) - if both unavailable
 */

import { getOumiClient } from '../lib/oumi-client.js';
import { getGeminiEngine, ArchaeologicalAnalysis, CommitInfo } from '../lib/gemini-client.js';

interface FileAnalysisContext {
  filePath: string;
  code: string;
  language: string;
  commits: CommitInfo[];
}

export async function analyzeFileWithTiers(context: FileAnalysisContext): Promise<ArchaeologicalAnalysis> {
  const commitMessages = context.commits.map(c => c.message);
  
  // TIER 1: Try Oumi pattern matching (fast)
  const oumiClient = getOumiClient();
  if (oumiClient.isAvailable()) {
    const oumiResult = await oumiClient.analyzeQuick(context.filePath, commitMessages);
    
    if (oumiResult && oumiResult.confidence > 0.6) {
      console.log(`  ⚡ Oumi analysis (${oumiResult.source})`);
      return {
        summary: oumiResult.summary,
        businessContext: oumiResult.businessContext,
        technicalRationale: oumiResult.technicalRationale,
        dependencies: [],
        risks: [],
        recommendations: [],
        confidenceScore: oumiResult.confidence
      };
    }
  }

  // TIER 2: Use Gemini for complex analysis
  console.log(`  🧠 Gemini analysis (complex case)`);
  const gemini = getGeminiEngine();
  
  try {
    return await gemini.analyzeCode(
      {
        filePath: context.filePath,
        code: context.code,
        language: context.language
      },
      context.commits
    );
  } catch (error: any) {
    console.error(`  ❌ Gemini failed: ${error.message}`);
    
    // TIER 3: Fallback to basic analysis
    return {
      summary: `Analysis of ${context.filePath}`,
      businessContext: 'Analysis unavailable - AI services unreachable',
      technicalRationale: `File has ${context.commits.length} commits`,
      dependencies: [],
      risks: ['Analysis incomplete due to service unavailability'],
      recommendations: ['Re-run analysis when AI services are available'],
      confidenceScore: 0.3
    };
  }
}
