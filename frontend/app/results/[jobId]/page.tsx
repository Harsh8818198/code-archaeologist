'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import KnowledgeGraph from '@/components/KnowledgeGraph';
import { subscribeToJob, unsubscribeFromJob, isSupabaseAvailable } from '@/lib/supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface JobStatus {
  id: string;
  repoPath?: string;
  repo_url?: string;
  status: 'pending' | 'processing' | 'running' | 'completed' | 'failed';
  progress: number;
  currentStep?: string;
  current_step?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  error_message?: string;
  hasReport?: boolean;
}

interface Report {
  repository: string;
  excavationDate: string;
  durationSeconds: number;
  modelUsed?: string;
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
    edges: Array<{ source: string; target: string; relationship: string; [key: string]: any }>;
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
  const [isRealtime, setIsRealtime] = useState(false);

  // Fetch job status from API
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/excavate/${jobId}`);
      if (!response.ok) throw new Error('Failed to fetch job status');
      const data = await response.json();
      
      // Normalize the response
      const normalizedJob: JobStatus = {
        id: data.id,
        repoPath: data.repoUrl || data.repo_url,
        status: data.status,
        progress: data.progress || 0,
        currentStep: data.currentStep || data.current_step || '',
        error: data.error || data.error_message,
        hasReport: data.hasReport || data.status === 'completed',
      };
      
      setJob(normalizedJob);
      setError(null);
      
      // Fetch report if completed
      if (normalizedJob.status === 'completed' && !report) {
        fetchReport();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [jobId, report]);

  // Fetch full report
  const fetchReport = async () => {
    try {
      const response = await fetch(`${API_URL}/api/excavate/${jobId}/report`);
      if (!response.ok) throw new Error('Failed to fetch report');
      const data = await response.json();
      
      if (data.success && data.data) {
        // Normalize edges to ensure relationship is always present
        if (data.data.knowledgeGraph?.edges) {
          data.data.knowledgeGraph.edges = data.data.knowledgeGraph.edges.map((edge: any) => ({
            ...edge,
            relationship: edge.relationship || edge.label || 'related'
          }));
        }
        setReport(data.data);
      }
    } catch (err: any) {
      console.error('Report fetch error:', err);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchStatus();

    // Try real-time subscription
    let channel: any = null;
    
    if (isSupabaseAvailable()) {
      channel = subscribeToJob(
        jobId,
        (updatedJob) => {
          console.log('🔄 Real-time update:', updatedJob.status, updatedJob.progress);
          
          const normalizedJob: JobStatus = {
            id: updatedJob.id,
            repoPath: updatedJob.repo_url,
            status: updatedJob.status,
            progress: updatedJob.progress || 0,
            currentStep: updatedJob.current_step || '',
            error: updatedJob.error_message,
            hasReport: updatedJob.status === 'completed',
          };
          
          setJob(normalizedJob);
          
          // Fetch report when completed
          if (updatedJob.status === 'completed') {
            fetchReport();
          }
        },
        () => {
          console.warn('Real-time failed, using polling');
          setIsRealtime(false);
        }
      );
      
      if (channel) {
        setIsRealtime(true);
      }
    }

    // Fallback polling (only if not using real-time OR job is still processing)
    const interval = setInterval(() => {
      if (!isRealtime) {
        fetchStatus();
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      if (channel) unsubscribeFromJob(channel);
    };
  }, [jobId]);

  // Refetch report when job completes
  useEffect(() => {
    if (job?.status === 'completed' && !report) {
      fetchReport();
    }
  }, [job?.status, report]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading excavation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center bg-red-900/20 border border-red-500/30 rounded-xl p-8 max-w-md">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
          <p className="text-slate-400">{error}</p>
          <button 
            onClick={fetchStatus}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-400 flex items-center gap-3">
              🏛️ Excavation Results
              {isRealtime && (
                <span className="text-green-400 text-sm flex items-center gap-1 bg-green-900/30 px-2 py-1 rounded-full">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Live
                </span>
              )}
            </h1>
            <p className="text-slate-400 mt-1">
              Job ID: <code className="text-amber-500">{jobId.slice(0, 8)}...</code>
            </p>
          </div>
          <a 
            href="/excavate" 
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600"
          >
            ← New Excavation
          </a>
        </div>

        {/* Status Card */}
        {job && job.status !== 'completed' && (
          <div className="bg-slate-800 rounded-xl p-6 mb-8 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {job.status === 'processing' ? '⏳ Processing...' : 
                 job.status === 'pending' ? '🕐 Pending...' :
                 job.status === 'failed' ? '❌ Failed' : '📊 Status'}
              </h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                job.status === 'processing' ? 'bg-blue-900/50 text-blue-300' :
                job.status === 'pending' ? 'bg-yellow-900/50 text-yellow-300' :
                job.status === 'failed' ? 'bg-red-900/50 text-red-300' :
                'bg-green-900/50 text-green-300'
              }`}>
                {job.status}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-slate-400 mb-1">
                <span>{job.currentStep || 'Initializing...'}</span>
                <span>{job.progress}%</span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            </div>

            {job.error && (
              <div className="mt-4 p-4 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300">
                {job.error}
              </div>
            )}
          </div>
        )}

        {/* Report Content */}
        {report && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard 
                label="Files Analyzed" 
                value={report.stats?.analyzedFiles || report.metadata?.analyzedFiles || 0} 
                icon="📂"
              />
              <StatCard 
                label="Total Commits" 
                value={report.stats?.totalCommits || report.metadata?.totalCommits || 0} 
                icon="📝"
              />
              <StatCard 
                label="Contributors" 
                value={report.stats?.totalAuthors || report.metadata?.totalAuthors || 0} 
                icon="👥"
              />
              <StatCard 
                label="Duration" 
                value={`${report.durationSeconds?.toFixed(1) || 0}s`} 
                icon="⏱️"
              />
            </div>

            {/* Model Used Badge */}
            {report.modelUsed && (
              <div className="mb-6">
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-900/30 border border-purple-500/30 rounded-full text-purple-300 text-sm">
                  🤖 Model: {report.modelUsed}
                </span>
              </div>
            )}

            {/* Insights */}
            {report.insights && (
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {report.insights.businessDomains && report.insights.businessDomains.length > 0 && (
                  <InsightCard 
                    title="📋 Business Domains" 
                    items={report.insights.businessDomains} 
                    color="blue"
                  />
                )}
                {report.insights.hotspots && report.insights.hotspots.length > 0 && (
                  <InsightCard 
                    title="🔥 Hotspots" 
                    items={report.insights.hotspots} 
                    color="orange"
                  />
                )}
                {report.insights.riskAreas && report.insights.riskAreas.length > 0 && (
                  <InsightCard 
                    title="⚠️ Risk Areas" 
                    items={report.insights.riskAreas} 
                    color="red"
                  />
                )}
                {report.insights.recommendations && report.insights.recommendations.length > 0 && (
                  <InsightCard 
                    title="💡 Recommendations" 
                    items={report.insights.recommendations} 
                    color="green"
                  />
                )}
              </div>
            )}

            {/* Knowledge Graph */}
            {report.knowledgeGraph && report.knowledgeGraph.nodes.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">🕸️ Knowledge Graph</h2>
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <KnowledgeGraph
                    nodes={report.knowledgeGraph.nodes}
                    edges={report.knowledgeGraph.edges}
                  />
                </div>
              </div>
            )}

            {/* Files List */}
            {report.files && report.files.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">📄 Analyzed Files</h2>
                <div className="space-y-4">
                  {report.files.map((file, index) => (
                    <FileCard key={index} file={file} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Component: Stat Card
function StatCard({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-amber-400">{value}</div>
      <div className="text-slate-400 text-sm">{label}</div>
    </div>
  );
}

// Component: Insight Card
function InsightCard({ title, items, color }: { title: string; items: string[]; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'border-blue-500/30 bg-blue-900/20',
    orange: 'border-orange-500/30 bg-orange-900/20',
    red: 'border-red-500/30 bg-red-900/20',
    green: 'border-green-500/30 bg-green-900/20',
  };
  
  return (
    <div className={`rounded-xl p-4 border ${colorClasses[color] || colorClasses.blue}`}>
      <h3 className="font-semibold mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.slice(0, 5).map((item, index) => (
          <li key={index} className="text-slate-300 text-sm flex items-start gap-2">
            <span className="text-slate-500">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Component: File Card
function FileCard({ file }: { file: any }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-amber-400">📄</span>
          <span className="font-mono text-sm">{file.path}</span>
          <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-400">
            {file.language}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span>{file.metrics?.lines || 0} lines</span>
          <span className={file.metrics?.complexity > 20 ? 'text-red-400' : 'text-green-400'}>
            Complexity: {file.metrics?.complexity || 0}
          </span>
          <span>{expanded ? '▲' : '▼'}</span>
        </div>
      </button>
      
      {expanded && file.analysis && (
        <div className="p-4 border-t border-slate-700 bg-slate-800/50">
          <div className="mb-4">
            <h4 className="text-amber-400 font-semibold mb-1">Summary</h4>
            <p className="text-slate-300 text-sm">{file.analysis.summary}</p>
          </div>
          {file.analysis.businessContext && (
            <div className="mb-4">
              <h4 className="text-blue-400 font-semibold mb-1">Business Context</h4>
              <p className="text-slate-300 text-sm">{file.analysis.businessContext}</p>
            </div>
          )}
          {file.analysis.risks && file.analysis.risks.length > 0 && (
            <div>
              <h4 className="text-red-400 font-semibold mb-1">Risks</h4>
              <ul className="text-slate-300 text-sm list-disc list-inside">
                {file.analysis.risks.map((risk: string, i: number) => (
                  <li key={i}>{risk}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
