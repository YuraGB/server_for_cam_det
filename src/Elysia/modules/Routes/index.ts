import { Elysia } from "elysia";
import { rateLimiter } from "../Security/RateLimiter";
import serverTiming from "@elysia/server-timing";
import cors from "@elysia/cors";
import { securityHeaders } from "../Security/SeccurytyHeaders";
import {
  ALLOWED_HTTP_METHODS,
  ALLOWED_ORIGINS,
  HEALTH_ENDPOINT,
} from "@/constants";
import { clients } from "@/Elysia/utils";
import { ip } from "elysia-ip";
import { userRoutes } from "./User";

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
  .get(HEALTH_ENDPOINT, () => ({
    status: "ok",
    peers: clients.size,
    uptimeSeconds: Math.floor(process.uptime()),
  }));
