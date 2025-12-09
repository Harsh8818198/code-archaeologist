/**
 * Kestra Orchestration Client
 * 
 * Role in Infinity Stones: The Timeline Orchestrator
 * 
 * Orchestrates multi-day excavation as long-running sagas,
 * manages parallel analysis, and implements human-in-the-loop.
 */

import axios, { AxiosInstance } from "axios";
import { config } from "dotenv";

config();

// ============================================
// TYPE DEFINITIONS
// ============================================

interface WorkflowExecution {
  id: string;
  namespace: string;
  flowId: string;
  state: "CREATED" | "RUNNING" | "SUCCESS" | "FAILED" | "PAUSED" | "KILLED";
  startDate: string;
  endDate?: string;
}

interface HumanReviewRequest {
  executionId: string;
  question: string;
  context: Record<string, unknown>;
  options: string[];
  timeout: string;
}

// ============================================
// KESTRA ORCHESTRATOR CLASS
// ============================================

export class KestraOrchestrator {
  private client: AxiosInstance;
  private namespace: string;
  private isConnected: boolean = false;

  constructor() {
    const baseURL = process.env.KESTRA_URL || "http://localhost:8080";

    this.client = axios.create({
      baseURL,
      headers: {
        "Content-Type": "application/json",
      },
      auth: process.env.KESTRA_USERNAME ? {
        username: process.env.KESTRA_USERNAME,
        password: process.env.KESTRA_PASSWORD || "",
      } : undefined,
    });

    this.namespace = "code-archaeologist";
  }

  /**
   * Check if Kestra is available
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.client.get("/api/v1/flows", { timeout: 5000 });
      this.isConnected = true;
      return true;
    } catch {
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Create the namespace if it doesn't exist
   */
  async ensureNamespace(): Promise<void> {
    try {
      await this.client.get(`/api/v1/namespaces/${this.namespace}`);
    } catch {
      // Namespace might not exist, that's okay
      console.log(`   Creating namespace: ${this.namespace}`);
    }
  }

  /**
   * Create the main excavation workflow
   */
  async createExcavationWorkflow(): Promise<void> {
    const workflowYaml = `
id: excavation-saga
namespace: ${this.namespace}
description: Multi-day codebase excavation with human-in-the-loop

inputs:
  - id: repository_url
    type: STRING
    required: true
    description: Git repository URL to analyze

  - id: max_files
    type: INT
    required: false
    defaults: 20
    description: Maximum files to analyze

tasks:
  - id: log_start
    type: io.kestra.core.tasks.log.Log
    message: "Starting excavation for {{ inputs.repository_url }}"

  - id: clone_repository
    type: io.kestra.plugin.scripts.shell.Commands
    runner: PROCESS
    commands:
      - git clone --depth 50 {{ inputs.repository_url }} /tmp/repo-{{ execution.id }}

  - id: analyze_structure
    type: io.kestra.plugin.scripts.shell.Commands
    runner: PROCESS
    commands:
      - cd /tmp/repo-{{ execution.id }}
      - find . -name "*.ts" -o -name "*.js" -o -name "*.py" | head -{{ inputs.max_files }}

  - id: log_complete
    type: io.kestra.core.tasks.log.Log
    message: "Excavation complete for {{ inputs.repository_url }}"

  - id: cleanup
    type: io.kestra.plugin.scripts.shell.Commands
    runner: PROCESS
    commands:
      - rm -rf /tmp/repo-{{ execution.id }}
`;

    try {
      await this.ensureNamespace();
      
      // Try to create the flow
      await this.client.post(
        `/api/v1/flows`,
        workflowYaml,
        {
          headers: { "Content-Type": "application/x-yaml" },
        }
      );
      console.log("✅ Excavation workflow created");
    } catch (error: any) {
      if (error.response?.status === 409) {
        // Flow already exists, update it
        try {
          await this.client.put(
            `/api/v1/flows/${this.namespace}/excavation-saga`,
            workflowYaml,
            {
              headers: { "Content-Type": "application/x-yaml" },
            }
          );
          console.log("✅ Excavation workflow updated");
        } catch (updateError: any) {
          console.error("Failed to update workflow:", updateError.message);
        }
      } else {
        console.error("Failed to create workflow:", error.response?.data || error.message);
      }
    }
  }

