/**
 * ✅ STABLE GEMINI CLIENT — NO HARDCODED MODELS, NO 404s, NO BS
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

// ============================
// ENV VALIDATION
// ============================

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";

if (!API_KEY) {
  throw new Error(
    "❌ GEMINI_API_KEY or GOOGLE_AI_API_KEY is missing.\n" +
    "Fix it with:\n" +
    "export GEMINI_API_KEY=\"your-key\""
  );
}

// ============================
// TYPES
// ============================

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

export interface KnowledgeGraph {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    metadata?: any;
  }>;
  edges: Array<{
    source: string;
    target: string;
    label: string;
    relationship?: string;
    weight?: number;
  }>;
  clusters: Array<{
    id: string;
    nodes?: string[];
    nodeIds?: string[];
    label: string;
    name?: string;
  }>;
  entities: Array<{
    name: string;
    type: string;
    importance: number;
  }>;
  relationships: Array<{
    from: string;
    to: string;
    type: string;
  }>;
}

// ============================
// CLIENT
// ============================

export class GeminiSynthesisEngine {
  private client = new GoogleGenerativeAI(API_KEY);
  private modelName: string | null = null;
  private maxRetries = 3;

  // ✅ Methods for API Server
  getModelName(): string {
    return this.modelName || "none";
  }

  isInitialized(): boolean {
    return this.modelName !== null;
  }

  async chat(message: string, context?: string, history?: any[]): Promise<string> {
    const fullPrompt = context ? `${context}\n\n${message}` : message;
    return this.generate(fullPrompt);
  }

  // ----------------------------
  // ✅ MODEL DISCOVERY (NO 404s)
  // ----------------------------
  async initialize(): Promise<void> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`
    );
    const data = await res.json() as any;

    const validModels = (data.models || [])
      .filter((m: any) =>
        m.supportedGenerationMethods?.includes("generateContent")
      )
      .map((m: any) => m.name.replace("models/", ""));

    if (validModels.length === 0) {
      throw new Error("❌ No generateContent-compatible Gemini models available.");
    }

    // ✅ Prefer flash, fallback to anything else
    this.modelName =
      validModels.find((m: string) => m.includes("flash")) ||
      validModels[0];

    console.log(`✅ Using model: ${this.modelName}`);
  }

  private getModel() {
    if (!this.modelName) {
      throw new Error("Model not initialized.");
    }

    return this.client.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    });
  }

  // ----------------------------
  // ✅ SAFE GENERATION
  // ----------------------------
  async generate(prompt: string): Promise<string> {
    if (!this.modelName) {
      await this.initialize();
    }

    let attempt = 0;
    let lastError: any;

    while (attempt < this.maxRetries) {
      try {
        const model = this.getModel();
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (err: any) {
        lastError = err;
        attempt++;
        console.warn(`⚠️ Gemini error, retry ${attempt}/${this.maxRetries}`);
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }

    throw lastError;
  }

  // ----------------------------
  // ✅ JSON PARSER
  // ----------------------------
  private parseJson(text: string): any {
    const cleaned = text
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/, "")
      .trim();

    const match = cleaned.match(/[\[{][\s\S]*[\]}]/);
    return JSON.parse(match ? match[0] : cleaned);
  }

  // ----------------------------
  // ✅ CODE ANALYSIS
  // ----------------------------
  async analyzeCodeContext(
    code: CodeContext,
    commits: CommitInfo[]
  ): Promise<ArchaeologicalAnalysis> {
    const commitText = commits
      .map(
        (c) =>
          `${c.hash.slice(0, 7)} | ${c.date} | ${c.author} | ${c.message}`
      )
      .join("\n");

    const prompt = `
Analyze this file and return ONLY JSON:

FILE: ${code.filePath}
LANG: ${code.language}

CODE:
${code.code}

COMMITS:
${commitText}

Return:
{
  "summary": "",
  "businessContext": "",
  "technicalRationale": "",
  "dependencies": [],
  "risks": [],
  "recommendations": [],
  "confidenceScore": 0.0
}
`;

    const raw = await this.generate(prompt);
    return this.parseJson(raw);
  }
}

// ============================
// ✅ SINGLETON
// ============================

let instance: GeminiSynthesisEngine | null = null;

export function getGeminiEngine() {
  if (!instance) instance = new GeminiSynthesisEngine();
  return instance;
}

// ============================
// ✅ CLI TEST
// ============================

async function runTests() {
  console.log("\n🔮 Testing Gemini Synthesis Engine (stable client)\n");

  const engine = new GeminiSynthesisEngine();
  await engine.initialize();

  const res = await engine.generate(
    "What is git blame? One sentence."
  );
  console.log("✅ Generation Test:", res);

  const analysis = await engine.analyzeCodeContext(
    {
      filePath: "test.ts",
      language: "ts",
      code: `export const x = 5;`,
    },
    [
      {
        hash: "abc123",
        message: "init",
        author: "dev",
        date: "2024-01-01",
      },
    ]
  );

  console.log("✅ Analysis Test:", analysis);
}

if (require.main === module) {
  runTests().catch((e) => {
    console.error("❌ Test failed:", e.message);
    process.exit(1);
  });
}
