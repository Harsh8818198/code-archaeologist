/**
 * The Excavator Agent - Enhanced Version
 * 
 * Role in Infinity Stones: Cline (The Excavator)
 * 
 * Features:
 * - Deep git history analysis
 * - Code complexity metrics
 * - Dependency mapping
 * - Author contribution tracking
 * - Interactive mode
 */

import { simpleGit, SimpleGit } from "simple-git";
import {
  GeminiSynthesisEngine,
  CodeContext,
  CommitInfo,
  ArchaeologicalAnalysis,
  KnowledgeGraph,
} from "../lib/gemini-client.js";
import {
  getLanguage,
  isSourceFile,
  shouldIgnorePath,
  readFileSafe,
  extractDefinitions,
  extractImports,
  calculateComplexity,
  estimateMaintainability,
  formatDuration,
  progressBar,
} from "../lib/utils.js";
import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

config();

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface FileMetrics {
  lines: number;
  complexity: number;
  maintainability: number;
  definitions: string[];
  imports: string[];
}

export interface AuthorStats {
  name: string;
  email?: string;
  commits: number;
  filesChanged: number;
  additions: number;
  deletions: number;
  firstCommit: string;
  lastCommit: string;
}

export interface FileAnalysis {
  path: string;
  language: string;
  metrics: FileMetrics;
  commits: CommitInfo[];
  authors: string[];
  analysis: ArchaeologicalAnalysis | null;
  lastModified: string;
  createdAt: string;
}

export interface RepositoryStats {
  totalFiles: number;
  analyzedFiles: number;
  totalCommits: number;
  totalAuthors: number;
  languages: Record<string, number>;
  topAuthors: AuthorStats[];
  dateRange: {
    first: string;
    last: string;
  };
}

export interface ExcavationReport {
  repository: string;
  excavationDate: string;
  durationSeconds: number;
  modelUsed: string;
  stats: RepositoryStats;
  files: FileAnalysis[];
  knowledgeGraph: KnowledgeGraph;
  insights: {
    businessDomains: string[];
    technicalDebt: string[];
    riskAreas: string[];
    keyDecisions: string[];
    hotspots: string[]; // Files with most changes
  };
}

export interface ExcavationOptions {
  maxFiles?: number;
  maxCommitsPerFile?: number;
  interactive?: boolean;
  verbose?: boolean;
  skipAnalysis?: boolean; // For testing without API calls
}

// ============================================
// EXCAVATOR AGENT CLASS
// ============================================

export class ExcavatorAgent {
  private git: SimpleGit;
  private gemini: GeminiSynthesisEngine;
  private repoPath: string;
  private options: Required<ExcavationOptions>;
  private isInteractive: boolean = false;
  private rl?: readline.Interface;

  constructor(repoPath: string, options: ExcavationOptions = {}) {
    this.repoPath = path.resolve(repoPath);
    this.git = simpleGit(this.repoPath);
    this.gemini = new GeminiSynthesisEngine();
    this.options = {
      maxFiles: options.maxFiles ?? 10,
      maxCommitsPerFile: options.maxCommitsPerFile ?? 5,
      interactive: options.interactive ?? false,
      verbose: options.verbose ?? false,
      skipAnalysis: options.skipAnalysis ?? false,
    };
  }

  // ============================================
  // MAIN EXCAVATION METHOD
  // ============================================

