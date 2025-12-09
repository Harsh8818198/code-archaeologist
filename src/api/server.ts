/**
 * REST API Server for Code Archaeologist
 */

import { createServer, IncomingMessage, ServerResponse } from "http";
import { parse as parseUrl } from "url";
import { ExcavatorAgent, ExcavationReport } from "../agents/excavator.js";
import { config } from "dotenv";
import * as fs from "fs";

config();

interface APIResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

interface ExcavationJob {
  id: string;
  repoPath: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  error?: string;
  report?: ExcavationReport;
}

const jobs = new Map<string, ExcavationJob>();

async function handleStartExcavation(
  body: { repoPath: string; options?: Record<string, unknown> }
): Promise<APIResponse> {
  const { repoPath, options = {} } = body;

  if (!repoPath) {
    return { success: false, error: "repoPath is required" };
  }

  if (!fs.existsSync(repoPath)) {
    return { success: false, error: "Repository path does not exist" };
  }

  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const job: ExcavationJob = {
    id: jobId,
    repoPath,
    status: "pending",
    startedAt: new Date().toISOString(),
  };

  jobs.set(jobId, job);

  runExcavation(jobId, repoPath, options as any).catch((error) => {
    const j = jobs.get(jobId);
    if (j) {
      j.status = "failed";
      j.error = error.message;
      j.completedAt = new Date().toISOString();
    }
  });

  return {
    success: true,
    data: { jobId, status: "pending", message: "Excavation started" },
  };
}

async function runExcavation(
  jobId: string,
  repoPath: string,
  options: { maxFiles?: number; skipAnalysis?: boolean }
): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = "running";

  try {
    const excavator = new ExcavatorAgent(repoPath, {
      maxFiles: options.maxFiles || 10,
      skipAnalysis: options.skipAnalysis || false,
      verbose: false,
    });

    const report = await excavator.excavate();
    job.status = "completed";
    job.completedAt = new Date().toISOString();
    job.report = report;
  } catch (error: any) {
    job.status = "failed";
    job.error = error.message;
    job.completedAt = new Date().toISOString();
  }
}

function handleGetJob(jobId: string): APIResponse {
  const job = jobs.get(jobId);
  if (!job) {
    return { success: false, error: "Job not found" };
  }
  return {
    success: true,
    data: {
      id: job.id,
      repoPath: job.repoPath,
      status: job.status,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      hasReport: !!job.report,
    },
  };
}

function handleGetReport(jobId: string): APIResponse {
  const job = jobs.get(jobId);
  if (!job) {
    return { success: false, error: "Job not found" };
  }
  if (job.status !== "completed") {
    return { success: false, error: `Job status is ${job.status}` };
  }
  return { success: true, data: job.report };
}

function handleListJobs(): APIResponse {
  const jobList = Array.from(jobs.values()).map((j) => ({
    id: j.id,
    repoPath: j.repoPath,
    status: j.status,
    startedAt: j.startedAt,
    completedAt: j.completedAt,
  }));
  return { success: true, data: jobList };
}

function handleHealth(): APIResponse {
  return {
    success: true,
    data: { status: "healthy", timestamp: new Date().toISOString(), version: "0.1.0" },
  };
}

async function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function sendResponse(res: ServerResponse, statusCode: number, data: APIResponse): void {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data, null, 2));
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const { pathname } = parseUrl(req.url || "/", true);
  const method = req.method || "GET";

  // Handle CORS preflight
  if (method === "OPTIONS") {
    sendResponse(res, 200, { success: true });
    return;
  }

  try {
    // Health check
    if (pathname === "/health" && method === "GET") {
      sendResponse(res, 200, handleHealth());
      return;
    }

    // Start excavation
    if (pathname === "/api/excavate" && method === "POST") {
      const body = await parseBody(req);
      const response = await handleStartExcavation(body as any);
      sendResponse(res, response.success ? 200 : 400, response);
      return;
    }

    // List jobs
    if (pathname === "/api/jobs" && method === "GET") {
      sendResponse(res, 200, handleListJobs());
      return;
    }

    // Get job or report
    if (pathname?.startsWith("/api/jobs/") && method === "GET") {
      const parts = pathname.split("/");
      const jobId = parts[3];
      
      if (parts[4] === "report") {
        const response = handleGetReport(jobId);
        sendResponse(res, response.success ? 200 : 404, response);
      } else {
        const response = handleGetJob(jobId);
        sendResponse(res, response.success ? 200 : 404, response);
      }
      return;
    }

    // Not found
    sendResponse(res, 404, { success: false, error: "Not found" });

  } catch (error: any) {
    sendResponse(res, 500, { success: false, error: error.message });
  }
}

function startServer(port: number = 3001): void {
  const server = createServer(handleRequest);

  server.listen(port, () => {
    console.log(`
🏛️  Code Archaeologist API Server
═══════════════════════════════════════
🚀 Server running on http://localhost:${port}

Endpoints:
  GET  /health              - Health check
  POST /api/excavate        - Start excavation
  GET  /api/jobs            - List all jobs
  GET  /api/jobs/:id        - Get job status
  GET  /api/jobs/:id/report - Get excavation report
═══════════════════════════════════════
    `);
  });
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const port = parseInt(process.env.PORT || "3001");
  startServer(port);
}

export { startServer };
