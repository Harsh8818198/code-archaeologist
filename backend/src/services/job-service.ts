import { supabase } from '../lib/supabase.js';
import { randomUUID } from 'crypto';

const memoryStore = new Map<string, any>();

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface JobUpdate {
  status?: JobStatus;
  progress?: number;
  currentStep?: string;
  errorMessage?: string;
  result?: any;
}

export class JobService {

  async createJob(repoUrl: string, options: any = {}) {
    if (supabase) {
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          repo_url: repoUrl,
          status: 'pending',
          progress: 0,
          current_step: 'Initializing',
          configuration: options
        })
        .select()
        .single();

      if (!error && data) {
        console.log('Job persisted to Supabase:', data.id);
        return data;
      }
      console.error('Supabase create error:', error);
    }

    const id = 'mem_' + randomUUID();
    const job = {
      id,
      repo_url: repoUrl,
      status: 'pending',
      progress: 0,
      current_step: 'Initializing',
      configuration: options,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    memoryStore.set(id, job);
    console.log('Job stored in memory:', id);
    return job;
  }

  async updateJob(jobId: string, updates: JobUpdate) {
    const dbUpdates: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.status) dbUpdates.status = updates.status;
    if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
    if (updates.currentStep) dbUpdates.current_step = updates.currentStep;
    if (updates.errorMessage) dbUpdates.error_message = updates.errorMessage;

    if (supabase && !jobId.startsWith('mem_')) {
      if (updates.status === 'completed' && updates.result) {
        const { error: artifactError } = await supabase.from('artifacts').insert({
          job_id: jobId,
          type: 'report',
          data: updates.result
        });

        if (artifactError) {
          console.error('Failed to save artifact:', artifactError);
        } else {
          console.log('Report artifact saved for job', jobId);
        }
      }

      const { error } = await supabase
        .from('jobs')
        .update(dbUpdates)
        .eq('id', jobId);

      if (error) {
        console.error('Supabase update error:', error);
      }
      return;
    }

    const job = memoryStore.get(jobId);
    if (job) {
      memoryStore.set(jobId, {
        ...job,
        ...updates,
        current_step: updates.currentStep || job.current_step,
        error_message: updates.errorMessage || job.error_message,
        result: updates.result || job.result,
        updated_at: new Date().toISOString()
      });
    }
  }

  async getJob(jobId: string) {
    if (supabase && !jobId.startsWith('mem_')) {
      const { data: job, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error || !job) return null;

      if (job.status === 'completed') {
        const { data: artifact } = await supabase
          .from('artifacts')
          .select('data')
          .eq('job_id', jobId)
          .eq('type', 'report')
          .single();

        if (artifact) {
          job.result = artifact.data;
        }
      }

      return job;
    }

    return memoryStore.get(jobId) || null;
  }

  async listJobs(limit: number = 10) {
    if (supabase) {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, repo_url, status, progress, current_step, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data) {
        return data;
      }
      console.error('Supabase list error:', error);
    }

    return Array.from(memoryStore.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }

  isUsingSupabase(): boolean {
    return supabase !== null;
  }
}

export const jobService = new JobService();
