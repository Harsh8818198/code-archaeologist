'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  repoUrl: string;
  result?: ExcavationResult;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface ExcavationResult {
  repoUrl: string;
  analyzedAt: string;
  totalCommits: number;
  totalFiles: number;
  archaeologicalLayers: any[];
  fossilizedPatterns: any[];
  knowledgeGaps: any[];
  recommendations: any[];
}

export default function ResultsPage() {
  const params = useParams();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<JobStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // Use the correct endpoint: /api/excavate/:jobId
        const response = await fetch(`${API_URL}/api/excavate/${jobId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setJob(data);
      } catch (err: any) {
        console.error('Error fetching job:', err);
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
              <p className="text-sm text-slate-400">Repository: {job.repoUrl}</p>
            </div>
            <StatusBadge status={job.status} />
          </div>

          {(job.status === 'pending' || job.status === 'processing') && (
            <div className="mt-4">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${job.progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-slate-400 mt-2">{job.currentStep}</p>
            </div>
          )}

          {job.error && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-500 rounded">
              <p className="text-red-400">{job.error}</p>
            </div>
          )}
        </div>

        {/* Results */}
        {job.result && job.status === 'completed' && (
          <>
            {/* Summary Stats */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <StatCard label="Total Commits" value={job.result.totalCommits} />
              <StatCard label="Total Files" value={job.result.totalFiles} />
              <StatCard label="Patterns Found" value={job.result.fossilizedPatterns.length} />
              <StatCard label="Knowledge Gaps" value={job.result.knowledgeGaps.length} />
            </div>

            {/* Fossilized Patterns */}
            {job.result.fossilizedPatterns.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-6 mb-8">
                <h2 className="text-2xl font-bold mb-4">🦴 Fossilized Patterns</h2>
                <div className="space-y-3">
                  {job.result.fossilizedPatterns.map((pattern: any, i: number) => (
                    <div key={i} className="bg-slate-700 rounded p-4">
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-semibold text-purple-400">{pattern.type}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          pattern.riskLevel === 'critical' ? 'bg-red-500' :
                          pattern.riskLevel === 'high' ? 'bg-orange-500' :
                          pattern.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}>
                          {pattern.riskLevel}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 mb-2">{pattern.description}</p>
                      <p className="text-xs text-slate-400">Location: {pattern.location}</p>
                      <p className="text-xs text-blue-400 mt-2">💡 {pattern.suggestedAction}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Knowledge Gaps */}
            {job.result.knowledgeGaps.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-6 mb-8">
                <h2 className="text-2xl font-bold mb-4">📚 Knowledge Gaps</h2>
                <div className="space-y-3">
                  {job.result.knowledgeGaps.map((gap: any, i: number) => (
                    <div key={i} className="bg-slate-700 rounded p-4">
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-semibold text-blue-400">{gap.type}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          gap.severity === 'high' ? 'bg-red-500' :
                          gap.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}>
                          {gap.severity}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 mb-2">{gap.description}</p>
                      <p className="text-xs text-slate-400">File: {gap.file}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {job.result.recommendations.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4">💡 Recommendations</h2>
                <div className="space-y-3">
                  {job.result.recommendations.map((rec: any, i: number) => (
                    <div key={i} className="bg-slate-700 rounded p-4">
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-semibold text-green-400">{rec.title}</span>
                        <span className="text-xs text-slate-400">{rec.estimatedEffort}</span>
                      </div>
                      <p className="text-sm text-slate-300">{rec.description}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                          {rec.category}
                        </span>
                        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                          Impact: {rec.impact}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    pending: 'bg-yellow-500',
    processing: 'bg-blue-500 animate-pulse',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
  };

  return (
    <div className={`px-4 py-2 rounded-full ${colors[status as keyof typeof colors]} text-white font-semibold`}>
      {status.toUpperCase()}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <p className="text-sm text-slate-400 mb-2">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
