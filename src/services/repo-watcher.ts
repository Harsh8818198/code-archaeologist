/**
 * Repository Watcher Service - WITH SLACK INTEGRATION
 */

import { simpleGit, SimpleGit } from 'simple-git';
import { getGeminiEngine } from '../lib/gemini-client.js';
import { SlackQuestioner } from './slack-questioner.js';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

interface WatchedRepo {
  path: string;
  branch: string;
  lastCommitHash: string;
  interval: NodeJS.Timeout;
}

interface NewCommitEvent {
  repoPath: string;
  commitHash: string;
  message: string;
  author: string;
  authorEmail: string;
  date: string;
  filesChanged: string[];
}

export class RepoWatcher extends EventEmitter {
  private watchedRepos: Map<string, WatchedRepo> = new Map();
  private pollInterval: number = 30000;
  private slackQuestioner: SlackQuestioner;

  constructor(pollInterval?: number) {
    super();
    if (pollInterval) this.pollInterval = pollInterval;
    this.slackQuestioner = new SlackQuestioner();
  }

  async watch(repoPath: string, branch: string = 'main'): Promise<void> {
    const absolutePath = path.resolve(repoPath);

    if (this.watchedRepos.has(absolutePath)) {
      console.log(`Already watching: ${absolutePath}`);
      return;
    }

    if (!fs.existsSync(path.join(absolutePath, '.git'))) {
      throw new Error(`Not a git repository: ${absolutePath}`);
    }

    const git = simpleGit(absolutePath);
    const log = await git.log({ maxCount: 1 });
    const lastCommitHash = log.latest?.hash || '';

    console.log(`📡 Started watching: ${absolutePath}`);
    console.log(`   Branch: ${branch}`);
    console.log(`   Current commit: ${lastCommitHash.slice(0, 7)}`);

    const interval = setInterval(() => {
      this.checkForNewCommits(absolutePath).catch((error) => {
        console.error(`Error checking ${absolutePath}:`, error);
      });
    }, this.pollInterval);

    this.watchedRepos.set(absolutePath, {
      path: absolutePath,
      branch,
      lastCommitHash,
      interval,
    });
  }

  stopWatching(repoPath: string): void {
    const absolutePath = path.resolve(repoPath);
    const watched = this.watchedRepos.get(absolutePath);

    if (watched) {
      clearInterval(watched.interval);
      this.watchedRepos.delete(absolutePath);
      console.log(`🛑 Stopped watching: ${absolutePath}`);
    }
  }

  stopAll(): void {
    for (const [path, watched] of this.watchedRepos) {
      clearInterval(watched.interval);
    }
    this.watchedRepos.clear();
    console.log('🛑 Stopped watching all repositories');
  }

  private async checkForNewCommits(repoPath: string): Promise<void> {
    const watched = this.watchedRepos.get(repoPath);
    if (!watched) return;

    const git = simpleGit(repoPath);

    try {
      await git.fetch();
      const log = await git.log({ maxCount: 1 });
      const currentHash = log.latest?.hash || '';

      if (currentHash !== watched.lastCommitHash && watched.lastCommitHash !== '') {
        console.log(`\n🆕 New commits detected in: ${repoPath}`);

        const newCommits = await git.log({
          from: watched.lastCommitHash,
          to: currentHash,
        });

        for (const commit of newCommits.all.reverse()) {
          await this.processNewCommit(repoPath, commit);
        }

        watched.lastCommitHash = currentHash;
      }
    } catch (error) {
      console.error(`Error checking commits in ${repoPath}:`, error);
    }
  }

  private async processNewCommit(repoPath: string, commit: any): Promise<void> {
    console.log(`\n📝 Processing commit: ${commit.hash.slice(0, 7)}`);
    console.log(`   Author: ${commit.author_name} <${commit.author_email}>`);
    console.log(`   Message: ${commit.message}`);

    const git = simpleGit(repoPath);

    let diff: string = '';
    let filesChanged: string[] = [];

    try {
      diff = await git.diff([`${commit.hash}^`, commit.hash]);
      const diffSummary = await git.diffSummary([`${commit.hash}^`, commit.hash]);
      filesChanged = diffSummary.files.map(f => f.file);
      
      console.log(`   Files changed: ${filesChanged.length}`);
    } catch (error) {
      console.log(`   (First commit or error getting diff)`);
    }

    const event: NewCommitEvent = {
      repoPath,
      commitHash: commit.hash,
      message: commit.message,
      author: commit.author_name,
      authorEmail: commit.author_email,
      date: commit.date,
      filesChanged,
    };

    this.emit('new-commit', event);

    // Analyze with Gemini
    await this.analyzeCommit(event, diff);
  }

  private async analyzeCommit(commit: NewCommitEvent, diff: string): Promise<void> {
    try {
      console.log(`   🧠 Analyzing with Gemini...`);

      const geminiEngine = getGeminiEngine();
      await geminiEngine.initialize();

      const prompt = `Analyze this commit and determine if context is clear or unclear.

Commit: ${commit.commitHash.slice(0, 7)}
Author: ${commit.author}
Message: ${commit.message}
Files: ${commit.filesChanged.join(', ')}

Diff:
\`\`\`
${diff.slice(0, 2000)}
\`\`\`

Respond in JSON:
{
  "contextClarity": "clear" or "unclear",
  "analysis": "Brief 2-3 sentence analysis",
  "questionForAuthor": "If unclear, what specific question to ask the author?"
}`;

      const response = await geminiEngine.chat(prompt, '');
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        
        console.log(`   ✅ Analysis: ${analysis.analysis.slice(0, 100)}...`);
        
        // If context is unclear, ask author via Slack
        if (analysis.contextClarity === 'unclear' && analysis.questionForAuthor) {
          console.log(`   ❓ Context unclear - asking author...`);
          
          await this.slackQuestioner.askAuthor(
            commit.commitHash,
            commit.message,
            commit.author,
            commit.authorEmail,
            analysis.questionForAuthor
          );
        }

        this.emit('commit-analyzed', { commit, analysis });
        await this.saveAnalysis(commit, analysis.analysis);
      }

    } catch (error: any) {
      console.log(`   ⚠️  Analysis failed: ${error.message}`);
    }
  }

  private async saveAnalysis(commit: NewCommitEvent, analysis: string): Promise<void> {
    const historyDir = path.join(commit.repoPath, '.code-archaeologist');
    const historyFile = path.join(historyDir, 'commit-history.jsonl');

    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }

    const entry = {
      timestamp: new Date().toISOString(),
      commit: commit.commitHash,
      message: commit.message,
      author: commit.author,
      analysis,
    };

    fs.appendFileSync(historyFile, JSON.stringify(entry) + '\n');
  }

  getWatchedRepos(): string[] {
    return Array.from(this.watchedRepos.keys());
  }
}

async function main() {
  const repoPath = process.argv[2] || process.cwd();

  console.log('🏛️  Code Archaeologist - Continuous Monitoring + Slack\n');

  const watcher = new RepoWatcher(10000);

  watcher.on('new-commit', (event: NewCommitEvent) => {
    console.log(`\n🎉 NEW COMMIT DETECTED!`);
  });

  watcher.on('commit-analyzed', ({ commit, analysis }: any) => {
    console.log(`\n📊 Analysis saved for ${commit.commitHash.slice(0, 7)}`);
  });

  await watcher.watch(repoPath);

  console.log(`\n👁️  Monitoring repository...`);
  console.log(`   Press Ctrl+C to stop\n`);

  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping monitor...');
    watcher.stopAll();
    process.exit(0);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

