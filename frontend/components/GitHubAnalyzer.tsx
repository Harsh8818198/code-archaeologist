'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GitHubAnalyzer() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/excavate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/results/${data.jobId}`);
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch (err) {
      setError('Failed to connect to backend');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🏛️ Code Archaeologist</h1>
      <form onSubmit={handleAnalyze} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            GitHub Repository URL
          </label>
          <input
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="w-full p-3 border rounded-lg"
            required
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Analyze Repository'}
        </button>
      </form>
    </div>
  );
}
