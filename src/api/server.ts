import { createServer, IncomingMessage, ServerResponse } from "http";
import { parse as parseUrl } from "url";
import { ExcavatorAgent, ExcavationReport } from "../agents/excavator.js";
import { config } from "dotenv";

config();

interface APIResponse {
  success?: boolean;
  data?: unknown;
  error?: string;
  jobId?: string;
  status?: string;
  pollUrl?: string;
}

interface ExcavationJob {
  id: string;
  repoUrl: string;
  repoPath: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  currentStep: string;
  result?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  report?: ExcavationReport;
}

const jobs = new Map<string, ExcavationJob>();

function setCORSHeaders(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
}

// Convert repoUrl to local path (basic implementation)
function repoUrlToPath(repoUrl: string): string {
  // If it's already a path, return it
  if (repoUrl.startsWith('/') || repoUrl.startsWith('./')) {
    return repoUrl;
  }
  
  // Extract repo name from URL and assume it's in ~/projects/
  const match = repoUrl.match(/([^/]+)\.git$/) || repoUrl.match(/([^/]+)$/);
  const repoName = match ? match[1] : 'unknown';
  return `/home/shank/projects/${repoName}`;
}

async function handleStartExcavation(
  body: { repoUrl?: string; repoPath?: string; options?: Record<string, unknown> }
): Promise<APIResponse> {
  const { repoUrl, repoPath, options = {} } = body;
  
  const url = repoUrl || repoPath;
  if (!url) {
    return { success: false, error: "repoUrl or repoPath is required" };
  }

  const path = repoPath || repoUrlToPath(repoUrl!);
  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  const job: ExcavationJob = {
    id: jobId,
    repoUrl: repoUrl || path,
    repoPath: path,
    status: "pending",
    progress: 0,
    currentStep: "Initializing...",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
  };

  jobs.set(jobId, job);

  runExcavation(jobId, path, options as any).catch((error) => {
    const j = jobs.get(jobId);
    if (j) {
      j.status = "failed";
      j.error = error.message;
      j.completedAt = new Date().toISOString();
      j.updatedAt = new Date().toISOString();
    }
  });

  return {
    jobId,
    status: "pending",
    pollUrl: `/api/excavate/${jobId}`,
  };
}

async function runExcavation(
  jobId: string,
  repoPath: string,
  options: { maxFiles?: number; skipAnalysis?: boolean }
): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = "processing";
  job.currentStep = "Analyzing repository...";
  job.progress = 10;
  job.updatedAt = new Date().toISOString();

  try {
    const excavator = new ExcavatorAgent(repoPath, {
      maxFiles: options.maxFiles || 10,
      skipAnalysis: options.skipAnalysis || false,
      verbose: false,
    });

    job.progress = 30;
    job.currentStep = "Running excavation...";
    job.updatedAt = new Date().toISOString();

    const report = await excavator.excavate();

    job.status = "completed";
    job.progress = 100;
    job.currentStep = "Complete";
    job.completedAt = new Date().toISOString();
    job.updatedAt = new Date().toISOString();
    job.report = report;
    job.result = transformReportToFrontendFormat(report);
  } catch (error: any) {
    job.status = "failed";
    job.error = error.message;
    job.completedAt = new Date().toISOString();
    job.updatedAt = new Date().toISOString();
  }
}

function transformReportToFrontendFormat(report: ExcavationReport): any {
  return {
    repoUrl: report.metadata?.repository || "unknown",
    analyzedAt: report.metadata?.timestamp || new Date().toISOString(),
    totalCommits: report.metadata?.totalCommits || 0,
    totalFiles: report.metadata?.totalFiles || 0,
    archaeologicalLayers: [],
    fossilizedPatterns: [],
    knowledgeGaps: [],
    recommendations: report.insights?.recommendations || [],
    graphData: report.knowledgeGraph ? {
      nodes: report.knowledgeGraph.nodes || [],
      edges: report.knowledgeGraph.edges || []
    } : undefined
  };
}

