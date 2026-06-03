import Redis from "ioredis";

const redis = new Redis({
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

export default redis;