  async excavate(): Promise<ExcavationReport> {
    const startTime = Date.now();

    this.printHeader();

    // Initialize Gemini (unless skipping)
    if (!this.options.skipAnalysis) {
      console.log("\n🤖 Initializing Gemini AI...");
      try {
        await this.gemini.initialize();
        console.log(`   Model: ${this.gemini.getModelName()}`);
      } catch (error: any) {
        console.log(`   ⚠️ Gemini initialization failed: ${error.message}`);
        console.log("   Continuing without AI analysis...");
        this.options.skipAnalysis = true;
      }
    }

    // Phase 1: Repository Statistics
    console.log("\n📊 Phase 1: Gathering repository statistics...");
    const stats = await this.gatherRepositoryStats();
    this.printStats(stats);

    // Phase 2: Discover and analyze files
    console.log("\n🔍 Phase 2: Discovering source files...");
    const allFiles = await this.discoverFiles();
    console.log(`   Found ${allFiles.length} source files`);

    // Interactive file selection
    let filesToAnalyze = allFiles.slice(0, this.options.maxFiles);
    if (this.options.interactive) {
      filesToAnalyze = await this.interactiveFileSelection(allFiles);
    }

    // Phase 3: Deep analysis
    console.log(`\n🔬 Phase 3: Analyzing ${filesToAnalyze.length} files...`);
    const analyzedFiles = await this.analyzeFiles(filesToAnalyze);

    // Phase 4: Build knowledge graph
    console.log("\n🕸️  Phase 4: Building knowledge graph...");
    const knowledgeGraph = await this.buildKnowledgeGraph(analyzedFiles, stats);

    // Phase 5: Generate insights
    console.log("\n💡 Phase 5: Generating insights...");
    const insights = await this.generateInsights(analyzedFiles, stats);

    const duration = (Date.now() - startTime) / 1000;

    const report: ExcavationReport = {
      repository: this.repoPath,
      excavationDate: new Date().toISOString(),
      durationSeconds: duration,
      modelUsed: this.options.skipAnalysis ? "none" : this.gemini.getModelName(),
      stats,
      files: analyzedFiles,
      knowledgeGraph,
      insights,
    };

    // Save report
    await this.saveReport(report);

    // Print summary
    this.printSummary(report);

    return report;
  }

  // ============================================
  // REPOSITORY STATISTICS
  // ============================================

  private async gatherRepositoryStats(): Promise<RepositoryStats> {
    // Get all commits
    const log = await this.git.log({ maxCount: 500 });
    const commits = log.all;

    // Get all files
    const filesOutput = await this.git.raw(["ls-files"]);
    const allFiles = filesOutput.split("\n").filter(Boolean);
    const sourceFiles = allFiles.filter(
      (f) => isSourceFile(f) && !shouldIgnorePath(f)
    );

    // Count languages
    const languages: Record<string, number> = {};
    for (const file of sourceFiles) {
      const lang = getLanguage(file);
      languages[lang] = (languages[lang] || 0) + 1;
    }

    // Gather author statistics
    const authorMap = new Map<string, AuthorStats>();
    for (const commit of commits) {
      const name = commit.author_name;
      if (!authorMap.has(name)) {
        authorMap.set(name, {
          name,
          email: commit.author_email,
          commits: 0,
          filesChanged: 0,
          additions: 0,
          deletions: 0,
          firstCommit: commit.date,
          lastCommit: commit.date,
        });
      }
      const stats = authorMap.get(name)!;
      stats.commits++;
      if (new Date(commit.date) < new Date(stats.firstCommit)) {
        stats.firstCommit = commit.date;
      }
      if (new Date(commit.date) > new Date(stats.lastCommit)) {
        stats.lastCommit = commit.date;
      }
    }

    // Sort authors by commits
    const topAuthors = Array.from(authorMap.values())
      .sort((a, b) => b.commits - a.commits)
      .slice(0, 10);

    return {
      totalFiles: sourceFiles.length,
      analyzedFiles: 0, // Will be updated
      totalCommits: commits.length,
      totalAuthors: authorMap.size,
      languages,
      topAuthors,
      dateRange: {
        first: commits[commits.length - 1]?.date || "unknown",
        last: commits[0]?.date || "unknown",
      },
    };
  }

  // ============================================
  // FILE DISCOVERY
  // ============================================

  private async discoverFiles(): Promise<string[]> {
    try {
      const output = await this.git.raw(["ls-files"]);
      const allFiles = output.split("\n").filter(Boolean);

      return allFiles.filter(
        (file) => isSourceFile(file) && !shouldIgnorePath(file)
      );
    } catch (error) {
      console.error("Error discovering files:", error);
      return [];
    }
  }

