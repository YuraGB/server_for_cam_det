import redis from "@/Redis";
import Elysia from "elysia";

const signalRoutes = new Elysia({
  name: "SignalRoutes",
})
  .get("/health", ({ status }) => status(200, "ok"))
  .get("/ping", ({ status }) => status(200, "pong"))
  .get("/ready", async ({ status }) => {
    try {
      const isPong = await redis.ping();
      if (isPong !== "PONG") {
        return status(503, "Redis not ready");
      }
    } catch (error) {
      console.error("Error checking Redis readiness:", error);
      return status(503, "Redis not ready");
    }
    return status(200, "ok");
  });

export default signalRoutes;
