/**
 * Utility functions for Code Archaeologist
 */

import * as fs from "fs";
import * as path from "path";

// ============================================
// FILE UTILITIES
// ============================================

/**
 * Get file extension without dot
 */
export function getExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase().slice(1);
}

/**
 * Get language from file path
 */
export function getLanguage(filePath: string): string {
  const ext = getExtension(filePath);
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    py: "python",
    java: "java",
    go: "go",
    rs: "rust",
    rb: "ruby",
    php: "php",
    c: "c",
    cpp: "cpp",
    cc: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    vue: "vue",
    svelte: "svelte",
  };
  return languageMap[ext] || "unknown";
}

/**
 * Check if file is a source file
 */
export function isSourceFile(filePath: string): boolean {
  const sourceExtensions = [
    "ts", "tsx", "js", "jsx", "mjs", "cjs",
    "py", "java", "go", "rs", "rb", "php",
    "c", "cpp", "cc", "h", "hpp", "cs",
    "swift", "kt", "scala", "vue", "svelte",
  ];
  return sourceExtensions.includes(getExtension(filePath));
}

/**
 * Check if path should be ignored
 */
export function shouldIgnorePath(filePath: string): boolean {
  const ignorePaths = [
    "node_modules",
    "vendor",
    "dist",
    "build",
    ".git",
    "__pycache__",
    ".venv",
    "venv",
    ".next",
    "coverage",
    ".nyc_output",
    "target",
    "bin",
    "obj",
  ];
  return ignorePaths.some((p) => filePath.includes(p));
}

/**
 * Read file safely
 */
export function readFileSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Check if file exists
 */
export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

// ============================================
// STRING UTILITIES
// ============================================

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Extract function/class names from code
 */
export function extractDefinitions(code: string, language: string): string[] {
  const definitions: string[] = [];
  
  // TypeScript/JavaScript patterns
  if (["typescript", "javascript"].includes(language)) {
    // Functions
    const funcMatches = code.matchAll(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/g);
    for (const match of funcMatches) {
      definitions.push(`function:${match[1]}`);
    }
    
    // Arrow functions assigned to const
    const arrowMatches = code.matchAll(/(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(/g);
    for (const match of arrowMatches) {
      definitions.push(`function:${match[1]}`);
    }
    
    // Classes
    const classMatches = code.matchAll(/(?:export\s+)?class\s+(\w+)/g);
    for (const match of classMatches) {
      definitions.push(`class:${match[1]}`);
    }
    
    // Interfaces (TypeScript)
    const interfaceMatches = code.matchAll(/(?:export\s+)?interface\s+(\w+)/g);
    for (const match of interfaceMatches) {
      definitions.push(`interface:${match[1]}`);
    }
    
    // Types (TypeScript)
    const typeMatches = code.matchAll(/(?:export\s+)?type\s+(\w+)/g);
    for (const match of typeMatches) {
      definitions.push(`type:${match[1]}`);
    }
  }
  
  // Python patterns
  if (language === "python") {
    const funcMatches = code.matchAll(/def\s+(\w+)\s*\(/g);
    for (const match of funcMatches) {
      definitions.push(`function:${match[1]}`);
    }
    
    const classMatches = code.matchAll(/class\s+(\w+)/g);
    for (const match of classMatches) {
      definitions.push(`class:${match[1]}`);
    }
  }
  
  return definitions;
}

/**
 * Extract imports from code
 */
export function extractImports(code: string, language: string): string[] {
  const imports: string[] = [];
  
  if (["typescript", "javascript"].includes(language)) {
    // ES6 imports
    const es6Matches = code.matchAll(/import\s+.*?\s+from\s+['"](.+?)['"]/g);
    for (const match of es6Matches) {
      imports.push(match[1]);
    }
    
    // require()
    const requireMatches = code.matchAll(/require\s*\(\s*['"](.+?)['"]\s*\)/g);
    for (const match of requireMatches) {
      imports.push(match[1]);
    }
  }
  
  if (language === "python") {
    const importMatches = code.matchAll(/(?:from\s+(\S+)\s+import|import\s+(\S+))/g);
    for (const match of importMatches) {
      imports.push(match[1] || match[2]);
    }
  }
  
  return imports;
}

// ============================================
// TIME UTILITIES
// ============================================

/**
 * Format duration in seconds to human readable
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

// ============================================
// PROGRESS UTILITIES
// ============================================

/**
 * Create a progress bar string
 */
export function progressBar(current: number, total: number, width: number = 30): string {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  return `[${bar}] ${percentage}% (${current}/${total})`;
}

/**
 * Create a spinner frame
 */
const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
let spinnerIndex = 0;

export function getSpinner(): string {
  const frame = spinnerFrames[spinnerIndex];
  spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
  return frame;
}

// ============================================
// ANALYSIS UTILITIES
// ============================================

/**
 * Calculate code complexity (simple heuristic)
 */
export function calculateComplexity(code: string): number {
  let complexity = 1;
  
  // Count control structures
  const patterns = [
    /\bif\b/g,
    /\belse\b/g,
    /\bfor\b/g,
    /\bwhile\b/g,
    /\bswitch\b/g,
    /\bcase\b/g,
    /\bcatch\b/g,
    /\?\s*.*\s*:/g, // ternary
    /&&/g,
    /\|\|/g,
  ];
  
  for (const pattern of patterns) {
    const matches = code.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }
  
  return complexity;
}

/**
 * Estimate code maintainability (1-100)
 */
export function estimateMaintainability(code: string): number {
  const lines = code.split("\n").length;
  const complexity = calculateComplexity(code);
  
  // Factors that reduce maintainability
  let score = 100;
  
  // Long files are harder to maintain
  if (lines > 500) score -= 20;
  else if (lines > 300) score -= 10;
  else if (lines > 100) score -= 5;
  
  // High complexity
  if (complexity > 50) score -= 30;
  else if (complexity > 30) score -= 20;
  else if (complexity > 15) score -= 10;
  
  // Very long lines
  const longLines = code.split("\n").filter((l) => l.length > 120).length;
  if (longLines > 10) score -= 10;
  
  // Lack of comments
  const commentLines = code.split("\n").filter((l) => 
    l.trim().startsWith("//") || l.trim().startsWith("#") || l.trim().startsWith("*")
  ).length;
  const commentRatio = commentLines / lines;
  if (commentRatio < 0.05) score -= 10;
  
  return Math.max(0, Math.min(100, score));
}
