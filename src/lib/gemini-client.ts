/**
 * Google Gemini Client - The Synthesis Engine
 * 
 * With rate limit handling and model fallback
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "dotenv";
import * as fs from "fs";

// Load environment variables
config();

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface CodeContext {
  filePath: string;
  code: string;
  language: string;
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
  diff?: string;
}

export interface ArchaeologicalAnalysis {
  summary: string;
  businessContext: string;
  technicalRationale: string;
  dependencies: string[];
  risks: string[];
  recommendations: string[];
  confidenceScore: number;
}

export interface KnowledgeGraphNode {
  id: string;
  type: "file" | "function" | "decision" | "author" | "issue";
  label: string;
  metadata: Record<string, unknown>;
}

export interface KnowledgeGraphEdge {
  source: string;
  target: string;
  relationship: string;
  weight: number;
}

export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  clusters: Array<{
    name: string;
    nodeIds: string[];
  }>;
}

export interface TrainingDataPair {
  input: string;
  output: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// GEMINI SYNTHESIS ENGINE CLASS
// ============================================

export class GeminiSynthesisEngine {
  private genAI: GoogleGenerativeAI;
  private modelName: string;
  private apiKey: string;
  private availableModels: string[] = [];
  private currentModelIndex: number = 0;
  private maxRetries: number = 3;
  private baseDelay: number = 2000; // 2 seconds

  // Models to try in order (prefer lite/flash models for rate limits)
  private readonly MODEL_PRIORITY = [
    "gemini-2.0-flash-lite",        // Lite = higher rate limits
    "gemini-2.5-flash-lite",        
    "gemini-2.0-flash-lite-001",    
    "gemini-2.0-flash",             
    "gemini-2.5-flash",             
    "gemini-flash-lite-latest",     
    "gemini-flash-latest",          
    "gemini-2.0-flash-001",         
    "gemini-2.5-pro",               
    "gemini-2.0-pro-exp",           
  ];

  constructor(modelName?: string) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "GOOGLE_AI_API_KEY not found in environment variables.\n" +
        "Get your free API key at: https://aistudio.google.com/\n" +
        "Then add it to your .env file: GOOGLE_AI_API_KEY=your-key-here"
      );
    }

    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName || "";
  }

  /**
   * List all available models for your API key
   */
  async listAvailableModels(): Promise<string[]> {
    if (this.availableModels.length > 0) {
      return this.availableModels;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.models) {
        this.availableModels = data.models
          .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m: any) => m.name.replace("models/", ""));
        return this.availableModels;
      }
      return [];
    } catch (error) {
      console.error("Error listing models:", error);
      return [];
    }
  }

  /**
   * Find the best available model (prioritizing lite models for rate limits)
   */
  async initialize(): Promise<string> {
    if (this.modelName) {
      return this.modelName;
    }

    const availableModels = await this.listAvailableModels();
    
    // Find first matching model from priority list
    for (const preferred of this.MODEL_PRIORITY) {
      if (availableModels.includes(preferred)) {
        this.modelName = preferred;
        this.currentModelIndex = this.MODEL_PRIORITY.indexOf(preferred);
        console.log(`✓ Using model: ${this.modelName}`);
        return this.modelName;
      }
    }

    // Fallback: find any gemini model that's not image/tts/vision specific
    const geminiModel = availableModels.find(m => 
      m.includes("gemini") && 
      !m.includes("vision") && 
      !m.includes("image") && 
      !m.includes("tts") &&
      !m.includes("embedding")
    );
    
    if (geminiModel) {
      this.modelName = geminiModel;
      console.log(`✓ Using model: ${this.modelName}`);
      return this.modelName;
    }

    throw new Error("No compatible Gemini models found");
  }

  /**
   * Switch to next available model (for rate limit fallback)
   */
  private async switchToNextModel(): Promise<boolean> {
    const availableModels = await this.listAvailableModels();
    
    // Try next models in priority list
    for (let i = this.currentModelIndex + 1; i < this.MODEL_PRIORITY.length; i++) {
      const model = this.MODEL_PRIORITY[i];
      if (availableModels.includes(model)) {
        this.modelName = model;
        this.currentModelIndex = i;
        console.log(`   ↳ Switched to model: ${this.modelName}`);
        return true;
      }
    }

    // Try any available model we haven't tried
    for (const model of availableModels) {
      if (!this.MODEL_PRIORITY.includes(model) && 
          model.includes("gemini") && 
          !model.includes("vision") && 
          !model.includes("image") && 
          !model.includes("tts")) {
        this.modelName = model;
        console.log(`   ↳ Switched to model: ${this.modelName}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Get the generative model
   */
  private getModel() {
    return this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: 0.3,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });
  }

  /**
   * Extract retry delay from error message
   */
  private extractRetryDelay(error: any): number {
    try {
      const message = error.message || "";
      // Look for "retry in Xs" pattern
      const match = message.match(/retry in (\d+(?:\.\d+)?)/i);
      if (match) {
        return Math.ceil(parseFloat(match[1]) * 1000);
      }
      // Look for retryDelay in error details
      if (error.errorDetails) {
        for (const detail of error.errorDetails) {
          if (detail.retryDelay) {
            const seconds = parseInt(detail.retryDelay);
            if (!isNaN(seconds)) {
              return seconds * 1000;
            }
          }
        }
      }
    } catch {}
    return 60000; // Default 60 seconds
  }

  /**
   * Simple text generation with retry and model fallback
   */
  async generate(prompt: string): Promise<string> {
    // Auto-initialize if not done
    if (!this.modelName) {
      await this.initialize();
    }

    let lastError: any;
    let attempt = 0;

    while (attempt < this.maxRetries) {
      try {
        const model = this.getModel();
        const result = await model.generateContent(prompt);
        return result.response.text();
        
      } catch (error: any) {
        lastError = error;
        attempt++;

        // Check if it's a rate limit error (429)
        if (error.status === 429) {
          const retryDelay = this.extractRetryDelay(error);
          
          // First try switching to a different model
          const switched = await this.switchToNextModel();
          
          if (switched) {
            console.log(`   ⚡ Rate limited, trying different model...`);
            continue; // Try immediately with new model
          }

          // If no other model available, wait and retry
          if (attempt < this.maxRetries) {
            const waitTime = Math.min(retryDelay, 30000); // Max 30 seconds wait
            console.log(`   ⏳ Rate limited. Waiting ${Math.ceil(waitTime / 1000)}s before retry ${attempt}/${this.maxRetries}...`);
            await this.sleep(waitTime);
            continue;
          }
        }

        // For other errors, use exponential backoff
        if (attempt < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt - 1);
          console.log(`   ⚠️ Error, retrying in ${delay / 1000}s...`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Parse JSON from AI response (handles markdown code blocks)
   */
  private parseJsonResponse(text: string): unknown {
    let cleaned = text.trim();
    
    // Remove markdown code blocks
    cleaned = cleaned.replace(/^```json\s*/i, "");
    cleaned = cleaned.replace(/^```\s*/i, "");
    cleaned = cleaned.replace(/\s*```$/i, "");
    cleaned = cleaned.trim();
    
    // Find JSON object or array
    const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return JSON.parse(cleaned);
  }

  /**
   * Analyze code and extract archaeological context
   */
  async analyzeCodeContext(
    code: CodeContext,
    commits: CommitInfo[]
  ): Promise<ArchaeologicalAnalysis> {
    const commitHistory = commits
      .map((c, i) => {
        let entry = `Commit ${i + 1} (${c.hash.slice(0, 7)}):
  - Date: ${c.date}
  - Author: ${c.author}
  - Message: ${c.message}`;
        if (c.diff) {
          entry += `\n  - Changes: ${c.diff.slice(0, 500)}`;
        }
        return entry;
      })
      .join("\n\n");

    const prompt = `You are a senior software archaeologist analyzing code to understand WHY it exists.

FILE: ${code.filePath}
LANGUAGE: ${code.language}

CODE:
\`\`\`${code.language}
${code.code}
\`\`\`

COMMIT HISTORY:
${commitHistory}

Analyze this code and respond with ONLY a JSON object (no markdown, no explanation):
{
  "summary": "What this code does in 2-3 sentences",
  "businessContext": "Why this code exists from a business perspective",
  "technicalRationale": "Why it was implemented this way",
  "dependencies": ["list", "of", "dependencies"],
  "risks": ["potential", "risks", "if modified"],
  "recommendations": ["suggestions", "for", "maintainers"],
  "confidenceScore": 0.85
}`;

    try {
      const response = await this.generate(prompt);
      const parsed = this.parseJsonResponse(response) as ArchaeologicalAnalysis;
      return parsed;
    } catch (error) {
      console.error("Analysis error:", error);
      return {
        summary: "Analysis failed",
        businessContext: "Unable to determine",
        technicalRationale: "Unable to determine",
        dependencies: [],
        risks: ["Analysis failed - manual review recommended"],
        recommendations: ["Retry analysis or review manually"],
        confidenceScore: 0,
      };
    }
  }

  /**
   * Analyze entire repository structure
   */
  async analyzeRepository(
    files: CodeContext[],
    recentCommits: CommitInfo[]
  ): Promise<{
    overview: string;
    architecture: string;
    domains: string[];
    technicalDebt: string[];
    knowledgeGaps: string[];
  }> {
    const fileList = files
      .map((f) => `- ${f.filePath} (${f.language})`)
      .join("\n");

    const commitList = recentCommits
      .slice(0, 30)
      .map((c) => `- ${c.date}: ${c.message} (${c.author})`)
      .join("\n");

    const prompt = `You are analyzing a codebase as a software archaeologist.

FILES IN REPOSITORY:
${fileList}

RECENT COMMITS:
${commitList}

Provide a comprehensive analysis. Respond with ONLY a JSON object:
{
  "overview": "High-level overview of what this codebase does",
  "architecture": "Description of architectural patterns used",
  "domains": ["business", "domains", "identified"],
  "technicalDebt": ["areas", "of", "technical", "debt"],
  "knowledgeGaps": ["areas", "needing", "documentation"]
}`;

    try {
      const response = await this.generate(prompt);
      return this.parseJsonResponse(response) as {
        overview: string;
        architecture: string;
        domains: string[];
        technicalDebt: string[];
        knowledgeGaps: string[];
      };
    } catch (error) {
      console.error("Repository analysis error:", error);
      return {
        overview: "Analysis failed",
        architecture: "Unknown",
        domains: [],
        technicalDebt: [],
        knowledgeGaps: ["Analysis failed"],
      };
    }
  }

  /**
   * Generate a knowledge graph connecting code elements
   */
  async generateKnowledgeGraph(
    files: CodeContext[],
    commits: CommitInfo[]
  ): Promise<KnowledgeGraph> {
    const fileList = files.map((f) => f.filePath).join("\n");
    const commitList = commits
      .slice(0, 20)
      .map((c) => `${c.hash.slice(0, 7)}: ${c.message} by ${c.author}`)
      .join("\n");

    const prompt = `Create a knowledge graph for this codebase.

FILES:
${fileList}

COMMITS:
${commitList}

Generate relationships between files, authors, and decisions.
Respond with ONLY a JSON object:
{
  "nodes": [
    {"id": "file-1", "type": "file", "label": "filename.ts", "metadata": {}}
  ],
  "edges": [
    {"source": "file-1", "target": "file-2", "relationship": "imports", "weight": 0.8}
  ],
  "clusters": [
    {"name": "Authentication", "nodeIds": ["file-1", "file-2"]}
  ]
}`;

    try {
      const response = await this.generate(prompt);
      return this.parseJsonResponse(response) as KnowledgeGraph;
    } catch (error) {
      console.error("Knowledge graph error:", error);
      return { nodes: [], edges: [], clusters: [] };
    }
  }

  /**
   * Generate training data for fine-tuning (Oumi)
   */
  async generateTrainingData(
    commits: CommitInfo[]
  ): Promise<TrainingDataPair[]> {
    const pairs: TrainingDataPair[] = [];
    const batchSize = 3; // Smaller batches for rate limits

    console.log(`Generating training data from ${commits.length} commits...`);

    for (let i = 0; i < commits.length; i += batchSize) {
      const batch = commits.slice(i, i + batchSize);

      const commitDescriptions = batch
        .map((c, idx) => {
          let desc = `Commit ${idx + 1}:
- Message: ${c.message}
- Author: ${c.author}
- Date: ${c.date}`;
          if (c.diff) {
            desc += `\n- Diff: ${c.diff.slice(0, 300)}`;
          }
          return desc;
        })
        .join("\n\n");

      const prompt = `For each commit, explain the business context.

${commitDescriptions}

Respond with ONLY a JSON array:
[
  {
    "input": "commit message and summary",
    "output": "business context explanation"
  }
]`;

      try {
        const response = await this.generate(prompt);
        const parsed = this.parseJsonResponse(response) as Array<{
          input: string;
          output: string;
        }>;

        pairs.push(
          ...parsed.map((p) => ({
            input: p.input,
            output: p.output,
          }))
        );
      } catch (error) {
        console.error(`Batch ${Math.floor(i / batchSize)} error:`, error);
      }

      // Rate limiting - longer delay between batches
      if (i + batchSize < commits.length) {
        await this.sleep(3000);
      }
    }

    return pairs;
  }

  /**
   * Interactive chat about code
   */
  async chat(
    message: string,
    context?: string,
    history?: Array<{ role: "user" | "model"; content: string }>
  ): Promise<string> {
    if (!this.modelName) {
      await this.initialize();
    }

    const model = this.getModel();

    const chatHistory = history?.map((h) => ({
      role: h.role,
      parts: [{ text: h.content }],
    }));

    const chat = model.startChat({
      history: chatHistory,
    });

    const prompt = context
      ? `Context:\n${context}\n\nQuestion: ${message}`
      : message;

    const result = await chat.sendMessage(prompt);
    return result.response.text();
  }

  /**
   * Count tokens in text
   */
  async countTokens(text: string): Promise<number> {
    if (!this.modelName) {
      await this.initialize();
    }

    try {
      const model = this.getModel();
      const result = await model.countTokens(text);
      return result.totalTokens;
    } catch {
      // Estimate tokens if API fails
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Get current model name
   */
  getModelName(): string {
    return this.modelName;
  }

  /**
   * Utility: sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

let engineInstance: GeminiSynthesisEngine | null = null;

export function getGeminiEngine(): GeminiSynthesisEngine {
  if (!engineInstance) {
    engineInstance = new GeminiSynthesisEngine();
  }
  return engineInstance;
}

// ============================================
// CLI TEST FUNCTION
// ============================================

async function runTests() {
  console.log("\n🔮 GEMINI SYNTHESIS ENGINE - TEST SUITE");
  console.log("=".repeat(50));

  try {
    const engine = new GeminiSynthesisEngine();

    // Initialize and find best model
    console.log("\n📋 Step 0: Finding Best Available Model");
    console.log("-".repeat(40));
    
    const models = await engine.listAvailableModels();
    console.log(`Found ${models.length} available models`);
    
    // Show lite models first (better for rate limits)
    const liteModels = models.filter(m => m.includes("lite"));
    if (liteModels.length > 0) {
      console.log("Lite models (higher rate limits):");
      liteModels.forEach(m => console.log(`   - ${m}`));
    }
    
    await engine.initialize();
    console.log(`\n✓ Selected model: ${engine.getModelName()}`);

    // Test 1: Simple Generation
    console.log("\n📝 Test 1: Simple Generation");
    console.log("-".repeat(40));

    const simpleResponse = await engine.generate(
      "What is git blame? Answer in one sentence."
    );
    console.log("Response:", simpleResponse);

    // Test 2: Code Analysis
    console.log("\n📝 Test 2: Code Analysis");
    console.log("-".repeat(40));

    // Add delay between tests
    console.log("   (waiting 2s to avoid rate limits...)");
    await new Promise(r => setTimeout(r, 2000));

    const analysis = await engine.analyzeCodeContext(
      {
        filePath: "src/auth/session.ts",
        language: "typescript",
        code: `
export function validateSession(token: string): boolean {
  if (!token || token.length < 32) return false;
  const decoded = jwt.decode(token);
  return decoded && decoded.exp > Date.now() / 1000;
}`,
      },
      [
        {
          hash: "abc1234",
          message: "fix: add token validation",
          author: "dev",
          date: "2024-01-15",
        },
      ]
    );

    console.log("Analysis Result:");
    console.log(JSON.stringify(analysis, null, 2));

    // Test 3: Token Counting
    console.log("\n📝 Test 3: Token Counting");
    console.log("-".repeat(40));

    const testText = "This is a test.";
    const tokenCount = await engine.countTokens(testText);
    console.log(`Text: "${testText}"`);
    console.log(`Token count: ${tokenCount}`);

    console.log("\n" + "=".repeat(50));
    console.log("✅ ALL TESTS PASSED!");
    console.log(`   Model used: ${engine.getModelName()}`);
    console.log("=".repeat(50));
    
  } catch (error: any) {
    if (error.status === 429) {
      console.log("\n" + "=".repeat(50));
      console.log("⚠️  RATE LIMITED - But API is working!");
      console.log("=".repeat(50));
      console.log("\nYour API is configured correctly.");
      console.log("Free tier limits:");
      console.log("  - 15 requests per minute");
      console.log("  - 1,500 requests per day");
      console.log("  - 1 million tokens per minute");
      console.log("\nSolutions:");
      console.log("  1. Wait 1 minute and try again");
      console.log("  2. Use 'gemini-2.0-flash-lite' (higher limits)");
      console.log("  3. Upgrade to paid tier at https://aistudio.google.com/");
      console.log("\nTry again in 60 seconds:");
      console.log("  pnpm run test:gemini");
    } else {
      console.error("\n❌ TEST FAILED:", error);
      process.exit(1);
    }
  }
}

// Run tests if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runTests();
}
