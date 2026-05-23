import Redis from "ioredis";
const redis = new Redis(); // default localhost:6379
// bucket config
const LIMIT = 60; // requests per minute
const BURST = 10; // extra tokens you can spend instantly
const TTL = 60; // seconds
// Helper: try to consume a token
async function tryConsume(key: string): Promise<boolean> {
  const now = Date.now();
  const bucketKey = `lb:${key}`;
  // Lua script runs atomically in Redis
  const script = `
    local bucket = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
    local tokens = tonumber(bucket[1]) or ${LIMIT + BURST}
    local ts     = tonumber(bucket[2]) or ${now}
    local refill = (${LIMIT} / ${TTL}) * ((ARGV[1] - ts) / 1000)
    tokens = math.min(tokens + refill, ${LIMIT + BURST})
    if tokens < 1 then
      return 0
    end
    tokens = tokens - 1
    redis.call('HMSET', KEYS[1], 'tokens', tokens, 'ts', ARGV[1])
    redis.call('EXPIRE', KEYS[1], ${TTL})
    return 1
  `;
  const ok = await redis.eval(script, 1, bucketKey, now.toString());
  return ok === 1;
}

export { tryConsume };
