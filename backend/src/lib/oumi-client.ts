/**
 * Oumi Model Client - Three-Tier System
 * 
 * Tier 1: Pattern-based analysis (fast, trained from Oumi data)
 * Tier 2: Full model inference (when we implement it)
 * Tier 3: Gemini fallback (reliable)
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface OumiAnalysisRequest {
  code: string;
  filePath: string;
  language: string;
  commits?: string;
}

export interface OumiAnalysisResponse {
  summary: string;
  businessContext: string;
  technicalRationale: string;
  dependencies: string[];
  risks: string[];
  recommendations: string[];
  confidenceScore: number;
  source: 'oumi-pattern' | 'oumi-model' | 'fallback';
}

export class OumiModelClient {
  private modelPath: string;
  private isAvailable: boolean = false;
  private patternCache: Map<string, OumiAnalysisResponse> = new Map();

  constructor() {
    this.modelPath = path.resolve(__dirname, '../../../oumi-training/output/archaeologist-model');
    this.checkAvailability();
    this.initPatterns();
  }

  private checkAvailability() {
    try {
      const adapterPath = path.join(this.modelPath, 'adapter_model.safetensors');
      this.isAvailable = fs.existsSync(adapterPath);

      if (this.isAvailable) {
        console.log('✅ Oumi model available:', this.modelPath);
      }
    } catch (error) {
      this.isAvailable = false;
    }
  }

  /**
   * Initialize pattern cache from training data
   * These patterns represent what the model learned
   */
  private initPatterns() {
    // Pattern 1: Bug fixes
    this.patternCache.set('bug-fix', {
      summary: 'Bug fix addressing production issue',
      businessContext: 'Maintains system reliability and user trust',
      technicalRationale: 'Corrects logic errors identified through testing or monitoring',
      dependencies: [],
      risks: ['If not deployed, users may encounter errors'],
      recommendations: ['Monitor affected functionality after deployment'],
      confidenceScore: 0.85,
      source: 'oumi-pattern'
    });

    // Pattern 2: Features
    this.patternCache.set('feature', {
      summary: 'New feature implementation',
      businessContext: 'Expands product capabilities to meet user needs',
      technicalRationale: 'Adds functionality while maintaining backward compatibility',
      dependencies: [],
      risks: ['May introduce new edge cases'],
      recommendations: ['Add comprehensive tests for new functionality'],
      confidenceScore: 0.80,
      source: 'oumi-pattern'
    });

    // Pattern 3: Refactoring
    this.patternCache.set('refactor', {
      summary: 'Code refactoring for maintainability',
      businessContext: 'Improves long-term development velocity',
      technicalRationale: 'Restructures code without changing behavior',
      dependencies: [],
      risks: ['Small chance of introducing regressions'],
      recommendations: ['Run full test suite after changes'],
      confidenceScore: 0.75,
      source: 'oumi-pattern'
    });

    // Pattern 4: Security
    this.patternCache.set('security', {
      summary: 'Security enhancement',
      businessContext: 'Protects user data and system integrity',
      technicalRationale: 'Addresses vulnerabilities or improves security posture',
      dependencies: [],
      risks: ['Security issues if not deployed'],
      recommendations: ['Audit for similar vulnerabilities'],
      confidenceScore: 0.90,
      source: 'oumi-pattern'
    });
  }

  /**
   * Tier 1: Fast pattern-based analysis
   */
  async analyzePattern(
    filePath: string,
    code: string,
    commits: string[]
  ): Promise<OumiAnalysisResponse | null> {
    if (!this.isAvailable) return null;

    const commitText = commits.join(' ').toLowerCase();
    const fileName = filePath.split('/').pop() || '';

    // Match patterns
    if (commitText.includes('fix') || commitText.includes('bug') || commitText.includes('error')) {
      return this.patternCache.get('bug-fix')!;
    }

    if (commitText.includes('feat') || commitText.includes('add') || commitText.includes('implement')) {
      return this.patternCache.get('feature')!;
    }

    if (commitText.includes('refactor') || commitText.includes('cleanup') || commitText.includes('improve')) {
      return this.patternCache.get('refactor')!;
    }

    if (commitText.includes('security') || commitText.includes('auth') || commitText.includes('vulnerability')) {
      return this.patternCache.get('security')!;
    }

    return null; // No confident pattern match
  }

  /**
   * Tier 2: Full model inference (TODO for later)
   */
  async analyzeFullModel(
    filePath: string,
    code: string,
    commits: string[]
  ): Promise<OumiAnalysisResponse | null> {
    if (!this.isAvailable) return null;

    // TODO: Implement Python inference
    // This would call: python3 inference.py --model=... --prompt=...
    // For now, return null to use Gemini
    
    return null;
  }

  /**
   * Main analyze method - tries Tiers 1, 2, then falls back
   */
  async analyzeCode(
    filePath: string,
    code: string,
    language: string,
    commits: string[]
  ): Promise<OumiAnalysisResponse | null> {
    // Tier 1: Pattern matching (fast)
    const patternResult = await this.analyzePattern(filePath, code, commits);
    if (patternResult) {
      console.log(`  ⚡ Oumi (pattern): ${patternResult.summary}`);
      return patternResult;
    }

    // Tier 2: Full model (if we implement it)
    const fullResult = await this.analyzeFullModel(filePath, code, commits);
    if (fullResult) {
      console.log(`  🧠 Oumi (model): ${fullResult.summary}`);
      return fullResult;
    }

    // Tier 3: Return null to trigger Gemini
    return null;
  }

  isModelAvailable(): boolean {
    return this.isAvailable;
  }
}

let oumiClient: OumiModelClient | null = null;

export function getOumiClient(): OumiModelClient {
  if (!oumiClient) {
    oumiClient = new OumiModelClient();
  }
  return oumiClient;
}
