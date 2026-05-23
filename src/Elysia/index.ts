import Elysia from "elysia";
import type { Serve } from "bun";
import {  SERVER_PORT, WS_ENDPOINT } from "../constants";
import type {  WSData } from "../types";
import {  getIPFromRequest } from "./utils";
import websocketConfig from "./modules/websockets/websocketConfig";
import { routes } from "./modules/Routes";
import { authenticateWebSocket, validationWebsoketConnection } from "./modules/websockets";

/**
 * Main Elysia application instance that serves both HTTP routes and WebSocket connections for the WebRTC signaling server.
 * The fetch handler is customized to upgrade HTTP requests to WebSocket connections when the WS_ENDPOINT is hit, while still allowing Elysia to handle regular HTTP routes defined in the Routes module.
 */
const app = new Elysia({ name: "WebRTCSignalingServer" })
  .use(routes)
const elysiaHandler = app.fetch;


/**
 * Serve options for Bun.
 * The fetch function is overridden to handle WebSocket upgrade requests at the WS_ENDPOINT,
 * while delegating other HTTP requests to the Elysia handler. It also includes origin validation and authentication for WebSocket connections.
 * The websocketConfig object defines the handlers for WebSocket events such as connection open and message reception.
 */
export default {
  port: SERVER_PORT,

  // Handle HTTP requests and upgrade to WebSocket when the WS_ENDPOINT is hit
  async fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === WS_ENDPOINT) {   
      const validationWsConnection: Response | true = await validationWebsoketConnection(req, server);
      if (validationWsConnection instanceof Response) {
        return validationWsConnection;
      }

      const authResult = await authenticateWebSocket(req);
      if (!authResult.success) {
        return authResult.error ?? new Response("Unauthorized", { status: 401 });
      }
           
      if(!authResult.auth) {
        return new Response("Authentication failed", { status: 401 });
      }

      const ip = getIPFromRequest(req, server) ?? "unknown";

      // Upgrade to WebSocket and pass the authenticated user info in the connection data
      const success = server.upgrade(req, {
        data: {
          ip,
          lastSeenAt: Date.now(),
          auth: authResult.auth,
        },
      });

      if (success) return;
      return new Response("WS upgrade failed", { status: 400 });
    }

    return elysiaHandler(req);
  },

  // WebSocket handlers are managed separately in ./modules/websockets/websocketConfig.ts
  websocket: websocketConfig,
} satisfies Serve.Options<WSData>;
