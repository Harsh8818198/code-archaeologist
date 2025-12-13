import { createServer, IncomingMessage, ServerResponse } from "http";
import { parse as parseUrl } from "url";
import { ExcavatorAgent, ExcavationReport } from "../agents/excavator.js";
import { config } from "dotenv";

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

// CORS headers helper
function setCORSHeaders(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
}

async function handleStartExcavation(
  body: { repoPath: string; options?: Record<string, unknown> }
): Promise<APIResponse> {
  const { repoPath, options = {} } = body;

  if (!repoPath) {
    return { success: false, error: "repoPath is required" };
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
    data: {
      jobId,
      status: "pending",
      message: "Excavation started",
    },
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

  return {
    success: true,
    data: job.report,
  };
}

function handleListJobs(): APIResponse {
  const jobList = Array.from(jobs.values()).map((j) => ({
    id: j.id,
    repoPath: j.repoPath,
    status: j.status,
    startedAt: j.startedAt,
    completedAt: j.completedAt,
  }));

  return {
    success: true,
    data: jobList,
  };
}

function handleHealth(): APIResponse {
  return {
    success: true,
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "0.1.0",
      jobsActive: jobs.size,
    },
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

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const { pathname, query } = parseUrl(req.url || "/", true);
  const method = req.method || "GET";

  // Set CORS headers for all requests
  setCORSHeaders(res);

  // Handle OPTIONS preflight
  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  let response: APIResponse;

  try {
    if (pathname === "/health" && method === "GET") {
      response = handleHealth();
    } else if (pathname === "/api/excavate" && method === "POST") {
      const body = await parseBody(req);
      response = await handleStartExcavation(body as any);
    } else if (pathname?.startsWith("/api/jobs/") && method === "GET") {
      const parts = pathname.split("/");
      const jobId = parts[3];
      if (pathname.endsWith("/report")) {
        response = handleGetReport(jobId);
      } else {
        response = handleGetJob(jobId);
      }
    } else if (pathname === "/api/jobs" && method === "GET") {
      response = handleListJobs();
    } else {
      response = { success: false, error: "Not found" };
      res.writeHead(404);
    }
  } catch (error: any) {
    console.error("Request error:", error);
    response = { success: false, error: error.message };
    res.writeHead(500);
  }

  res.setHeader("Content-Type", "application/json");
  if (!res.headersSent) {
    res.writeHead(response.success ? 200 : 400);
  }
  res.end(JSON.stringify(response, null, 2));
}

function startServer(port: number = 3001): void {
  const server = createServer(handleRequest);

  server.listen(port, "0.0.0.0", () => {
    console.log(`
🏛️  Code Archaeologist API Server
═════════════════════════════════════
🚀 Server: http://localhost:${port}
🌍 Network: http://0.0.0.0:${port}
📊 Status: http://localhost:${port}/health

CORS enabled for all origins
Ready to accept requests!
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

const isMainModule = require.main === module;
if (isMainModule) {
  const port = parseInt(process.env.PORT || "3001");
  startServer(port);
}

export { startServer };
