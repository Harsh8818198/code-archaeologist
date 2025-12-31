
/**
 * Slack Questioner Service
 * 
 * Asks original commit authors for context clarification via Slack
 */

import { WebClient } from '@slack/web-api';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config();




// Near the top of the file, add:
const EMAIL_TO_SLACK_USER: Record<string, string> = {
  'bhattharsh328@gmail.com': 'YOUR_SLACK_USER_ID', // Get from Slack
  // Add more mappings as needed
};

// Then in the askAuthor method, use it:
// const slackUserId = EMAIL_TO_SLACK_USER[authorEmail] || authorEmail;
interface ContextQuestion {
  commitHash: string;
  commitMessage: string;
  author: string;
  authorEmail: string;
  question: string;
  askedAt: string;
  response?: string;
  respondedAt?: string;
}

export class SlackQuestioner {
  private slack: WebClient;
  private enabled: boolean;
  private questionsFile: string;

  constructor(questionsFile?: string) {
    const token = process.env.SLACK_BOT_TOKEN;
    this.enabled = !!token;
    
    if (this.enabled) {
      this.slack = new WebClient(token);
      console.log('✅ Slack integration enabled');
    } else {
      console.log('⚠️  Slack integration disabled (no SLACK_BOT_TOKEN)');
    }

    this.questionsFile = questionsFile || '.code-archaeologist/questions.jsonl';
  }

  /**
   * Ask author about unclear commit context
   */
  async askAuthor(
    commitHash: string,
    commitMessage: string,
    author: string,
    authorEmail: string,
    question: string
  ): Promise<boolean> {
    if (!this.enabled) {
      console.log('⚠️  Slack disabled - would have asked:');
      console.log(`   ${author}: ${question}`);
      return false;
    }

    try {
      // Find user by email
      const slackUserId = await this.findUserByEmail(authorEmail);
      
      if (!slackUserId) {
        console.log(`⚠️  Could not find Slack user for ${authorEmail}`);
        return false;
      }

      // Send DM
      const message = this.formatQuestion(commitHash, commitMessage, question);
      
      const result = await this.slack.chat.postMessage({
        channel: slackUserId,
        text: message,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: message,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Respond',
                },
                value: commitHash,
                action_id: 'respond_context',
              },
            ],
          },
        ],
      });

      console.log(`✅ Asked ${author} via Slack`);

      // Save question
      await this.saveQuestion({
        commitHash,
        commitMessage,
        author,
        authorEmail,
        question,
        askedAt: new Date().toISOString(),
      });

      return true;
    } catch (error: any) {
      console.error(`❌ Slack error:`, error.message);
      return false;
    }
  }

  /**
   * Find Slack user by email
   */
  private async findUserByEmail(email: string): Promise<string | null> {
    try {
      const result = await this.slack.users.lookupByEmail({ email });
      return result.user?.id || null;
    } catch {
      return null;
    }
  }

  /**
   * Format question message
   */
  private formatQuestion(
    commitHash: string,
    commitMessage: string,
    question: string
  ): string {
    return `🏛️ *Code Archaeologist Question*

I'm analyzing the codebase history and need your help understanding context.

*Commit:* \`${commitHash.slice(0, 7)}\`
*Message:* ${commitMessage}

*Question:* ${question}

Could you provide some context about why this change was made? This helps future developers understand the reasoning behind the code.`;
  }

  /**
   * Save question to history
   */
  private async saveQuestion(question: ContextQuestion): Promise<void> {
    const dir = path.dirname(this.questionsFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.appendFileSync(
      this.questionsFile,
      JSON.stringify(question) + '\n'
    );
  }

  /**
   * Get all unanswered questions
   */
  async getUnansweredQuestions(): Promise<ContextQuestion[]> {
    if (!fs.existsSync(this.questionsFile)) {
      return [];
    }

    const lines = fs.readFileSync(this.questionsFile, 'utf-8').split('\n');
    const questions: ContextQuestion[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const q = JSON.parse(line);
        if (!q.response) {
          questions.push(q);
        }
      } catch {}
    }

    return questions;
  }
}

// Example usage in CLI
async function main() {
  const questioner = new SlackQuestioner();

  // Test asking a question
  const asked = await questioner.askAuthor(
    'abc123def456',
    'fix: update authentication logic',
    'John Doe',
    'john@example.com',
    'What specific security issue did this fix address?'
  );

  if (asked) {
    console.log('✅ Question sent');
  } else {
    console.log('❌ Could not send question');
  }

  // Check unanswered
  const unanswered = await questioner.getUnansweredQuestions();
  console.log(`\n📋 ${unanswered.length} unanswered questions`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

