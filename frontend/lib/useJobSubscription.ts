/**
 * React Hook for Real-time Job Updates
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { subscribeToJob, unsubscribeFromJob, getJobFromSupabase, isSupabaseAvailable, Job } from './supabase';

interface UseJobSubscriptionResult {
  job: Job | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isRealtime: boolean;
}

export function useJobSubscription(jobId: string, apiUrl: string): UseJobSubscriptionResult {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealtime, setIsRealtime] = useState(false);

  // Fetch job from API
  const fetchFromApi = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/api/excavate/${jobId}`);
      if (!response.ok) throw new Error('Failed to fetch job');
      const data = await response.json();
      
      // Normalize the response
      setJob({
        id: data.id,
        repo_url: data.repoUrl,
        status: data.status,
        progress: data.progress || 0,
        current_step: data.currentStep || data.current_step || '',
        error_message: data.error || data.error_message,
        created_at: data.createdAt || data.created_at,
        updated_at: data.updatedAt || data.updated_at,
      });
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [jobId, apiUrl]);

  useEffect(() => {
    // Initial fetch
    fetchFromApi();

    // Try to set up real-time subscription
    if (isSupabaseAvailable()) {
      const channel = subscribeToJob(
        jobId,
        (updatedJob) => {
          console.log('🔄 Real-time job update:', updatedJob.status);
          setJob({
            ...updatedJob,
            current_step: updatedJob.current_step || '',
          });
        },
        (err) => {
          console.warn('Real-time failed, using polling:', err);
          setIsRealtime(false);
        }
      );

      if (channel) {
        setIsRealtime(true);
        return () => unsubscribeFromJob(channel);
      }
    }

    // Fallback to polling if no real-time
    const interval = setInterval(() => {
      if (job?.status !== 'completed' && job?.status !== 'failed') {
        fetchFromApi();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, fetchFromApi, job?.status]);

  return {
    job,
    loading,
    error,
    refetch: fetchFromApi,
    isRealtime,
  };
}
