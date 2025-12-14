// Add to RedisStore class

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

