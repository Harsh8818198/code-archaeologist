// Parse REDIS_URL format: redis://default:token@url
const REDIS_URL = process.env.REDIS_URL;
if (REDIS_URL && REDIS_URL.includes('upstash.io')) {
  const match = REDIS_URL.match(/redis:\/\/default:([^@]+)@([^:]+)/);
  if (match) {
    process.env.UPSTASH_REDIS_REST_TOKEN = match[1];
    process.env.UPSTASH_REDIS_REST_URL = `https://${match[2]}`;
  }
}
