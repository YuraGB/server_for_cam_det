import Elysia from "elysia";
import type { Serve } from "bun";
import { HEALTH_ENDPOINT, SERVER_PORT, WS_ENDPOINT } from "../constants";
import type {  WSData } from "../types";
import { clients } from "./utils";
import websocketConfig from "./utils/websocketConfig";

const app = new Elysia({ name: "WebRTCSignalingServer" });
app.get("/", () => "OK");
app.get(HEALTH_ENDPOINT, () => ({
  status: "ok",
  peers: clients.size,
  uptimeSeconds: Math.floor(process.uptime()),
}));

/**
 * Custom fetch handler to manage both HTTP requests and WebSocket upgrades on the same server instance.
 * HTTP requests to the WS_ENDPOINT will be upgraded to WebSocket connections, while other requests will be handled by Elysia's routing.
 */
const elysiaHandler = app.fetch;

export default {
  port: SERVER_PORT,

  // Handle HTTP requests and upgrade to WebSocket when the WS_ENDPOINT is hit
  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === WS_ENDPOINT) {
      const success = server.upgrade(req, {
        data: {
          lastSeenAt: Date.now(),
        },
      });

      if (success) return;
      return new Response("WS upgrade failed", { status: 400 });
    }

    return elysiaHandler(req);
  },

  // WebSocket handlers are managed separately in ./utils/websocketConfig.ts
  websocket: websocketConfig,
} satisfies Serve.Options<WSData>;
