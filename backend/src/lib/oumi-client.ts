/**
 * Oumi Model Client - Uses trained Llama model for local inference
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
}

export class OumiModelClient {
  private modelPath: string;
  private isAvailable: boolean = false;

  constructor() {
    this.modelPath = path.resolve(__dirname, '../../../oumi-training/output/archaeologist-model');
    this.checkAvailability();
  }

  private checkAvailability() {
    try {
      const adapterPath = path.join(this.modelPath, 'adapter_model.safetensors');
      this.isAvailable = fs.existsSync(adapterPath);
      
      if (this.isAvailable) {
        console.log('✅ Oumi model available:', this.modelPath);
      } else {
        console.log('⚠️  Oumi model not found, using Gemini only');
      }
    } catch (error) {
      this.isAvailable = false;
    }
  }

  async analyzeCode(request: OumiAnalysisRequest): Promise<OumiAnalysisResponse | null> {
    if (!this.isAvailable) {
      return null;
    }

    try {
      console.log('🧠 Oumi analysis requested for:', request.filePath);
      
      // TODO: Implement actual model inference via Python
      // For now, return null to use Gemini as fallback
      // In production, this would call:
      // python3 oumi-training/inference.py --model-path=... --prompt=...
      
      return null;
      
    } catch (error) {
      console.error('Oumi analysis error:', error);
      return null;
    }
  }

  isModelAvailable(): boolean {
    return this.isAvailable;
  }

  getModelPath(): string {
    return this.modelPath;
  }
}

let oumiClient: OumiModelClient | null = null;

export function getOumiClient(): OumiModelClient {
  if (!oumiClient) {
    oumiClient = new OumiModelClient();
  }
  return oumiClient;
}
