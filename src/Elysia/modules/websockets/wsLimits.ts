import Redis from "ioredis";

const redis = new Redis();

const MAX_CONNECTIONS_PER_IP = 10;

// seconds
const CONNECTION_TTL = 120;

function getKey(ip: string) {
  return `ws:connections:${ip}`;
}

export async function canConnect(ip: string): Promise<boolean> {
  const key = getKey(ip);

  // Increment current connections
  const count = await redis.incr(key);

  // Set TTL only for new keys
  if (count === 1) {
    await redis.expire(key, CONNECTION_TTL);
  }

  // Too many connections
  if (count > MAX_CONNECTIONS_PER_IP) {
    // rollback increment
    await redis.decr(key);

    return false;
  }

  return true;
}

export async function disconnect(ip: string): Promise<void> {
  const key = getKey(ip);

  const count = await redis.decr(key);

  // Cleanup broken/negative counters
  if (count <= 0) {
    await redis.del(key);
  }
}

/**
 * Refresh TTL for active sockets.
 * Call this on pong / heartbeat.
 */
export async function refreshConnection(ip: string): Promise<void> {
  const key = getKey(ip);

  await redis.expire(key, CONNECTION_TTL);
}
