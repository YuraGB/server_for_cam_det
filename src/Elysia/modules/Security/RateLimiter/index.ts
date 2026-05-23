import Elysia from "elysia";
import { tryConsume } from "./util";
import { getIPFromRequest } from "@/Elysia/utils";

export const rateLimiter = new Elysia({ name: "RateLimiter" }).onRequest(
  async ({ request, set, server }) => {
    const ip = getIPFromRequest(request, server) ?? "unknown";

    // ensure we pass a string to tryConsume; normalize SocketAddress or undefined to a string
    const allowed = await tryConsume(String(ip ?? "unknown"));
    if (!allowed) {
      // 429 Too Many Requests
      set.status = 429;
      return new Response("Rate limit exceeded, try later", { status: 429 });
    }
  },
);
