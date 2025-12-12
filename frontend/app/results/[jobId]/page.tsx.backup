'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface JobStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  error?: string;
}

interface Report {
  repository: string;
  excavationDate: string;
  durationSeconds: number;
  stats: {
    totalFiles: number;
    analyzedFiles: number;
    totalCommits: number;
    totalAuthors: number;
  };
  insights: {
    businessDomains: string[];
    hotspots: string[];
    riskAreas: string[];
  };
  files: Array<{
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
        const response = await fetch(`http://localhost:3001/api/jobs/${jobId}`);
        const data = await response.json();
        
        if (data.success) {
          setJob(data.data);
          
          // If completed, fetch report
          if (data.data.status === 'completed') {
            const reportResponse = await fetch(`http://localhost:3001/api/jobs/${jobId}/report`);
            const reportData = await reportResponse.json();
            
            if (reportData.success) {
              setReport(reportData.data);
            }
          }
        } else {
          setError(data.error);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    
    // Poll every 3 seconds if not completed
    const interval = setInterval(() => {
      if (job?.status !== 'completed' && job?.status !== 'failed') {
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
            <p className="text-slate-400">{error || 'Job not found'}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold mb-8">Excavation Results</h1>

        {/* Job Status */}
        <div className="bg-slate-800 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Job Status</h2>
              <p className="text-sm text-slate-400">Job ID: {jobId}</p>
            </div>
            <StatusBadge status={job.status} />
          </div>
          
          {job.status === 'running' && (
            <div className="mt-4">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse w-2/3"></div>
              </div>
              <p className="text-sm text-slate-400 mt-2">Analyzing repository...</p>
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
                value={report.stats.analyzedFiles}
                total={report.stats.totalFiles}
              />
              <StatCard 
                label="Total Commits"
                value={report.stats.totalCommits}
              />
              <StatCard 
                label="Contributors"
                value={report.stats.totalAuthors}
              />
              <StatCard 
                label="Duration"
                value={`${report.durationSeconds.toFixed(1)}s`}
              />
            </div>

            {/* Insights */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Business Domains */}
              {report.insights.businessDomains.length > 0 && (
                <InsightCard title="📋 Business Domains" items={report.insights.businessDomains} />
              )}

              {/* Hotspots */}
              {report.insights.hotspots.length > 0 && (
                <InsightCard title="🔥 Hotspots" items={report.insights.hotspots} />
              )}

              {/* Risk Areas */}
              {report.insights.riskAreas.length > 0 && (
                <InsightCard title="⚠️ Risk Areas" items={report.insights.riskAreas} color="red" />
              )}
            </div>

            {/* File Analysis */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">File Analysis</h2>
              <div className="space-y-4">
                {report.files.map((file, index) => (
                  <FileCard key={index} file={file} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    pending: 'bg-yellow-500',
    running: 'bg-blue-500 animate-pulse',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
  };

  return (
    <div className={`px-4 py-2 rounded-full ${colors[status as keyof typeof colors]} text-white font-semibold`}>
      {status.toUpperCase()}
    </div>
  );
}

function StatCard({ label, value, total }: { label: string; value: number | string; total?: number }) {
  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <p className="text-sm text-slate-400 mb-2">{label}</p>
      <p className="text-3xl font-bold">
        {value}
        {total && <span className="text-lg text-slate-500">/{total}</span>}
      </p>
    </div>
  );
}

function InsightCard({ title, items, color = 'purple' }: { title: string; items: string[]; color?: string }) {
  const borderColor = color === 'red' ? 'border-red-500/30' : 'border-purple-500/30';
  
  return (
    <div className={`bg-slate-800 rounded-lg p-6 border ${borderColor}`}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ul className="space-y-2">
        {items.slice(0, 5).map((item, index) => (
          <li key={index} className="text-slate-300 text-sm">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FileCard({ file }: { file: Report['files'][0] }) {
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

          {file.analysis.risks.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-red-400 mb-1">Risks</p>
              <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
                {file.analysis.risks.map((risk, i) => (
                  <li key={i}>{risk}</li>
                ))}
              </ul>
            </div>
          )}

          {file.analysis.recommendations.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-green-400 mb-1">Recommendations</p>
              <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
                {file.analysis.recommendations.map((rec, i) => (
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