  // ============================================
  // FILE ANALYSIS
  // ============================================

  private async analyzeFiles(filePaths: string[]): Promise<FileAnalysis[]> {
    const results: FileAnalysis[] = [];
    const total = filePaths.length;

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];

      // Progress display
      if (this.options.verbose) {
        console.log(`\n   ${progressBar(i + 1, total)}`);
        console.log(`   📄 ${filePath}`);
      } else {
        process.stdout.write(`\r   ${progressBar(i + 1, total)}`);
      }

      try {
        const analysis = await this.analyzeFile(filePath);
        if (analysis) {
          results.push(analysis);
        }
      } catch (error) {
        if (this.options.verbose) {
          console.log(`   ⚠️ Error analyzing: ${filePath}`);
        }
      }

      // Rate limiting for API
      if (!this.options.skipAnalysis && i < filePaths.length - 1) {
        await this.sleep(1500);
      }
    }

    console.log(""); // New line after progress bar
    return results;
  }

  private async analyzeFile(filePath: string): Promise<FileAnalysis | null> {
    const fullPath = path.join(this.repoPath, filePath);
    const content = readFileSafe(fullPath);

    if (!content) return null;

    const language = getLanguage(filePath);

    // Calculate metrics
    const metrics: FileMetrics = {
      lines: content.split("\n").length,
      complexity: calculateComplexity(content),
      maintainability: estimateMaintainability(content),
      definitions: extractDefinitions(content, language),
      imports: extractImports(content, language),
    };

    // Get commit history
    const commits = await this.getFileCommits(filePath);
    const authors = [...new Set(commits.map((c) => c.author))];

    // AI Analysis (if enabled)
    let analysis: ArchaeologicalAnalysis | null = null;
    if (!this.options.skipAnalysis && commits.length > 0) {
      try {
        analysis = await this.gemini.analyzeCodeContext(
          {
            filePath,
            code: content.slice(0, 4000), // Limit code size
            language,
          },
          commits.slice(0, this.options.maxCommitsPerFile)
        );

        if (this.options.verbose && analysis) {
          console.log(`   ✓ Analysis: ${analysis.summary.slice(0, 60)}...`);
        }
      } catch (error: any) {
        if (this.options.verbose) {
          console.log(`   ⚠️ Analysis failed: ${error.message?.slice(0, 50)}`);
        }
      }
    }

    return {
      path: filePath,
      language,
      metrics,
      commits,
      authors,
      analysis,
      lastModified: commits[0]?.date || "unknown",
      createdAt: commits[commits.length - 1]?.date || "unknown",
    };
  }

  private async getFileCommits(filePath: string): Promise<CommitInfo[]> {
    try {
      const log = await this.git.log({
        file: filePath,
        maxCount: this.options.maxCommitsPerFile,
      });

      const commits: CommitInfo[] = [];

      for (const commit of log.all) {
        let diff: string | undefined;
        try {
          diff = await this.git.diff([
            `${commit.hash}^`,
            commit.hash,
            "--",
            filePath,
          ]);
        } catch {
          // First commit or error
        }

        commits.push({
          hash: commit.hash,
          message: commit.message,
          author: commit.author_name,
          date: commit.date,
          diff: diff?.slice(0, 1500),
        });
      }

      return commits;
    } catch {
      return [];
    }
  }

  // ============================================
  // KNOWLEDGE GRAPH
  // ============================================

  private async buildKnowledgeGraph(
    files: FileAnalysis[],
    stats: RepositoryStats
  ): Promise<KnowledgeGraph> {
    const nodes: KnowledgeGraph["nodes"] = [];
    const edges: KnowledgeGraph["edges"] = [];
    const clusters: KnowledgeGraph["clusters"] = [];

    // Create file nodes
    for (const file of files) {
      nodes.push({
        id: `file:${file.path}`,
        type: "file",
        label: path.basename(file.path),
        metadata: {
          path: file.path,
          language: file.language,
          lines: file.metrics.lines,
          complexity: file.metrics.complexity,
          maintainability: file.metrics.maintainability,
        },
      });

      // Create function/class nodes
      for (const def of file.metrics.definitions.slice(0, 5)) {
        const [type, name] = def.split(":");
        nodes.push({
          id: `${type}:${file.path}:${name}`,
          type: type as "function",
          label: name,
          metadata: { file: file.path },
        });

        // Connect to file
        edges.push({
          source: `file:${file.path}`,
          target: `${type}:${file.path}:${name}`,
          relationship: "defines",
          weight: 1,
        });
      }
    }

    // Create author nodes
    for (const author of stats.topAuthors.slice(0, 5)) {
      nodes.push({
        id: `author:${author.name}`,
        type: "author",
        label: author.name,
        metadata: {
          commits: author.commits,
          firstCommit: author.firstCommit,
          lastCommit: author.lastCommit,
        },
      });

      // Connect authors to files
      for (const file of files) {
        if (file.authors.includes(author.name)) {
          edges.push({
            source: `author:${author.name}`,
            target: `file:${file.path}`,
            relationship: "authored",
            weight: file.commits.filter((c) => c.author === author.name).length,
          });
        }
      }
    }

    // Create import edges
    for (const file of files) {
      for (const imp of file.metrics.imports) {
        // Find if import matches any of our files
        const matchingFile = files.find(
          (f) =>
            f.path.includes(imp.replace(/^\.\//, "")) ||
            f.path.includes(imp.replace(/^\.\.\//, ""))
        );
        if (matchingFile) {
          edges.push({
            source: `file:${file.path}`,
            target: `file:${matchingFile.path}`,
            relationship: "imports",
            weight: 0.8,
          });
        }
      }
    }

    // Create clusters by directory
    const directoryMap = new Map<string, string[]>();
    for (const file of files) {
      const dir = path.dirname(file.path);
      if (!directoryMap.has(dir)) {
        directoryMap.set(dir, []);
      }
      directoryMap.get(dir)!.push(`file:${file.path}`);
    }

    for (const [dir, fileIds] of directoryMap) {
      if (fileIds.length > 1) {
        clusters.push({
          name: dir || "root",
          nodeIds: fileIds,
        });
      }
    }

    return { nodes, edges, clusters };
  }

  // ============================================
  // INSIGHTS GENERATION
  // ============================================

  private async generateInsights(
    files: FileAnalysis[],
    stats: RepositoryStats
  ): Promise<ExcavationReport["insights"]> {
    const businessDomains = new Set<string>();
    const technicalDebt = new Set<string>();
    const riskAreas = new Set<string>();
    const keyDecisions: string[] = [];

    // Extract from AI analyses
    for (const file of files) {
      if (!file.analysis) continue;

      // Domain extraction
      const context = (file.analysis.businessContext || "").toLowerCase();
      if (context.includes("auth")) businessDomains.add("authentication");
      if (context.includes("payment")) businessDomains.add("payments");
      if (context.includes("user")) businessDomains.add("user-management");
      if (context.includes("api")) businessDomains.add("api");
      if (context.includes("database") || context.includes("data"))
        businessDomains.add("data-layer");

      // Risks and debt
      for (const risk of file.analysis.risks || []) {
        if (risk && risk.length > 10) {
          riskAreas.add(risk);
        }
      }

      for (const rec of file.analysis.recommendations || []) {
        const lower = rec.toLowerCase();
        if (
          lower.includes("refactor") ||
          lower.includes("technical debt") ||
          lower.includes("cleanup") ||
          lower.includes("deprecated")
        ) {
          technicalDebt.add(rec);
        }
      }

      // Key decisions
      if (file.analysis.technicalRationale && file.analysis.confidenceScore > 0.7) {
        keyDecisions.push(
          `${path.basename(file.path)}: ${file.analysis.technicalRationale.slice(0, 100)}`
        );
      }
    }

    // Find hotspots (most frequently changed files)
    const hotspots = files
      .sort((a, b) => b.commits.length - a.commits.length)
      .slice(0, 5)
      .map((f) => `${f.path} (${f.commits.length} commits)`);

    // Find complexity hotspots
    const complexFiles = files
      .filter((f) => f.metrics.complexity > 20)
      .sort((a, b) => b.metrics.complexity - a.metrics.complexity)
      .slice(0, 3);

    for (const file of complexFiles) {
      technicalDebt.add(
        `High complexity in ${file.path} (complexity: ${file.metrics.complexity})`
      );
    }

    // Find low maintainability files
    const lowMaintainability = files
      .filter((f) => f.metrics.maintainability < 50)
      .slice(0, 3);

    for (const file of lowMaintainability) {
      riskAreas.add(
        `Low maintainability in ${file.path} (score: ${file.metrics.maintainability})`
      );
    }

    return {
      businessDomains: Array.from(businessDomains),
      technicalDebt: Array.from(technicalDebt).slice(0, 10),
      riskAreas: Array.from(riskAreas).slice(0, 10),
      keyDecisions: keyDecisions.slice(0, 5),
      hotspots,
    };
  }

  // ============================================
  // INTERACTIVE MODE
  // ============================================

  private async interactiveFileSelection(files: string[]): Promise<string[]> {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log("\n📋 Interactive File Selection");
    console.log("─".repeat(40));
    console.log("Commands:");
    console.log("  a          - Analyze all files (up to limit)");
    console.log("  s <pattern> - Select files matching pattern");
    console.log("  l          - List available files");
    console.log("  d          - Done selecting");
    console.log("");

    const selected: string[] = [];

    const ask = (question: string): Promise<string> => {
      return new Promise((resolve) => {
        this.rl!.question(question, resolve);
      });
    };

    while (true) {
      const input = await ask("Selection> ");
      const [cmd, ...args] = input.trim().split(" ");

      switch (cmd.toLowerCase()) {
        case "a":
          return files.slice(0, this.options.maxFiles);

        case "l":
          console.log("\nAvailable files:");
          files.slice(0, 30).forEach((f, i) => {
            const marker = selected.includes(f) ? "✓" : " ";
            console.log(`  ${marker} ${i + 1}. ${f}`);
          });
          if (files.length > 30) {
            console.log(`  ... and ${files.length - 30} more`);
          }
          console.log("");
          break;

        case "s":
          const pattern = args.join(" ");
          if (!pattern) {
            console.log("Usage: s <pattern>");
            break;
          }
          const matching = files.filter((f) =>
            f.toLowerCase().includes(pattern.toLowerCase())
          );
          if (matching.length === 0) {
            console.log("No files match that pattern");
          } else {
            console.log(`Adding ${matching.length} matching files`);
            for (const f of matching) {
              if (!selected.includes(f)) {
                selected.push(f);
              }
            }
          }
          break;

        case "d":
          this.rl.close();
          if (selected.length === 0) {
            console.log("No files selected, using defaults");
            return files.slice(0, this.options.maxFiles);
          }
          return selected.slice(0, this.options.maxFiles);

        default:
          // Try to parse as number
          const num = parseInt(cmd);
          if (!isNaN(num) && num > 0 && num <= files.length) {
            const file = files[num - 1];
            if (!selected.includes(file)) {
              selected.push(file);
              console.log(`Added: ${file}`);
            }
          } else {
            console.log("Unknown command. Use 'a', 'l', 's <pattern>', or 'd'");
          }
      }
    }
  }

  // ============================================
  // OUTPUT & REPORTING
  // ============================================

  private printHeader(): void {
    console.log("\n");
    console.log("🏛️  ═══════════════════════════════════════════════════════");
    console.log("    THE TEMPORAL CODE ARCHAEOLOGIST");
    console.log("    Uncovering the 'why' behind your code");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`📂 Repository: ${this.repoPath}`);
    console.log(`⏰ Started: ${new Date().toISOString()}`);
  }

  private printStats(stats: RepositoryStats): void {
    console.log(`\n   📈 Repository Statistics:`);
    console.log(`      Files: ${stats.totalFiles} | Commits: ${stats.totalCommits} | Authors: ${stats.totalAuthors}`);

    const topLangs = Object.entries(stats.languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([lang, count]) => `${lang}(${count})`)
      .join(", ");
    console.log(`      Languages: ${topLangs}`);

    if (stats.topAuthors.length > 0) {
      const topAuthor = stats.topAuthors[0];
      console.log(`      Top contributor: ${topAuthor.name} (${topAuthor.commits} commits)`);
    }
  }

  private printSummary(report: ExcavationReport): void {
    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("✅ EXCAVATION COMPLETE");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`⏱️  Duration: ${formatDuration(report.durationSeconds)}`);
    console.log(`📊 Files analyzed: ${report.files.length}`);
    console.log(`🔗 Knowledge graph: ${report.knowledgeGraph.nodes.length} nodes, ${report.knowledgeGraph.edges.length} edges`);
    console.log(`🤖 Model: ${report.modelUsed}`);

    if (report.insights.businessDomains.length > 0) {
      console.log(`\n📋 Business Domains: ${report.insights.businessDomains.join(", ")}`);
    }

    if (report.insights.hotspots.length > 0) {
      console.log("\n🔥 Hotspots (most changed files):");
      report.insights.hotspots.slice(0, 3).forEach((h) => console.log(`   - ${h}`));
    }

    if (report.insights.riskAreas.length > 0) {
      console.log("\n⚠️  Risk Areas:");
      report.insights.riskAreas.slice(0, 3).forEach((r) => console.log(`   - ${r.slice(0, 80)}`));
    }

    console.log("\n═══════════════════════════════════════════════════════════\n");
  }

  private async saveReport(report: ExcavationReport): Promise<void> {
    const reportPath = path.join(this.repoPath, "archaeological-report.json");

    // Create a cleaner version for saving
    const saveReport = {
      ...report,
      files: report.files.map((f) => ({
        path: f.path,
        language: f.language,
        metrics: f.metrics,
        authors: f.authors,
        commitCount: f.commits.length,
        lastModified: f.lastModified,
        analysis: f.analysis,
      })),
    };

    fs.writeFileSync(reportPath, JSON.stringify(saveReport, null, 2));
    console.log(`📄 Report saved: ${reportPath}`);
  }

  // ============================================
  // UTILITIES
  // ============================================

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================
// CLI ENTRY POINT
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const repoPath = args.find((a) => !a.startsWith("-")) || process.cwd();

  const options: ExcavationOptions = {
    maxFiles: 10,
    maxCommitsPerFile: 5,
    interactive: args.includes("-i") || args.includes("--interactive"),
    verbose: args.includes("-v") || args.includes("--verbose"),
    skipAnalysis: args.includes("--skip-ai"),
  };

  // Parse numeric options
  const maxFilesArg = args.find((a) => a.startsWith("--max-files="));
  if (maxFilesArg) {
    options.maxFiles = parseInt(maxFilesArg.split("=")[1]) || 10;
  }

  if (args.includes("-h") || args.includes("--help")) {
    console.log(`
🏛️  Code Archaeologist - Excavator

Usage: pnpm run excavate [path] [options]

Options:
  -i, --interactive   Interactive file selection
  -v, --verbose       Verbose output
  --skip-ai           Skip AI analysis (faster, for testing)
  --max-files=N       Maximum files to analyze (default: 10)

Examples:
  pnpm run excavate .
  pnpm run excavate /path/to/repo -v
  pnpm run excavate . --max-files=5 --skip-ai
    `);
    return;
  }

  const excavator = new ExcavatorAgent(repoPath, options);

  try {
    await excavator.excavate();
  } catch (error) {
    console.error("\n❌ Excavation failed:", error);
    process.exit(1);
  }
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}
