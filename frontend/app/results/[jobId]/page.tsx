'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import KnowledgeGraph from '@/components/KnowledgeGraph';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface JobStatus {
  id: string;
  repoPath: string;
  status: 'pending' | 'processing' | 'running' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  hasReport?: boolean;
}

interface Report {
  repository: string;
  excavationDate: string;
  durationSeconds: number;
  metadata?: {
    repository?: string;
    timestamp?: string;
    totalFiles?: number;
    totalCommits?: number;
    analyzedFiles?: number;
    totalAuthors?: number;
  };
  stats?: {
    totalFiles: number;
    analyzedFiles: number;
    totalCommits: number;
    totalAuthors: number;
  };
  insights?: {
    businessDomains?: string[];
    hotspots?: string[];
    riskAreas?: string[];
    recommendations?: string[];
  };
  knowledgeGraph?: {
    nodes: Array<{ id: string; type: string; label: string; [key: string]: any }>;
    edges: Array<{ source: string; target: string; relationship?: string; [key: string]: any }>;
  };
  files?: Array<{
    path: string;
    language: string;
    metrics: {
      lines: number;
      complexity: number;
      maintainability: number;
    };
    analysis?: {
      summary: string;
      businessContext: string;
      risks: string[];
      recommendations: string[];
    };
  }>;
}

export default function ResultsPage() {
  const params = useParams();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<JobStatus | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        console.log('Fetching job status:', jobId);
        const response = await fetch(`${API_URL}/api/jobs/${jobId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Job response:', data);

        // Handle both response formats
        const jobData = data.success ? data.data : data;
        
        if (jobData && jobData.id) {
          setJob(jobData);

          // Fetch report if completed
          if (jobData.status === 'completed' && jobData.hasReport !== false) {
            console.log('Fetching report...');
            const reportResponse = await fetch(`${API_URL}/api/jobs/${jobId}/report`);
            const reportData = await reportResponse.json();
            console.log('Report response:', reportData);

            if (reportData.success && reportData.data) {
              setReport(reportData.data);
            } else if (reportData && !reportData.success) {
              // Report might not be ready yet
              console.log('Report not ready:', reportData.error);
            }
          }
        } else {
          setError(data.error || 'Invalid response from server');
        }
      } catch (err: any) {
        console.error('Fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    // Poll every 3 seconds if job is still running
    const interval = setInterval(() => {
      if (job?.status === 'pending' || job?.status === 'processing' || job?.status === 'running') {
        fetchStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobId, job?.status]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mb-4"></div>
            <h1 className="text-2xl font-semibold">Loading excavation results...</h1>
          </div>
        </div>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-red-400 mb-4">Error</h1>
            <p className="text-slate-400 mb-4">{error || 'Job not found'}</p>
            <a href="/excavate" className="text-purple-400 hover:text-purple-300">
              ← Start a new excavation
            </a>
          </div>
        </div>
      </main>
    );
  }

  // Normalize report data
  const stats = report?.stats || {
    totalFiles: report?.metadata?.totalFiles || 0,
    analyzedFiles: report?.metadata?.analyzedFiles || 0,
    totalCommits: report?.metadata?.totalCommits || 0,
    totalAuthors: report?.metadata?.totalAuthors || 0,
  };

  const insights = report?.insights || {
    businessDomains: [],
    hotspots: [],
    riskAreas: [],
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold mb-8">🏛️ Excavation Results</h1>

        {/* Job Status */}
        <div className="bg-slate-800 rounded-lg p-6 mb-8 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Job Status</h2>
              <p className="text-sm text-slate-400">Job ID: {jobId}</p>
              <p className="text-sm text-slate-400">Repository: {job.repoPath}</p>
            </div>
            <StatusBadge status={job.status} />
          </div>

          {(job.status === 'running' || job.status === 'processing') && (
            <div className="mt-4">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${job.progress || 0}%` }}
                ></div>
              </div>
              <p className="text-sm text-slate-400 mt-2">{job.currentStep || 'Analyzing repository...'}</p>
            </div>
          )}

          {job.error && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-500 rounded">
              <p className="text-red-400">{job.error}</p>
            </div>
          )}
        </div>

        {/* Report */}
        {report && (
          <>
            {/* Summary Stats */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Files Analyzed"
                value={stats.analyzedFiles}
                total={stats.totalFiles}
              />
              <StatCard
                label="Total Commits"
                value={stats.totalCommits}
              />
              <StatCard
                label="Contributors"
                value={stats.totalAuthors}
              />
              <StatCard
                label="Duration"
                value={report.durationSeconds ? `${report.durationSeconds.toFixed(1)}s` : 'N/A'}
              />
            </div>

            {/* Knowledge Graph */}
            {report.knowledgeGraph && report.knowledgeGraph.nodes && report.knowledgeGraph.nodes.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">🕸️ Knowledge Graph</h2>
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <KnowledgeGraph
                    nodes={report.knowledgeGraph.nodes}
                    edges={report.knowledgeGraph.edges}
                  />
                </div>
              </div>
            )}

            {/* Insights */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {insights.businessDomains && insights.businessDomains.length > 0 && (
                <InsightCard title="📋 Business Domains" items={insights.businessDomains} />
              )}

              {insights.hotspots && insights.hotspots.length > 0 && (
                <InsightCard title="🔥 Hotspots" items={insights.hotspots} />
              )}

              {insights.riskAreas && insights.riskAreas.length > 0 && (
                <InsightCard title="⚠️ Risk Areas" items={insights.riskAreas} color="red" />
              )}

              {insights.recommendations && insights.recommendations.length > 0 && (
                <InsightCard title="💡 Recommendations" items={insights.recommendations} color="green" />
              )}
            </div>

            {/* File Analysis */}
            {report.files && report.files.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">📁 File Analysis</h2>
                <div className="space-y-4">
                  {report.files.map((file, index) => (
                    <FileCard key={index} file={file} />
                  ))}
                </div>
              </div>
            )}

            {!report.files && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 text-center">
                <p className="text-slate-400">
                  Detailed file analysis is not available for this excavation.
                </p>
              </div>
            )}
          </>
        )}

        {!report && job.status === 'completed' && (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 text-center">
            <p className="text-slate-400">
              Report is being generated. Please refresh in a moment.
            </p>
          </div>
        )}

        <div className="mt-8 text-center">
          <a 
            href="/excavate" 
            className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
          >
            ← Start New Excavation
          </a>
        </div>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    pending: 'bg-yellow-500',
    processing: 'bg-blue-500 animate-pulse',
    running: 'bg-blue-500 animate-pulse',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
  };

  return (
    <div className={`px-4 py-2 rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-500'} text-white font-semibold`}>
      {status.toUpperCase()}
    </div>
  );
}

