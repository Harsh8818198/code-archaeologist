// backend/src/lib/redis.ts
import { Redis } from '@upstash/redis';
import { randomUUID } from 'crypto';

// Initialize Redis client (optional)
let redis: Redis | null = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log('✅ Redis connected');
  } else {
    console.log('⚠️  Redis disabled - using in-memory storage');
  }
} catch (error) {
  console.error('⚠️  Redis initialization failed, using in-memory storage');
  redis = null;
}

// In-memory fallback storage
const memoryStore = new Map<string, any>();

// Types
export interface ExcavationJob {
  id: string;
  repoUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  result?: ExcavationResult;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExcavationResult {
  repoUrl: string;
  analyzedAt: string;
  totalCommits: number;
  totalFiles: number;
  archaeologicalLayers: ArchaeologicalLayer[];
  fossilizedPatterns: FossilizedPattern[];
  knowledgeGaps: KnowledgeGap[];
  recommendations: Recommendation[];
  graphData?: GraphData;
}

export interface ArchaeologicalLayer {
  id: string;
  name: string;
  dateRange: { start: string; end: string };
  commits: number;
  keyChanges: string[];
  contributors: string[];
  sentiment: 'active' | 'stable' | 'declining';
}

export interface FossilizedPattern {
  id: string;
  type: 'dead-code' | 'legacy-pattern' | 'abandoned-feature' | 'cargo-cult';
  location: string;
  description: string;
  lastTouched: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  suggestedAction: string;
}

export interface KnowledgeGap {
  id: string;
  file: string;
  type: 'missing-docs' | 'unclear-purpose' | 'tribal-knowledge' | 'bus-factor';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedAreas: string[];
}

export interface Recommendation {
  id: string;
  priority: number;
  category: 'documentation' | 'refactoring' | 'testing' | 'cleanup';
  title: string;
  description: string;
  estimatedEffort: string;
  impact: 'low' | 'medium' | 'high';
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  type: 'file' | 'author' | 'pattern';
  label: string;
  metadata?: any;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  weight?: number;
}

// Job Store
export const jobStore = {
  // Overloaded create method - accepts repoUrl string or full job object
  async create(jobOrRepoUrl: string | ExcavationJob): Promise<ExcavationJob> {
    let job: ExcavationJob;
    
    if (typeof jobOrRepoUrl === 'string') {
      // Create new job from repoUrl
      job = {
        id: randomUUID(),
        repoUrl: jobOrRepoUrl,
        status: 'pending',
        progress: 0,
        currentStep: 'Initializing...',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      // Use provided job object
      job = jobOrRepoUrl;
    }

    if (redis) {
      await redis.set(`job:${job.id}`, JSON.stringify(job));
    } else {
      memoryStore.set(`job:${job.id}`, job);
    }
    
    return job;
  },

  async get(id: string): Promise<ExcavationJob | null> {
    if (redis) {
      const data = await redis.get(`job:${id}`);
      return data ? (typeof data === 'string' ? JSON.parse(data) : data) : null;
    } else {
      return memoryStore.get(`job:${id}`) || null;
    }
  },

  async update(id: string, updates: Partial<ExcavationJob>): Promise<void> {
    const job = await this.get(id);
    if (job) {
      const updated = { ...job, ...updates, updatedAt: new Date().toISOString() };
      if (redis) {
        await redis.set(`job:${id}`, JSON.stringify(updated));
      } else {
        memoryStore.set(`job:${id}`, updated);
      }
    }
  },

  async setResult(id: string, result: ExcavationResult): Promise<void> {
    await this.update(id, {
      result,
      status: 'completed',
      progress: 100,
      currentStep: 'Completed',
    });
  },

  async delete(id: string): Promise<void> {
    if (redis) {
      await redis.del(`job:${id}`);
    } else {
      memoryStore.delete(`job:${id}`);
    }
  },
};

// Activity Store
export const activityStore = {
  async add(activity: any): Promise<void> {
    const id = `activity:${Date.now()}:${Math.random()}`;
    if (redis) {
      await redis.set(id, JSON.stringify(activity));
    } else {
      memoryStore.set(id, activity);
    }
  },
  
  async create(activity: any): Promise<void> {
    return this.add(activity);
  },
  
  async getRecent(limit: number = 10): Promise<any[]> {
    if (redis) {
      const keys = await redis.keys('activity:*');
      const activities = [];
      for (const key of keys.slice(0, limit)) {
        const data = await redis.get(key);
        if (data) activities.push(typeof data === 'string' ? JSON.parse(data) : data);
      }
      return activities;
    } else {
      const activities = [];
      for (const [key, value] of memoryStore.entries()) {
        if (key.startsWith('activity:')) {
          activities.push(value);
        }
      }
      return activities.slice(0, limit);
    }
  },
};

// Clarification Store
export const clarificationStore = {
  async create(clarification: any): Promise<void> {
    const id = clarification.id || `clarification:${Date.now()}`;
    if (redis) {
      await redis.set(id, JSON.stringify(clarification));
    } else {
      memoryStore.set(id, clarification);
    }
  },
  
  async get(id: string): Promise<any | null> {
    if (redis) {
      const data = await redis.get(id);
      return data ? (typeof data === 'string' ? JSON.parse(data) : data) : null;
    } else {
      return memoryStore.get(id) || null;
    }
  },
};

export default redis;
