'use client';

import { useState } from 'react';
import Link from 'next/link';

interface AnalysisResult {
  summary: string;
  businessContext: string;
  technicalRationale: string;
  recommendations: string[];
}

export default function ExcavatePage() {
  const [repoPath, setRepoPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:3001/api/excavate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoPath: repoPath || '.',
          options: { maxFiles: 5 },
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch (err) {
      setError('Failed to connect to API server. Make sure it is running on port 3001.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-blue-400 hover:text-blue-300 mb-8 inline-block">
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-white mb-8">🔍 Excavate Repository</h1>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="Repository path (leave empty for current directory)"
              className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              {isLoading ? 'Analyzing...' : 'Excavate'}
            </button>
          </div>
        </form>

        {error && (
          <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200 mb-8">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin text-6xl mb-4">⚙️</div>
            <p className="text-slate-400">Excavating repository history...</p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-3">Summary</h2>
              <p className="text-slate-300">{result.summary}</p>
            </div>

            <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-3">Business Context</h2>
              <p className="text-slate-300">{result.businessContext}</p>
            </div>

            <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-3">Technical Rationale</h2>
              <p className="text-slate-300">{result.technicalRationale}</p>
            </div>

            {result.recommendations && result.recommendations.length > 0 && (
              <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
                <h2 className="text-xl font-semibold text-white mb-3">Recommendations</h2>
                <ul className="list-disc list-inside text-slate-300 space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
