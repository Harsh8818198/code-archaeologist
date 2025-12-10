'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ExcavatePage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const router = useRouter();
  const [repoPath, setRepoPath] = useState('');
  const [maxFiles, setMaxFiles] = useState(10);
  const [skipAI, setSkipAI] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/excavate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoPath,
          options: { maxFiles, skipAnalysis: skipAI },
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Redirect to results page
        router.push(`/results/${data.data.jobId}`);
      } else {
        setError(data.error || 'Failed to start excavation');
      }
    } catch (err: any) {
      setError(`Failed to connect to API: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-5xl font-bold mb-4 text-center">
            Start Code Excavation
          </h1>
          <p className="text-center text-slate-400 mb-12">
            Analyze your repository to uncover historical context and business decisions
          </p>

          <form onSubmit={handleSubmit} className="space-y-6 bg-slate-800 p-8 rounded-xl border border-slate-700">
            {/* Repository Path */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Repository Path or GitHub URL
              </label>
              <input
                type="text"
                value={repoPath}
                onChange={(e) => setRepoPath(e.target.value)}
                placeholder="/path/to/repo or https://github.com/user/repo"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 text-white"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Enter a local path or GitHub repository URL
              </p>
            </div>

            {/* Max Files */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Maximum Files to Analyze: {maxFiles}
              </label>
              <input
                type="range"
                min="5"
                max="50"
                value={maxFiles}
                onChange={(e) => setMaxFiles(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>5 (faster)</span>
                <span>50 (comprehensive)</span>
              </div>
            </div>

            {/* Skip AI */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="skipAI"
                checked={skipAI}
                onChange={(e) => setSkipAI(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="skipAI" className="text-sm">
                Skip AI analysis (faster, metrics only)
              </label>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                  Starting Excavation...
                </span>
              ) : (
                'Start Excavation →'
              )}
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-8 p-6 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="font-semibold mb-2">What happens during excavation?</h3>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>✓ Analyzes git commit history</li>
              <li>✓ Calculates code complexity metrics</li>
              <li>✓ Extracts dependencies and relationships</li>
              <li>✓ AI-powered business context extraction</li>
              <li>✓ Generates knowledge graph</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
