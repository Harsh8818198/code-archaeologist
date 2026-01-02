/**
 * Core type definitions for Code Archaeologist API
 */

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  repoPath: string;
  status: JobStatus;
  progress: number;
  currentStep: string;
  createdAt: string;
  updatedAt: string;
  result?: ExcavationReport;
  error?: string;
}

export interface ExcavationOptions {
  maxFiles?: number;
  skipAnalysis?: boolean;
}

export interface ExcavationReport {
  repository: string;
  excavationDate: string;
  durationSeconds: number;
  modelUsed: string;
  stats: RepositoryStats;
  insights: Insights;
}

export interface RepositoryStats {
  totalFiles: number;
  analyzedFiles: number;
  totalCommits: number;
  totalAuthors: number;
}

export interface Insights {
  businessDomains: string[];
  hotspots: string[];
  riskAreas: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
