import Redis from 'ioredis';

export class RedisStore {
  private client: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = new Redis(redisUrl);

    this.client.on('connect', () => {
      console.log('✅ Redis connected');
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis error:', err);
    });
  }

  async storeJob(jobId: string, data: any): Promise<void> {
    await this.client.set(`job:${jobId}`, JSON.stringify(data), 'EX', 3600);
  }

  async getJob(jobId: string): Promise<any | null> {
    const data = await this.client.get(`job:${jobId}`);
    return data ? JSON.parse(data) : null;
  }

  async updateJobStatus(jobId: string, status: string, result?: any): Promise<void> {
    const job = await this.getJob(jobId);
    if (job) {
      job.status = status;
      if (result) job.result = result;
      await this.storeJob(jobId, job);
    }
  }

  async addEvent(event: {
    type: 'commit_analyzed' | 'excavation_started' | 'clarification_needed';
    repoUrl: string;
    commitHash?: string;
    message: string;
    timestamp: Date;
  }): Promise<void> {
    const id = `event:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    const eventData = { id, ...event };
    
    await this.client.zadd('events', Date.now(), JSON.stringify(eventData));
    
    // Keep only last 100 events
    await this.client.zremrangebyrank('events', 0, -101);
  }

  async getRecentEvents(limit: number = 20): Promise<any[]> {
    const events = await this.client.zrevrange('events', 0, limit - 1);
    return events.map(e => JSON.parse(e));
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

export const redisStore = new RedisStore();
