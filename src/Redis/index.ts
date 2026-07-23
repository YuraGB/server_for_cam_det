import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  retryStrategy(times) {
    if (times > 5) {
      return null;
    }

    return Math.min(times * 1000, 5000);
  },
});

let logged = false;

redis.on("error", (err) => {
  if (!logged) {
    console.error("Redis connection error:", err.message);
    logged = true;
  }
});
redis.on("connect", () => {
  logged = false;
  console.log("Redis connected");
});
redis.on("connecting", () => {
  console.log("Redis connecting...");
});

redis.on("ready", () => {
  console.log("Redis ready");
});

redis.on("reconnecting", () => {
  console.log("Redis reconnecting...");
});

redis.on("close", () => {
  console.log("Redis connection closed");
});

redis.on("end", () => {
  console.log("Redis connection ended");
});

export default redis;