  /**
   * Start an excavation execution
   */
  async startExcavation(
    repositoryUrl: string,
    options: { maxFiles?: number } = {}
  ): Promise<WorkflowExecution | null> {
    try {
      const response = await this.client.post(
        `/api/v1/executions/${this.namespace}/excavation-saga`,
        null,
        {
          params: {
            "inputs[repository_url]": repositoryUrl,
            "inputs[max_files]": options.maxFiles || 20,
          },
        }
      );

      console.log(`🚀 Started excavation: ${response.data.id}`);
      return response.data;
    } catch (error: any) {
      console.error("Failed to start excavation:", error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Get execution status
   */
  async getExecution(executionId: string): Promise<WorkflowExecution | null> {
    try {
      const response = await this.client.get(`/api/v1/executions/${executionId}`);
      return response.data;
    } catch (error: any) {
      console.error("Failed to get execution:", error.message);
      return null;
    }
  }

  /**
   * List recent executions
   */
  async listExecutions(limit: number = 10): Promise<WorkflowExecution[]> {
    try {
      const response = await this.client.get(`/api/v1/executions`, {
        params: {
          namespace: this.namespace,
          size: limit,
        },
      });
      return response.data.results || [];
    } catch (error: any) {
      console.error("Failed to list executions:", error.message);
      return [];
    }
  }

  /**
   * Store data in KV store
   */
  async storeKV(key: string, value: unknown): Promise<void> {
    try {
      await this.client.put(
        `/api/v1/namespaces/${this.namespace}/kv/${key}`,
        JSON.stringify(value),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      console.error("Failed to store KV:", error.message);
    }
  }

  /**
   * Retrieve data from KV store
   */
  async getKV(key: string): Promise<unknown> {
    try {
      const response = await this.client.get(
        `/api/v1/namespaces/${this.namespace}/kv/${key}`
      );
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Request human review (stores request and logs it)
   */
  async requestHumanReview(request: HumanReviewRequest): Promise<void> {
    await this.storeKV(`review-${request.executionId}`, {
      ...request,
      requestedAt: new Date().toISOString(),
      status: "pending",
    });

    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    🔔 HUMAN REVIEW REQUESTED                      ║
╠══════════════════════════════════════════════════════════════════╣
║ Execution: ${request.executionId.slice(0, 30)}...
║ Question:  ${request.question.slice(0, 45)}...
║ Options:   ${request.options.join(", ")}
╚══════════════════════════════════════════════════════════════════╝
    `);
  }

  /**
   * Submit human review decision
   */
  async submitReview(executionId: string, decision: string): Promise<void> {
    const existing = await this.getKV(`review-${executionId}`);
    if (existing && typeof existing === "object") {
      await this.storeKV(`review-${executionId}`, {
        ...(existing as Record<string, unknown>),
        decision,
        resolvedAt: new Date().toISOString(),
        status: "resolved",
      });
    }

    try {
      await this.client.post(`/api/v1/executions/${executionId}/resume`);
      console.log(`✅ Review submitted, execution resumed`);
    } catch (error: any) {
      console.error("Failed to resume execution:", error.message);
    }
  }

  /**
   * Kill a running execution
   */
  async killExecution(executionId: string): Promise<void> {
    try {
      await this.client.delete(`/api/v1/executions/${executionId}/kill`);
      console.log(`🛑 Execution ${executionId} killed`);
    } catch (error: any) {
      console.error("Failed to kill execution:", error.message);
    }
  }
}

// ============================================
// CLI ENTRY POINT
// ============================================

async function main() {
  const orchestrator = new KestraOrchestrator();
  const command = process.argv[2];
  const arg = process.argv[3];

  console.log("\n🎭 Kestra Orchestrator");
  console.log("─".repeat(40));

  // Check connection
  console.log("Checking Kestra connection...");
  const connected = await orchestrator.checkConnection();
  
  if (!connected) {
    console.log(`
⚠️  Kestra not available at ${process.env.KESTRA_URL || "http://localhost:8080"}

To start Kestra, run these commands:

  cd ~/kestra
  docker compose up -d

Then wait 30 seconds and try again.

Or continue without orchestration - the excavator works standalone!
    `);
    
    if (command === "init") {
      console.log("\nSkipping workflow creation (Kestra not running)");
      return;
    }
  } else {
    console.log("✅ Connected to Kestra");
  }

  switch (command) {
    case "init":
      console.log("\nCreating excavation workflow...");
      await orchestrator.createExcavationWorkflow();
      break;

    case "start":
      if (!arg) {
        console.log("Usage: pnpm run orchestrate start <repository-url>");
        return;
      }
      await orchestrator.startExcavation(arg);
      break;

    case "status":
      if (!arg) {
        console.log("Usage: pnpm run orchestrate status <execution-id>");
        return;
      }
      const exec = await orchestrator.getExecution(arg);
      if (exec) {
        console.log(JSON.stringify(exec, null, 2));
      }
      break;

    case "list":
      const executions = await orchestrator.listExecutions();
      if (executions.length === 0) {
        console.log("No executions found");
      } else {
        console.log("\nRecent Executions:");
        executions.forEach((e) => {
          console.log(`  ${e.id.slice(0, 12)}... | ${e.state} | ${e.startDate}`);
        });
      }
      break;

    default:
      console.log(`
Commands:
  init              Create/update excavation workflow
  start <url>       Start excavation for a repository
  status <id>       Get execution status
  list              List recent executions

Examples:
  pnpm run orchestrate init
  pnpm run orchestrate start https://github.com/user/repo
  pnpm run orchestrate list
      `);
  }
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(console.error);
}