function StatCard({ label, value, total }: { label: string; value: number | string; total?: number }) {
  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <p className="text-sm text-slate-400 mb-2">{label}</p>
      <p className="text-3xl font-bold">
        {value}
        {total && <span className="text-lg text-slate-500">/{total}</span>}
      </p>
    </div>
  );
}

function InsightCard({ title, items, color = 'purple' }: { title: string; items: string[]; color?: string }) {
  const borderColors = {
    red: 'border-red-500/30',
    purple: 'border-purple-500/30',
    green: 'border-green-500/30',
  };
  
  const borderColor = borderColors[color as keyof typeof borderColors] || borderColors.purple;

  return (
    <div className={`bg-slate-800 rounded-lg p-6 border ${borderColor}`}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ul className="space-y-2">
        {items.slice(0, 10).map((item, index) => (
          <li key={index} className="text-slate-300 text-sm">
            • {item}
          </li>
        ))}
      </ul>
      {items.length > 10 && (
        <p className="text-xs text-slate-500 mt-2">
          ... and {items.length - 10} more
        </p>
      )}
    </div>
  );
}

function FileCard({ file }: { file: NonNullable<Report["files"]>[number] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-purple-500/50 transition-all">
      <div
        className="flex items-start justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2">{file.path}</h3>
          <div className="flex gap-4 text-sm text-slate-400">
            <span>Language: {file.language}</span>
            <span>Lines: {file.metrics.lines}</span>
            <span>Complexity: {file.metrics.complexity}</span>
            <span className={`font-semibold ${
              file.metrics.maintainability > 70 ? 'text-green-400' :
              file.metrics.maintainability > 40 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              Maintainability: {file.metrics.maintainability}
            </span>
          </div>
        </div>
        <button className="text-slate-400 hover:text-white">
          {expanded ? '▼' : '▶'}
        </button>
      </div>

      {expanded && file.analysis && (
        <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
          <div>
            <p className="text-sm font-semibold text-purple-400 mb-1">Summary</p>
            <p className="text-slate-300">{file.analysis.summary}</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-blue-400 mb-1">Business Context</p>
            <p className="text-slate-300">{file.analysis.businessContext}</p>
          </div>

          {file.analysis.risks && file.analysis.risks.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-red-400 mb-1">Risks</p>
              <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
                {file.analysis.risks.slice(0, 3).map((risk, i) => (
                  <li key={i}>{risk}</li>
                ))}
              </ul>
            </div>
          )}

          {file.analysis.recommendations && file.analysis.recommendations.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-green-400 mb-1">Recommendations</p>
              <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
                {file.analysis.recommendations.slice(0, 3).map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
