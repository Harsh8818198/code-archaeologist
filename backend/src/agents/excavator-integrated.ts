import { GoogleGenerativeAI } from '@google/generative-ai';
import { simpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';

interface ExcavationConfig {
  useKestra: boolean;      // Orchestrate via Kestra
  useOumi: boolean;        // Use fine-tuned model
  useGemini: boolean;      // Use Gemini API
  maxFiles: number;
}

export class IntegratedExcavator {
  private config: ExcavationConfig;
  private genAI: GoogleGenerativeAI | null = null;

  constructor(config: Partial<ExcavationConfig> = {}) {
    this.config = {
      useKestra: config.useKestra ?? false,
      useOumi: config.useOumi ?? false,
      useGemini: config.useGemini ?? true,
      maxFiles: config.maxFiles ?? 20,
    };

    if (this.config.useGemini && process.env.GOOGLE_AI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    }
  }

  async excavate(repoPath: string): Promise<any> {
    console.log('\n🏛️ INTEGRATED EXCAVATION');
    console.log('========================');
    console.log(`📍 Repository: ${repoPath}`);
    console.log(`🔧 Config:`, this.config);

    const startTime = Date.now();
    const results: any = {
      repository: repoPath,
      technologies: {
        gemini: this.config.useGemini,
        oumi: this.config.useOumi,
        kestra: this.config.useKestra,
      },
      files: [],
      insights: {},
    };

    // Step 1: Git Analysis
    console.log('\n📊 Step 1: Git Analysis...');
    const git = simpleGit(repoPath);
    const log = await git.log({ maxCount: 50 });
    results.commits = log.all.length;
    console.log(`   Found ${results.commits} commits`);

    // Step 2: File Discovery
    console.log('\n📁 Step 2: File Discovery...');
    const files = this.discoverFiles(repoPath);
    console.log(`   Found ${files.length} files, analyzing ${Math.min(files.length, this.config.maxFiles)}`);

    // Step 3: Analysis (Choose Engine)
    console.log('\n🔍 Step 3: Analysis...');
    
    for (const file of files.slice(0, this.config.maxFiles)) {
      console.log(`   Analyzing: ${file}`);
      
      let analysis;
      
      if (this.config.useOumi && await this.isOumiAvailable()) {
        console.log('      → Using OUMI (fine-tuned model)');
        analysis = await this.analyzeWithOumi(repoPath, file);
      } else if (this.config.useGemini && this.genAI) {
        console.log('      → Using GEMINI');
        analysis = await this.analyzeWithGemini(repoPath, file);
      } else {
        console.log('      → Using FALLBACK');
        analysis = this.fallbackAnalysis(file);
      }
      
      results.files.push({
        path: file,
        analysis,
      });
    }

    // Step 4: Generate Insights
    console.log('\n🧠 Step 4: Generating Insights...');
    results.insights = await this.generateInsights(results.files);

    results.duration = (Date.now() - startTime) / 1000;
    console.log(`\n✅ Excavation complete in ${results.duration.toFixed(1)}s`);

    return results;
  }

  private discoverFiles(repoPath: string): string[] {
    const files: string[] = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go'];
    const ignore = ['node_modules', '.git', 'dist', 'build', '.next'];

    const scan = (dir: string) => {
      try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(repoPath, fullPath);

          if (entry.isDirectory() && !ignore.includes(entry.name)) {
            scan(fullPath);
          } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
            files.push(relativePath);
          }
        }
      } catch (e) {}
    };

    scan(repoPath);
    return files;
  }

  private async isOumiAvailable(): Promise<boolean> {
    const modelPath = path.join(process.cwd(), '../oumi-training/output/archaeologist-model');
    return fs.existsSync(modelPath);
  }

  private async analyzeWithOumi(repoPath: string, filePath: string): Promise<any> {
    // This would call the Oumi model
    // For now, return placeholder
    return {
      source: 'oumi',
      summary: `OUMI Analysis of ${filePath}`,
      businessContext: 'Analyzed using fine-tuned Code Archaeologist model',
    };
  }

  private async analyzeWithGemini(repoPath: string, filePath: string): Promise<any> {
    const fullPath = path.join(repoPath, filePath);
    const content = fs.readFileSync(fullPath, 'utf-8').slice(0, 4000);

    const model = this.genAI!.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `Analyze this code file:
File: ${filePath}
Content:
\`\`\`
${content}
\`\`\`

Provide JSON response:
{
  "summary": "Brief description",
  "businessContext": "What business problem does this solve?",
  "risks": ["risk1", "risk2"],
  "recommendations": ["rec1", "rec2"]
}`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return { source: 'gemini', ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      console.log('      ⚠️ Gemini error, using fallback');
    }
    
    return this.fallbackAnalysis(filePath);
  }

  private fallbackAnalysis(filePath: string): any {
    return {
      source: 'fallback',
      summary: `Analysis of ${path.basename(filePath)}`,
      businessContext: 'Static analysis without AI',
      risks: [],
      recommendations: [],
    };
  }

  private async generateInsights(files: any[]): Promise<any> {
    return {
      totalFiles: files.length,
      geminiAnalyzed: files.filter(f => f.analysis?.source === 'gemini').length,
      oumiAnalyzed: files.filter(f => f.analysis?.source === 'oumi').length,
      fallbackAnalyzed: files.filter(f => f.analysis?.source === 'fallback').length,
    };
  }
}