function handleGetExcavation(jobId: string): APIResponse {
  const job = jobs.get(jobId);
  if (!job) {
    return { success: false, error: "Job not found" };
  }

  // Return in frontend format
  return {
    id: job.id,
    repoUrl: job.repoUrl,
    status: job.status,
    progress: job.progress,
    currentStep: job.currentStep,
    result: job.result,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  } as any;
}

function handleGetRecentExcavations(limit: number = 10): APIResponse {
  const jobList = Array.from(jobs.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .map((j) => ({
      id: j.id,
      repoUrl: j.repoUrl,
      status: j.status,
      progress: j.progress,
      currentStep: j.currentStep,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
    }));

  return jobList as any;
}

function handleGetRecentActivity(limit: number = 20): any[] {
  const activities = Array.from(jobs.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .map((j) => ({
      id: j.id,
      type: j.status === 'completed' ? 'excavation-completed' : 'excavation-started',
      repoUrl: j.repoUrl,
      message: `Excavation ${j.status} for ${j.repoUrl}`,
      timestamp: j.updatedAt,
      metadata: { jobId: j.id }
    }));

  return activities;
}

function handleHealth(): APIResponse {
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
    jobsActive: jobs.size,
  } as any;
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

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const { pathname, query } = parseUrl(req.url || "/", true);
  const method = req.method || "GET";

  setCORSHeaders(res);
  res.setHeader("Content-Type", "application/json");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  let response: any;
  let statusCode = 200;

  try {
    // Health endpoints
    if ((pathname === "/health" || pathname === "/api/health") && method === "GET") {
      response = handleHealth();
    }
    // Start excavation
    else if (pathname === "/api/excavate" && method === "POST") {
      const body = await parseBody(req);
      response = await handleStartExcavation(body as any);
    }
    // Get specific excavation
    else if (pathname?.match(/^\/api\/excavate\/[^/]+$/) && method === "GET") {
      const jobId = pathname.split("/")[3];
      response = handleGetExcavation(jobId);
    }
    // Get recent excavations
    else if (pathname === "/api/excavations/recent" && method === "GET") {
      const limit = parseInt(query.limit as string) || 10;
      response = handleGetRecentExcavations(limit);
    }
    // Get recent activity
    else if (pathname === "/api/activity/recent" && method === "GET") {
      const limit = parseInt(query.limit as string) || 20;
      response = handleGetRecentActivity(limit);
    }
    // Legacy job endpoints
    else if (pathname?.startsWith("/api/jobs/") && method === "GET") {
      const parts = pathname.split("/");
      const jobId = parts[3];
      if (pathname.endsWith("/report")) {
        const job = jobs.get(jobId);
        if (!job) {
          response = { success: false, error: "Job not found" };
          statusCode = 404;
        } else if (job.status !== "completed") {
          response = { success: false, error: `Job status is ${job.status}` };
          statusCode = 400;
        } else {
          response = { success: true, data: job.report };
        }
      } else {
        response = handleGetExcavation(jobId);
      }
    }
    else if (pathname === "/api/jobs" && method === "GET") {
      response = { success: true, data: Array.from(jobs.values()) };
    }
    else {
      response = { success: false, error: "Not found" };
      statusCode = 404;
    }
  } catch (error: any) {
    console.error("Request error:", error);
    response = { success: false, error: error.message };
    statusCode = 500;
  }

  res.writeHead(statusCode);
  res.end(JSON.stringify(response, null, 2));
}

function startServer(port: number = 3001): void {
  const server = createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
      console.error("Unhandled error:", error);
      if (!res.headersSent) {
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: "Internal server error" }));
      }
    });
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`
🏛️  Code Archaeologist API Server
═════════════════════════════════════
🚀 Server: http://localhost:${port}
📊 Health: http://localhost:${port}/health

Frontend-Compatible Endpoints:
  GET  /health                      - Server status
  POST /api/excavate                - Start excavation
  GET  /api/excavate/:id            - Get excavation status
  GET  /api/excavations/recent      - List recent excavations
  GET  /api/activity/recent         - Get activity feed

Ready! ✅
═════════════════════════════════════
    `);
  });

  server.on("error", (error: any) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use`);
      process.exit(1);
    } else {
      console.error("Server error:", error);
    }
  });
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const port = parseInt(process.env.PORT || "3001");
  startServer(port);
}

export { startServer };
