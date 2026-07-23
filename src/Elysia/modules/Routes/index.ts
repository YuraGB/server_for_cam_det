import { Elysia } from "elysia";
import { rateLimiter } from "../Security/RateLimiter";
import serverTiming from "@elysia/server-timing";
import cors from "@elysia/cors";
import { securityHeaders } from "../Security/SecurityHeaders";
import { ALLOWED_HTTP_METHODS, ALLOWED_ORIGINS } from "@/constants";
import { ip } from "elysia-ip";
import { userRoutes } from "./User";
import signalRoutes from "./Signals";

export const routes = new Elysia({ name: "Routes", cookie: {} })
  .use(rateLimiter)
  .use(securityHeaders)
  .use(serverTiming()) // by @default enable if NODE_ENV !== 'production'
  .use(
    cors({
      origin: ALLOWED_ORIGINS,
      credentials: true,
      methods: ALLOWED_HTTP_METHODS,
    }),
  )
  .use(ip()) // Middleware to extract client IP and attach it to the request context
  .use(userRoutes)
  .use(signalRoutes); // /health, /ping, /ready routes for health checks and readiness probes
