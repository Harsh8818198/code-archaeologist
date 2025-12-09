/**
 * Quick Query Tool
 * 
 * Ask questions about code without full excavation
 */

import { GeminiSynthesisEngine } from "../lib/gemini-client.js";
import { readFileSafe, getLanguage } from "../lib/utils.js";
import { simpleGit } from "simple-git";
import * as path from "path";
import * as readline from "readline";
import { config } from "dotenv";

config();

class QueryTool {
  private gemini: GeminiSynthesisEngine;
  private repoPath: string;
  private chatHistory: Array<{ role: "user" | "model"; content: string }> = [];

  constructor(repoPath: string) {
    this.repoPath = path.resolve(repoPath);
    this.gemini = new GeminiSynthesisEngine();
  }

  async initialize(): Promise<void> {
    await this.gemini.initialize();
  }

  async queryFile(filePath: string, question: string): Promise<string> {
    const fullPath = path.join(this.repoPath, filePath);
    const content = readFileSafe(fullPath);

    if (!content) {
      return `Error: Could not read file ${filePath}`;
    }

    const git = simpleGit(this.repoPath);
    let commits: string[] = [];
    try {
      const log = await git.log({ file: filePath, maxCount: 5 });
      commits = log.all.map((c) => `${c.date}: ${c.message} (${c.author_name})`);
    } catch {}

    const context = `
File: ${filePath}
Language: ${getLanguage(filePath)}
Recent commits:
${commits.join("\n")}

Code:
\`\`\`
${content.slice(0, 4000)}
\`\`\`
`;

    return this.gemini.chat(question, context, this.chatHistory);
  }

  async queryRepository(question: string): Promise<string> {
    const git = simpleGit(this.repoPath);

    // Get repo info
    const filesOutput = await git.raw(["ls-files"]);
    const files = filesOutput.split("\n").filter(Boolean).slice(0, 50);

    let commits: string[] = [];
    try {
      const log = await git.log({ maxCount: 20 });
      commits = log.all.map((c) => `${c.date}: ${c.message}`);
    } catch {}

    const context = `
Repository: ${this.repoPath}
Files (first 50):
${files.join("\n")}

Recent commits:
${commits.join("\n")}
`;

    return this.gemini.chat(question, context, this.chatHistory);
  }

  async interactiveMode(): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log("\n🔮 Code Archaeologist - Interactive Query Mode");
    console.log("═".repeat(50));
    console.log("Commands:");
    console.log("  file <path>  - Set current file context");
    console.log("  clear        - Clear chat history");
    console.log("  exit         - Exit");
    console.log("Or just type a question about the code.\n");

    let currentFile: string | null = null;

    const ask = (prompt: string): Promise<string> => {
      return new Promise((resolve) => rl.question(prompt, resolve));
    };

    while (true) {
      const input = await ask(currentFile ? `[${path.basename(currentFile)}]> ` : "> ");
      const trimmed = input.trim();

      if (!trimmed) continue;

      if (trimmed === "exit" || trimmed === "quit") {
        console.log("Goodbye!");
        rl.close();
        break;
      }

      if (trimmed === "clear") {
        this.chatHistory = [];
        console.log("Chat history cleared.\n");
        continue;
      }

      if (trimmed.startsWith("file ")) {
        currentFile = trimmed.slice(5).trim();
        console.log(`Context set to: ${currentFile}\n`);
        continue;
      }

      try {
        console.log("\n🤔 Thinking...\n");
        const response = currentFile
          ? await this.queryFile(currentFile, trimmed)
          : await this.queryRepository(trimmed);

        // Add to history
        this.chatHistory.push({ role: "user", content: trimmed });
        this.chatHistory.push({ role: "model", content: response });

        // Keep history manageable
        if (this.chatHistory.length > 20) {
          this.chatHistory = this.chatHistory.slice(-20);
        }

        console.log(response);
        console.log("");
      } catch (error: any) {
        console.log(`Error: ${error.message}\n`);
      }
    }
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const repoPath = args.find((a) => !a.startsWith("-")) || process.cwd();

  const tool = new QueryTool(repoPath);

  try {
    await tool.initialize();
    await tool.interactiveMode();
  } catch (error: any) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}

export { QueryTool };
