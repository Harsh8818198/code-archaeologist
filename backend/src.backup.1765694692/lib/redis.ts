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
    console.log('⚠️ Redis disabled - using in-memory storage');
  }
} catch (error) {
  console.error('⚠️ Redis initialization failed, using in-memory storage');
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
  result?: ExcavationResult;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface ExcavationResult {
  repositoryInfo: {
    name: string;
    owner: string;
    description: string;
    language: string;
    stars: number;
    forks: number;
    lastUpdated: string;
  };
  summary: string;
  keyFindings: string[];
  technicalDebt: string[];
  recommendations: string[];
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
  dependencies: {
    name: string;
    version: string;
    risk: 'low' | 'medium' | 'high';
    reasoning: string;
  }[];
}

export interface Activity {
  id: string;
  jobId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: Date;
  details?: any;
}

export interface Clarification {
  id: string;
  jobId: string;
  question: string;
  type: 'permission' | 'configuration' | 'analysis';
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
  resolved: boolean;
  response?: string;
}

// Storage functions
export const jobStore = {
  async create(job: Omit<ExcavationJob, 'id'>): Promise<string> {
    const id = randomUUID();
    const fullJob = { ...job, id };
    
    if (redis) {
      await redis.hset(`job:${id}`, fullJob);
      await redis.expire(`job:${id}`, 86400); // 24h expiry
    } else {
      memoryStore.set(`job:${id}`, fullJob);
    }
    
    return id;
  },

  async get(id: string): Promise<ExcavationJob | null> {
    if (redis) {
      const job = await redis.hgetall(`job:${id}`);
      return Object.keys(job).length > 0 ? job as ExcavationJob : null;
    } else {
      return memoryStore.get(`job:${id}`) || null;
    }
  },

  async update(id: string, updates: Partial<ExcavationJob>): Promise<void> {
    if (redis) {
      await redis.hset(`job:${id}`, updates);
    } else {
      const existing = memoryStore.get(`job:${id}`);
      if (existing) {
        memoryStore.set(`job:${id}`, { ...existing, ...updates });
      }
    }
  },

  async list(): Promise<ExcavationJob[]> {
    if (redis) {
      const keys = await redis.keys('job:*');
      const jobs = await Promise.all(
        keys.map(async (key) => {
          const job = await redis!.hgetall(key);
          return Object.keys(job).length > 0 ? job as ExcavationJob : null;
        })
      );
      return jobs.filter(Boolean) as ExcavationJob[];
    } else {
      return Array.from(memoryStore.values()).filter(v => v.id);
    }
  },
};

export const activityStore = {
  async add(activity: Omit<Activity, 'id'>): Promise<void> {
    const id = randomUUID();
    const fullActivity = { ...activity, id };
    
    if (redis) {
      await redis.lpush(`activities:${activity.jobId}`, JSON.stringify(fullActivity));
      await redis.expire(`activities:${activity.jobId}`, 86400);
    } else {
      const key = `activities:${activity.jobId}`;
      const activities = memoryStore.get(key) || [];
      activities.unshift(fullActivity);
      memoryStore.set(key, activities);
    }
  },

  async getForJob(jobId: string): Promise<Activity[]> {
    if (redis) {
      const activities = await redis.lrange(`activities:${jobId}`, 0, -1);
      return activities.map(a => JSON.parse(a));
    } else {
      return memoryStore.get(`activities:${jobId}`) || [];
    }
  },
};

export const clarificationStore = {
  async add(clarification: Omit<Clarification, 'id'>): Promise<string> {
    const id = randomUUID();
    const fullClarification = { ...clarification, id };
    
    if (redis) {
      await redis.hset(`clarification:${id}`, fullClarification);
      await redis.lpush(`clarifications:${clarification.jobId}`, id);
      await redis.expire(`clarification:${id}`, 86400);
      await redis.expire(`clarifications:${clarification.jobId}`, 86400);
    } else {
      memoryStore.set(`clarification:${id}`, fullClarification);
      const key = `clarifications:${clarification.jobId}`;
      const clarifications = memoryStore.get(key) || [];
      clarifications.push(id);
      memoryStore.set(key, clarifications);
    }
    
    return id;
  },

  async get(id: string): Promise<Clarification | null> {
    if (redis) {
      const clarification = await redis.hgetall(`clarification:${id}`);
      return Object.keys(clarification).length > 0 ? clarification as Clarification : null;
    } else {
      return memoryStore.get(`clarification:${id}`) || null;
    }
  },

  async getForJob(jobId: string): Promise<Clarification[]> {
    if (redis) {
      const ids = await redis.lrange(`clarifications:${jobId}`, 0, -1);
      const clarifications = await Promise.all(
        ids.map(async (id) => {
          const clarification = await redis!.hgetall(`clarification:${id}`);
          return Object.keys(clarification).length > 0 ? clarification as Clarification : null;
        })
      );
      return clarifications.filter(Boolean) as Clarification[];
    } else {
      const key = `clarifications:${jobId}`;
      const ids = memoryStore.get(key) || [];
      return ids.map((id: string) => memoryStore.get(`clarification:${id}`)).filter(Boolean);
    }
  },

  async resolve(id: string, response: string): Promise<void> {
    if (redis) {
      await redis.hset(`clarification:${id}`, {
        resolved: true,
        response,
      });
    } else {
      const clarification = memoryStore.get(`clarification:${id}`);
      if (clarification) {
        clarification.resolved = true;
        clarification.response = response;
      }
    }
  },
};
