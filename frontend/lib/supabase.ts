/**
 * Supabase Client for Frontend
 * Provides real-time subscriptions to job updates
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create client only if credentials exist
export const supabase: SupabaseClient | null = 
  (supabaseUrl && supabaseAnonKey) 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export interface Job {
  id: string;
  repo_url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  current_step: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Subscribe to job updates in real-time
 */
export function subscribeToJob(
  jobId: string,
  onUpdate: (job: Job) => void,
  onError?: (error: Error) => void
): RealtimeChannel | null {
  if (!supabase) {
    console.warn('⚠️ Supabase not available, using polling fallback');
    return null;
  }

  console.log('📡 Subscribing to job:', jobId);

  const channel = supabase
    .channel(`job-updates-${jobId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
        filter: `id=eq.${jobId}`
      },
      (payload) => {
        console.log('✅ Real-time update received:', payload.new);
        onUpdate(payload.new as Job);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscribed to real-time updates');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Subscription error');
        onError?.(new Error('Real-time subscription failed'));
      }
    });

  return channel;
}

/**
 * Unsubscribe from job updates
 */
export function unsubscribeFromJob(channel: RealtimeChannel | null) {
  if (channel && supabase) {
    console.log('📴 Unsubscribing from job updates');
    supabase.removeChannel(channel);
  }
}

/**
 * Fetch job directly from Supabase
 */
export async function getJobFromSupabase(jobId: string): Promise<Job | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) {
    console.error('Error fetching job:', error);
    return null;
  }

  return data;
}

/**
 * Check if Supabase is available
 */
export function isSupabaseAvailable(): boolean {
  return supabase !== null;
}
