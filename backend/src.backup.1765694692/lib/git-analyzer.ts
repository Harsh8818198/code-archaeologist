/**
 * Git Repository Analyzer
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
  diff?: string;
}

export interface RepositoryInfo {
  name: string;
  path: string;
  branch: string;
  remoteUrl?: string;
  totalCommits: number;
  contributors: string[];
}

export class GitAnalyzer {
  private repoPath: string;
  private isInitialized: boolean = false;

  constructor(repoPath: string = '.') {
    this.repoPath = path.resolve(repoPath);
  }

  /**
   * Execute git command in repo directory
   */
  private async git(command: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`git ${command}`, {
        cwd: this.repoPath,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });
      return stdout.trim();
    } catch (error: any) {
      throw new Error(`Git command failed: ${error.message}`);
    }
  }

  /**
   * Initialize and verify git repository
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if it's a git repo
      await this.git('rev-parse --git-dir');
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Not a git repository: ${this.repoPath}`);
    }
  }

  /**
   * Get repository information
   */
  async getRepositoryInfo(): Promise<RepositoryInfo> {
    await this.initialize();

    const [branch, remoteUrl, totalCommits, contributors] = await Promise.all([
      this.git('rev-parse --abbrev-ref HEAD').catch(() => 'unknown'),
      this.git('config --get remote.origin.url').catch(() => undefined),
      this.git('rev-list --count HEAD').catch(() => '0'),
      this.git('log --format="%aN" | sort -u').catch(() => ''),
    ]);

    return {
      name: path.basename(this.repoPath),
      path: this.repoPath,
      branch,
      remoteUrl,
      totalCommits: parseInt(totalCommits, 10),
      contributors: contributors.split('\n').filter(Boolean),
    };
  }

  /**
   * Get commit history
   */
  async getCommitHistory(limit: number = 50): Promise<CommitInfo[]> {
    await this.initialize();

    const format = '%H|||%s|||%aN|||%aI';
    const log = await this.git(`log -${limit} --format="${format}"`);

    if (!log) return [];

    return log.split('\n').filter(Boolean).map(line => {
      const [hash, message, author, date] = line.split('|||');
      return { hash, message, author, date };
    });
  }

  /**
   * Get file history
   */
  async getFileHistory(filePath: string, limit: number = 20): Promise<CommitInfo[]> {
    await this.initialize();

    const format = '%H|||%s|||%aN|||%aI';
    const log = await this.git(`log -${limit} --format="${format}" -- "${filePath}"`);

    if (!log) return [];

    return log.split('\n').filter(Boolean).map(line => {
      const [hash, message, author, date] = line.split('|||');
      return { hash, message, author, date };
    });
  }

  /**
   * Get list of tracked files
   */
  async getTrackedFiles(): Promise<string[]> {
    await this.initialize();

    const files = await this.git('ls-files');
    return files.split('\n').filter(Boolean);
  }

  /**
   * Get diff for a commit
   */
  async getCommitDiff(hash: string): Promise<string> {
    await this.initialize();
    return this.git(`show ${hash} --stat`);
  }

  /**
   * Get blame for a file
   */
  async getBlame(filePath: string): Promise<Array<{ line: number; hash: string; author: string; content: string }>> {
    await this.initialize();

    const blame = await this.git(`blame -l --line-porcelain "${filePath}"`);
    const lines: Array<{ line: number; hash: string; author: string; content: string }> = [];
    
    let currentHash = '';
    let currentAuthor = '';
    let lineNum = 0;

    for (const line of blame.split('\n')) {
      if (line.match(/^[0-9a-f]{40}/)) {
        currentHash = line.slice(0, 40);
        lineNum++;
      } else if (line.startsWith('author ')) {
        currentAuthor = line.slice(7);
      } else if (line.startsWith('\t')) {
        lines.push({
          line: lineNum,
          hash: currentHash,
          author: currentAuthor,
          content: line.slice(1),
        });
      }
    }

    return lines;
  }

  /**
   * Get files changed in a commit
   */
  async getCommitFiles(hash: string): Promise<string[]> {
    await this.initialize();
    const files = await this.git(`diff-tree --no-commit-id --name-only -r ${hash}`);
    return files.split('\n').filter(Boolean);
  }

  /**
   * Search commits by message
   */
  async searchCommits(query: string, limit: number = 20): Promise<CommitInfo[]> {
    await this.initialize();

    const format = '%H|||%s|||%aN|||%aI';
    const log = await this.git(`log -${limit} --format="${format}" --grep="${query}"`);

    if (!log) return [];

    return log.split('\n').filter(Boolean).map(line => {
      const [hash, message, author, date] = line.split('|||');
      return { hash, message, author, date };
    });
  }
}

// CLI test
async function main() {
  console.log('🔍 Testing Git Analyzer\n');

  const analyzer = new GitAnalyzer('.');

  try {
    await analyzer.initialize();
    console.log('✅ Repository initialized');

    const info = await analyzer.getRepositoryInfo();
    console.log('\n📊 Repository Info:');
    console.log(`   Name: ${info.name}`);
    console.log(`   Branch: ${info.branch}`);
    console.log(`   Commits: ${info.totalCommits}`);
    console.log(`   Contributors: ${info.contributors.length}`);

    const commits = await analyzer.getCommitHistory(5);
    console.log('\n📝 Recent Commits:');
    commits.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.message.slice(0, 50)} (${c.author})`);
    });

    const files = await analyzer.getTrackedFiles();
    console.log(`\n📁 Tracked Files: ${files.length}`);

    console.log('\n✅ All tests passed!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
